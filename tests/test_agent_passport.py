import pytest
from tests.test_phase2 import login


async def create_agent(client, auth, agent_name, owner_name="Priya Raman"):
    return await client.post("/v1/agents", headers=auth, json={"agent_name": agent_name, "owner_name": owner_name})


@pytest.mark.asyncio
async def test_agent_passport_lifecycle_and_external_verification(client):
    # 1. Human operator signs up and creates an agent
    me = await login(client, "operator@cyber.corp", "Cipher Admin")
    resp = await create_agent(client, me["auth"], "Research Scout", "Cipher Admin")
    assert resp.status_code == 201, resp.text
    agent_data = resp.json()

    agent_id = agent_data["id"]
    passport_token = agent_data.get("passport")
    assert passport_token is not None
    assert passport_token.startswith("ai_pass_")
    assert "." in passport_token

    # 2. Operator retrieves passport via dedicated endpoint
    passport_resp = await client.get(f"/v1/agents/{agent_id}/passport", headers=me["auth"])
    assert passport_resp.status_code == 200
    details = passport_resp.json()
    assert details["token"] == passport_token
    assert details["agent_name"] == "Research Scout"
    assert details["owner_name"] == "Cipher Admin"
    assert details["trust_score"] == 99.0
    assert details["accountability_tier"] == "VERIFIED_HUMAN_OPERATOR"

    # 3. Third-party website (NO AUTH / EXTERNAL CONSUMER) verifies the agent passport
    # Scenario A: In JSON body
    verify_resp = await client.post(
        "/v1/auth/agent/verify",
        json={"passport": passport_token},
    )
    assert verify_resp.status_code == 200, verify_resp.text
    v = verify_resp.json()
    assert v["verified"] is True
    assert v["status"] == "VERIFIED"
    assert v["agent"]["name"] == "Research Scout"
    assert v["owner"]["name"] == "Cipher Admin"
    assert v["owner"]["email"] == "operator@cyber.corp"
    assert v["trust_score"] == 99.0

    # Scenario B: In X-Agent-Passport header
    verify_header_resp = await client.post(
        "/v1/auth/agent/verify",
        headers={"X-Agent-Passport": passport_token},
    )
    assert verify_header_resp.status_code == 200
    assert verify_header_resp.json()["verified"] is True

    # Scenario C: Via Bearer token
    verify_bearer_resp = await client.post(
        "/v1/auth/agent/verify",
        headers={"Authorization": f"Bearer {passport_token}"},
    )
    assert verify_bearer_resp.status_code == 200
    assert verify_bearer_resp.json()["verified"] is True

    # 4. Public badge endpoint lookup
    badge_resp = await client.get(f"/v1/auth/agent/verify/{agent_id}")
    assert badge_resp.status_code == 200
    badge = badge_resp.json()
    assert badge["verified"] is True
    assert badge["status"] == "ACTIVE"
    assert badge["owner_name"] == "Cipher Admin"

    # 5. Tampered or fraudulent passport is rejected
    fake_token = passport_token[:-4] + "ffff"
    tampered_resp = await client.post(
        "/v1/auth/agent/verify",
        json={"passport": fake_token},
    )
    assert tampered_resp.status_code == 401

    # Missing passport is rejected
    empty_resp = await client.post("/v1/auth/agent/verify", json={})
    assert empty_resp.status_code == 400

    # 6. Revocation: when the owner deletes the agent, the passport is invalidated
    del_resp = await client.delete(f"/v1/agents/{agent_id}", headers=me["auth"])
    assert del_resp.status_code == 204

    # Verification now reports revoked
    revoked_verify = await client.post(
        "/v1/auth/agent/verify",
        json={"passport": passport_token},
    )
    assert revoked_verify.status_code == 200
    assert revoked_verify.json()["verified"] is False
    assert revoked_verify.json()["status"] == "REVOKED"

    # Public badge endpoint returns 404
    badge_revoked = await client.get(f"/v1/auth/agent/verify/{agent_id}")
    assert badge_revoked.status_code == 404
