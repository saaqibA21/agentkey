from tests.conftest import ingest
from tests.test_phase2 import login


async def create(client, auth, agent_name, owner_name="Priya Raman"):
    return await client.post("/v1/agents", headers=auth, json={"agent_name": agent_name, "owner_name": owner_name})


async def test_create_api_makes_agent_address_and_key(client):
    me = await login(client, "priya@example.com", "Priya")
    resp = await create(client, me["auth"], "Sales Bot")
    assert resp.status_code == 201, resp.text
    agent = resp.json()
    # One click: an address from the agent name, a key, and the owner taken from the signed-in account.
    assert agent["email_address"] == "sales-bot@agents.test"
    assert agent["owner_email"] == "priya@example.com" and agent["owner_name"] == "Priya Raman"
    assert agent["api_key"].startswith("ai_live_") and agent["scopes"] == ["read", "send"]

    # The key works for that agent's mail straight away.
    key = {"Authorization": f"Bearer {agent['api_key']}"}
    await ingest(client, agent["email_address"], subject="Code", text="Your OTP is 246801")
    waited = await client.get(f"/v1/inboxes/{agent['inbox_id']}/wait", headers=key, params={"for": "otp", "timeout": 1})
    assert waited.json()["otp_code"] == "246801"
    inbox = (await client.get(f"/v1/inboxes/{agent['inbox_id']}", headers=key)).json()
    assert inbox["owner_name"] == "Priya Raman" and inbox["display_title"] == "Priya Raman (via Sales Bot)"

    # Same name again gets the next free address; the key is only ever returned once.
    second = (await create(client, me["auth"], "sales bot")).json()
    assert second["email_address"] == "sales-bot-2@agents.test"
    listed = (await client.get("/v1/agents", headers=me["auth"])).json()["data"]
    assert [a["email_address"] for a in listed] == ["sales-bot-2@agents.test", "sales-bot@agents.test"]
    assert all("api_key" not in a for a in listed)


async def test_owner_email_cannot_be_chosen_and_rules_hold(client):
    me = await login(client, "priya@example.com", "Priya")
    # The owner email comes from the signed-in account; a supplied one is ignored.
    resp = await client.post("/v1/agents", headers=me["auth"],
                             json={"agent_name": "Helper", "owner_name": "X", "owner_email": "ceo@bank.com"})
    assert resp.json()["owner_email"] == "priya@example.com"
    # Only a signed-in person can create agents; an API key cannot mint more keys this way.
    key = {"Authorization": f"Bearer {resp.json()['api_key']}"}
    assert (await create(client, key, "Sneaky")).status_code == 403
    # Brand / role names are refused on the shared domain.
    assert (await create(client, me["auth"], "PayPal Support")).status_code == 422
    assert (await create(client, me["auth"], "   ")).status_code == 422
    # Plan limit (5 inboxes on the free plan).
    for i in range(4):
        assert (await create(client, me["auth"], f"worker {i}")).status_code == 201
    assert (await create(client, me["auth"], "one too many")).status_code == 403

    # Deleting revokes the key and retires the address for good.
    agent_id = resp.json()["id"]
    other = await login(client, "other@example.com", "Other")
    assert (await client.delete(f"/v1/agents/{agent_id}", headers=other["auth"])).status_code == 404
    assert (await client.delete(f"/v1/agents/{agent_id}", headers=me["auth"])).status_code == 204
    assert (await client.get("/v1/inboxes", headers=key)).status_code == 401
    again = (await create(client, me["auth"], "Helper")).json()
    assert again["email_address"] == "helper-2@agents.test"
