"""Local AIgent MCP server for clients that launch a process (Claude Desktop, Claude Code, Cursor).

    python mcp/server.py                                   # stdio
    python mcp/server.py --transport sse --port 8765       # HTTP + SSE
    python mcp/server.py --transport streamable-http

Environment: AGENTIDENTITY_API_KEY (required), AGENTIDENTITY_BASE_URL (default http://localhost:8000).
No install needed at all if you use the hosted endpoint instead: https://<your-api-host>/mcp
"""
import argparse
import inspect
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.mcp_server import build_server  # noqa: E402

server = build_server()


def main() -> None:
    parser = argparse.ArgumentParser(description="AIgent MCP server")
    parser.add_argument("--transport", choices=["stdio", "sse", "streamable-http"], default="stdio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if args.transport == "stdio":
        server.run("stdio")
    elif "kwargs" in inspect.signature(server.run).parameters:  # mcp >= 2 takes host/port at run time
        server.run(args.transport, host=args.host, port=args.port)
    else:  # mcp 1.x keeps them on settings
        server.settings.host, server.settings.port = args.host, args.port
        server.run(args.transport)


if __name__ == "__main__":
    main()
