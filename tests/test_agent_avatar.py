import pytest
from tests.test_phase2 import login


@pytest.mark.asyncio
async def test_unique_avatar_lifecycle_and_conflict_handling(client):
    me = await login(client, "avatar_operator@bagents.dev", "Avatar Admin")
    auth = me["auth"]

    # 1. Create agent without avatar_seed: automatically gets a unique seed & url
    resp1 = await client.post("/v1/agents", headers=auth, json={"agent_name": "Scout Alpha", "owner_name": "Avatar Admin"})
    assert resp1.status_code == 201, resp1.text
    agent1 = resp1.json()
    assert agent1.get("avatar_seed") is not None
    assert agent1.get("avatar_url") is not None
    assert "bottts-neutral" in agent1["avatar_url"] or ".svg" in agent1["avatar_url"]

    # 2. Create another agent: must have a DIFFERENT unique avatar seed
    resp2 = await client.post("/v1/agents", headers=auth, json={"agent_name": "Scout Alpha", "owner_name": "Avatar Admin"})
    assert resp2.status_code == 201
    agent2 = resp2.json()
    assert agent2["avatar_seed"] != agent1["avatar_seed"]

    # 3. Custom unique avatar seed
    resp3 = await client.post("/v1/agents", headers=auth, json={
        "agent_name": "Custom Bot",
        "owner_name": "Avatar Admin",
        "avatar_seed": "cyber-sentinel-42",
    })
    assert resp3.status_code == 201
    agent3 = resp3.json()
    assert agent3["avatar_seed"] == "cyber-sentinel-42"

    # 4. Attempting to create an agent with a DUPLICATE avatar_seed must be rejected (409 Conflict)
    resp4 = await client.post("/v1/agents", headers=auth, json={
        "agent_name": "Impostor Bot",
        "owner_name": "Avatar Admin",
        "avatar_seed": "cyber-sentinel-42",
    })
    assert resp4.status_code == 409
    assert "already claimed" in resp4.json()["detail"].lower()

    # 5. Dynamic SVG avatar endpoint returns valid image/svg+xml
    svg_resp = await client.get(f"/v1/agents/{agent3['id']}/avatar.svg")
    assert svg_resp.status_code == 200
    assert "image/svg+xml" in svg_resp.headers["content-type"]
    assert "<svg" in svg_resp.text

    seed_svg_resp = await client.get("/v1/agents/avatar/test-seed.svg")
    assert seed_svg_resp.status_code == 200
    assert "<svg" in seed_svg_resp.text

    # 6. Update agent avatar via PATCH
    patch_resp = await client.patch(f"/v1/agents/{agent3['id']}", headers=auth, json={
        "avatar_seed": "nova-core-99",
    })
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["avatar_seed"] == "nova-core-99"

    # 7. Verification endpoint reflects the unique avatar
    verify_resp = await client.post("/v1/auth/agent/verify", json={"passport": updated["passport"]})
    assert verify_resp.status_code == 200
    v = verify_resp.json()
    assert v["verified"] is True
    assert v["agent"]["avatar_seed"] == "nova-core-99"
    assert v["agent"]["avatar_url"] is not None
