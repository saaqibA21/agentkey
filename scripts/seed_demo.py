"""Create a demo workspace (outbound enabled) with one test inbox and print its API key once.

    python scripts/seed_demo.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import schemas  # noqa: E402
from app.api.v1.admin import create_workspace  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.db.models import HITLPolicy, Inbox  # noqa: E402
from app.db.session import create_all, dispose_engine, get_sessionmaker  # noqa: E402


async def main() -> None:
    settings = get_settings()
    await create_all()
    async with get_sessionmaker()() as session:
        workspace, api_key = await create_workspace(
            session, schemas.WorkspaceCreate(name="Demo Workspace", outbound_enabled=True)
        )
        inbox = Inbox(workspace_id=workspace.id, email_address=f"demo-{workspace.id.hex[:8]}@{settings.mail_domain}",
                      client_id="demo")
        session.add(inbox)
        session.add(HITLPolicy(
            workspace_id=workspace.id, trigger_keywords=["refund", "contract", "legal", "wire transfer"],
            action="HOLD_FOR_APPROVAL", target_channel="SLACK",
            target_destination="https://hooks.slack.com/services/REPLACE/WITH/YOURS",
        ))
        await session.commit()
    await dispose_engine()
    print(f"Workspace : {workspace.name} ({workspace.id})")
    print(f"Inbox     : {inbox.email_address} ({inbox.id})")
    print(f"API key   : {api_key}")
    print("The key is shown only now; export it as AGENTIDENTITY_API_KEY.")


if __name__ == "__main__":
    asyncio.run(main())
