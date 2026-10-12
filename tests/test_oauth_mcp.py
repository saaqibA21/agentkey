import base64
import hashlib
import secrets
from urllib.parse import parse_qs, urlsplit

from tests.test_phase2 import login

CALLBACK = "https://chatgpt.com/connector_platform_oauth_redirect"
MCP_HEADERS = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}


def pkce():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return verifier, challenge


def rpc(method, params=None):
    return {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}


async def authorize(client, client_id, challenge, me, scopes, approve=True):
    """Run authorize -> dashboard consent -> decision; return the query the app receives back."""
    start = await client.get("/oauth/authorize", params={
        "client_id": client_id, "redirect_uri": CALLBACK, "response_type": "code", "state": "xyz",
        "code_challenge": challenge, "code_challenge_method": "S256", "scope": "read connect"})
    assert start.status_code == 302, start.text
    target = urlsplit(start.headers["location"])
    assert target.netloc == "localhost:3000" and target.path == "/connect/authorize"
    blob = parse_qs(target.query)["request"][0]
    shown = await client.post("/v1/oauth/consent", headers=me["auth"], json={"request": blob})
    assert shown.json()["client_name"] == "ChatGPT" and shown.json()["redirect_host"] == "chatgpt.com"
    decided = await client.post("/v1/oauth/decision", headers=me["auth"],
                                json={"request": blob, "approve": approve, "scopes": scopes})
    assert decided.status_code == 200, decided.text
    back = urlsplit(decided.json()["redirect_to"])
    assert f"{back.scheme}://{back.netloc}{back.path}" == CALLBACK
    return {k: v[0] for k, v in parse_qs(back.query).items()}, blob


async def test_chatgpt_style_oauth_connects_to_mcp(client):
    # 1. The app discovers how to sign in from the 401 on the MCP endpoint.
    unauth = await client.post("/mcp", headers=MCP_HEADERS, json=rpc("tools/list"))
    assert unauth.status_code == 401
    assert unauth.headers["www-authenticate"] == \
        'Bearer resource_metadata="http://test/.well-known/oauth-protected-resource"'
    resource = (await client.get("/.well-known/oauth-protected-resource")).json()
    assert resource["resource"] == "http://test/mcp" and resource["authorization_servers"] == ["http://test"]
    meta = (await client.get("/.well-known/oauth-authorization-server")).json()
    assert meta["code_challenge_methods_supported"] == ["S256"] and meta["registration_endpoint"].endswith("/oauth/register")

    # 2. It registers itself. Unsafe redirect addresses are refused.
    bad = await client.post("/oauth/register", json={"redirect_uris": ["http://evil.example.com/cb"]})
    assert bad.status_code == 400
    reg = await client.post("/oauth/register", json={"redirect_uris": [CALLBACK], "client_name": "ChatGPT"})
    assert reg.status_code == 201
    client_id = reg.json()["client_id"]

    # An unregistered redirect address is never redirected to.
    verifier, challenge = pkce()
    hijack = await client.get("/oauth/authorize", params={
        "client_id": client_id, "redirect_uri": "https://evil.example.com/cb", "response_type": "code",
        "code_challenge": challenge, "code_challenge_method": "S256"})
    assert hijack.status_code == 400
    no_pkce = await client.get("/oauth/authorize", params={
        "client_id": client_id, "redirect_uri": CALLBACK, "response_type": "code", "state": "s"})
    assert no_pkce.status_code == 302 and "error=invalid_request" in no_pkce.headers["location"]

    # 3. The person signs in on the dashboard and approves, choosing the permissions.
    me = await login(client)
    key = await client.post("/v1/api-keys", headers=me["auth"], json={"name": "k", "scopes": ["manage"]})
    agent_key = {"Authorization": f"Bearer {key.json()['api_key']}"}
    got, blob = await authorize(client, client_id, challenge, me, ["read", "connect", "bogus"])
    assert got["state"] == "xyz" and "code" in got
    # An API key cannot approve on a person's behalf.
    assert (await client.post("/v1/oauth/decision", headers=agent_key,
                              json={"request": blob, "approve": True, "scopes": ["connect"]})).status_code == 403

    # 4. Code -> tokens, with PKCE. Wrong verifier and reuse both fail.
    form = {"grant_type": "authorization_code", "code": got["code"], "redirect_uri": CALLBACK, "client_id": client_id}
    wrong = await client.post("/oauth/token", data={**form, "code_verifier": "x" * 50})
    assert wrong.status_code == 400 and wrong.json()["error"] == "invalid_grant"
    tokens = await client.post("/oauth/token", data={**form, "code_verifier": verifier})
    assert tokens.status_code == 200, tokens.text
    tok = tokens.json()
    assert tok["token_type"] == "Bearer" and tok["scope"] == "read connect"
    replay = await client.post("/oauth/token", data={**form, "code_verifier": verifier})
    assert replay.status_code == 400

    # 5. The app now uses the MCP endpoint as that person, limited to what they ticked.
    bearer = {**MCP_HEADERS, "Authorization": f"Bearer {tok['access_token']}"}
    tools = await client.post("/mcp", headers=bearer, json=rpc("tools/list"))
    assert tools.status_code == 200 and "get_site_login" in {t["name"] for t in tools.json()["result"]["tools"]}
    identities = await client.post("/mcp", headers=bearer, json=rpc(
        "tools/call", {"name": "list_identities", "arguments": {}}))
    assert identities.json()["result"].get("isError") is not True
    # "manage" was not granted, so creating an inbox is refused; and it can never act as the signed-in person.
    create = await client.post("/mcp", headers=bearer, json=rpc(
        "tools/call", {"name": "create_agent_inbox", "arguments": {}}))
    assert create.json()["result"]["isError"] is True
    api = {"Authorization": f"Bearer {tok['access_token']}"}
    assert (await client.get("/v1/vault/items", headers=api)).status_code == 200
    assert (await client.post("/v1/vault/items", headers=api, json={
        "name": "x", "site_url": "https://a.example.com", "username": "u", "password": "p"})).status_code == 403

    # 6. Refresh rotates; an old refresh token stops working.
    refreshed = await client.post("/oauth/token", data={
        "grant_type": "refresh_token", "refresh_token": tok["refresh_token"], "client_id": client_id})
    assert refreshed.status_code == 200 and refreshed.json()["access_token"] != tok["access_token"]
    assert (await client.post("/oauth/token", data={
        "grant_type": "refresh_token", "refresh_token": tok["refresh_token"], "client_id": client_id})).status_code == 400

    # 7. The person can see and cut off the app at any time.
    grants = (await client.get("/v1/oauth/grants", headers=me["auth"])).json()["data"]
    assert [(g["client_name"], g["redirect_host"], g["scopes"]) for g in grants] == [
        ("ChatGPT", "chatgpt.com", ["read", "connect"])]
    other = await login(client, "other@example.com", "Other")
    assert (await client.get("/v1/oauth/grants", headers=other["auth"])).json()["data"] == []
    assert (await client.delete(f"/v1/oauth/grants/{client_id}", headers=me["auth"])).status_code == 204
    new_bearer = {**MCP_HEADERS, "Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert (await client.post("/mcp", headers=new_bearer, json=rpc("tools/list"))).status_code == 401
    assert (await client.post("/oauth/token", data={
        "grant_type": "refresh_token", "refresh_token": refreshed.json()["refresh_token"],
        "client_id": client_id})).status_code == 400


async def test_oauth_denied_returns_error_to_app(client):
    reg = await client.post("/oauth/register", json={"redirect_uris": [CALLBACK], "client_name": "ChatGPT"})
    _, challenge = pkce()
    me = await login(client)
    got, _ = await authorize(client, reg.json()["client_id"], challenge, me, ["read"], approve=False)
    assert got == {"error": "access_denied", "state": "xyz"}
