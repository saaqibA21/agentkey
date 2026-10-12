import json
from urllib.parse import parse_qs, urlsplit

import httpx
from sqlalchemy import select

from app.db.models import Connection, VaultItem
from app.db.session import get_sessionmaker
from app.services import vault
from tests.test_phase2 import login

TEST_PASSWORD = "correct-horse-battery"  # fixture value for the fake site login
TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"  # RFC 6238 test secret


def test_totp_matches_rfc6238_vectors():
    assert vault.totp_code(TOTP_SECRET, at=59) == "287082"
    assert vault.totp_code(TOTP_SECRET, at=1111111109) == "081804"
    assert vault.normalize_totp_secret(f"otpauth://totp/Acme:me?secret={TOTP_SECRET.lower()}&issuer=Acme") == TOTP_SECRET


def test_proxy_url_cannot_leave_provider_host():
    assert vault.proxy_url("github", "/user/repos") == "https://api.github.com/user/repos"
    for bad in ("user", "//evil.com/x", "/\\evil.com", "/a b", "@evil.com/x"):
        try:
            vault.proxy_url("github", bad)
            raise AssertionError(bad)
        except Exception as exc:
            assert getattr(exc, "status", None) == 422, bad
    assert vault.host_matches("https://github.com/login", "github.com")
    assert vault.host_matches("https://gist.github.com/x", "github.com")
    assert not vault.host_matches("https://github.com.evil.io/login", "github.com")
    assert not vault.host_matches("https://evilgithub.com/login", "github.com")
    assert not vault.host_matches("http://github.com/login", "github.com")


async def agent_key(client, auth, scopes):
    resp = await client.post("/v1/api-keys", headers=auth, json={"name": "agent", "scopes": scopes})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['api_key']}"}


async def test_github_connection_flow(client, monkeypatch):
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_ID", "gh-client")
    monkeypatch.setenv("GITHUB_OAUTH_CLIENT_SECRET", "gh-secret")
    from app.core.config import get_settings
    get_settings.cache_clear()
    calls = []

    async def fake_http(method, url, **kwargs):
        calls.append((method, url, kwargs))
        if url.endswith("/login/oauth/access_token"):
            assert kwargs["data"]["code"] == "code-123" and kwargs["data"]["client_secret"] == "gh-secret"
            return httpx.Response(200, json={"access_token": "gho_test_token", "scope": "repo,read:user"})
        assert kwargs["headers"]["Authorization"] == "Bearer gho_test_token"
        if url == "https://api.github.com/user":
            return httpx.Response(200, json={"login": "octo-dev"})
        if url == "https://api.github.com/user/repos":
            return httpx.Response(200, json=[{"full_name": "octo-dev/site"}])
        return httpx.Response(201, json={"number": 7})

    monkeypatch.setattr(vault, "http", fake_http)
    try:
        me = await login(client)
        auth = me["auth"]
        manage_key = await agent_key(client, auth, ["read", "manage"])
        connect_key = await agent_key(client, auth, ["read", "connect"])

        # Only a signed-in person can start a connection; an agent key cannot.
        assert (await client.post("/v1/connections/github/start", headers=manage_key)).status_code == 403
        start = await client.post("/v1/connections/github/start", headers=auth)
        assert start.status_code == 200, start.text
        query = parse_qs(urlsplit(start.json()["authorize_url"]).query)
        assert query["client_id"] == ["gh-client"] and query["scope"] == ["repo read:user"]
        assert query["redirect_uri"] == ["http://test/v1/connections/callback/github"]
        state = query["state"][0]

        forged = await client.get("/v1/connections/callback/github", params={"code": "code-123", "state": state + "x"})
        assert forged.status_code == 303 and "error=connect_failed" in forged.headers["location"]
        done = await client.get("/v1/connections/callback/github", params={"code": "code-123", "state": state})
        assert done.status_code == 303 and done.headers["location"].endswith("/dashboard/identity?connected=github")

        listed = (await client.get("/v1/connections", headers=connect_key)).json()["data"]
        assert len(listed) == 1 and listed[0]["account"] == "octo-dev"
        assert "gho_test_token" not in json.dumps(listed)
        cid = listed[0]["id"]
        async with get_sessionmaker()() as session:  # encrypted at rest
            stored = (await session.scalars(select(Connection))).one().token_enc
        assert "gho_test_token" not in stored and vault.decrypt(stored)["access_token"] == "gho_test_token"

        # The agent acts through the proxy without ever holding the token.
        repos = await client.post(f"/v1/connections/{cid}/request", headers=connect_key, json={"path": "/user/repos"})
        assert repos.status_code == 200 and repos.json() == {"status": 200, "body": [{"full_name": "octo-dev/site"}]}
        # A key without the connect scope cannot, even with manage.
        assert (await client.post(f"/v1/connections/{cid}/request", headers=manage_key,
                                  json={"path": "/user/repos"})).status_code == 403
        # Writes and token export are off until the owner turns them on, and the agent cannot turn them on.
        write = {"method": "POST", "path": "/repos/octo-dev/site/issues", "body": {"title": "Bug"}}
        assert (await client.post(f"/v1/connections/{cid}/request", headers=connect_key, json=write)).status_code == 403
        assert (await client.post(f"/v1/connections/{cid}/token", headers=connect_key)).status_code == 403
        assert (await client.patch(f"/v1/connections/{cid}", headers=manage_key,
                                   json={"allow_export": True})).status_code == 403
        patched = await client.patch(f"/v1/connections/{cid}", headers=auth,
                                     json={"allow_writes": True, "allow_export": True})
        assert patched.status_code == 200 and patched.json()["allow_export"] is True
        created = await client.post(f"/v1/connections/{cid}/request", headers=connect_key, json=write)
        assert created.json() == {"status": 201, "body": {"number": 7}} and calls[-1][2]["json"] == {"title": "Bug"}
        token = (await client.post(f"/v1/connections/{cid}/token", headers=connect_key)).json()
        assert token["access_token"] == "gho_test_token" and token["git_username"] == "x-access-token"
        assert (await client.post(f"/v1/connections/{cid}/request", headers=connect_key,
                                  json={"path": "//evil.com/steal"})).status_code == 422

        # Another workspace sees nothing.
        other = await login(client, "other@example.com", "Other")
        assert (await client.get("/v1/connections", headers=other["auth"])).json()["data"] == []
        other_key = await agent_key(client, other["auth"], ["connect"])
        assert (await client.post(f"/v1/connections/{cid}/token", headers=other_key)).status_code == 404

        assert (await client.delete(f"/v1/connections/{cid}", headers=auth)).status_code == 204
        assert (await client.post(f"/v1/connections/{cid}/request", headers=connect_key,
                                  json={"path": "/user"})).status_code == 404
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()


async def test_vault_login_release_rules(client):
    me = await login(client)
    auth = me["auth"]
    connect_key = await agent_key(client, auth, ["read", "connect"])
    manage_key = await agent_key(client, auth, ["read", "manage"])
    item_body = {"name": "GitHub", "site_url": "https://github.com/login", "username": "octo-dev",
                 "password": TEST_PASSWORD, "totp_secret": TOTP_SECRET}

    # Agents cannot plant or loosen credentials.
    assert (await client.post("/v1/vault/items", headers=manage_key, json=item_body)).status_code == 403
    bad_totp = await client.post("/v1/vault/items", headers=auth, json={**item_body, "totp_secret": "not base32!"})
    assert bad_totp.status_code == 422
    created = await client.post("/v1/vault/items", headers=auth, json=item_body)
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["site_host"] == "github.com" and item["approval"] == "ask" and item["has_totp"] is True
    listing = json.dumps((await client.get("/v1/vault/items", headers=connect_key)).json())
    assert TEST_PASSWORD not in listing and TOTP_SECRET not in listing
    async with get_sessionmaker()() as session:
        stored = (await session.scalars(select(VaultItem))).one().secret_enc
    assert TEST_PASSWORD not in stored

    login_url = f"/v1/vault/items/{item['id']}/login"
    # Wrong site, wrong scope.
    phish = await client.post(login_url, headers=connect_key, json={"url": "https://github.com.evil.io/login"})
    assert phish.status_code == 403 and phish.json()["title"] == "Site mismatch"
    assert (await client.post(login_url, headers=manage_key, json={"url": "https://github.com/login"})).status_code == 403

    # "ask" mode: nothing is released until a person approves; the agent cannot approve itself.
    asked = await client.post(login_url, headers=connect_key,
                              json={"url": "https://github.com/login", "reason": "Open a pull request"})
    assert asked.status_code == 202 and TEST_PASSWORD not in asked.text
    rid = asked.json()["request_id"]
    assert (await client.post(f"/v1/vault/requests/{rid}/collect", headers=connect_key)).json() == {"status": "PENDING"}
    for key in (connect_key, manage_key):
        assert (await client.post(f"/v1/vault/requests/{rid}/approve", headers=key)).status_code == 403
    pending = (await client.get("/v1/vault/requests", headers=auth)).json()["data"]
    assert [(p["id"], p["reason"], p["item"]["name"]) for p in pending] == [(rid, "Open a pull request", "GitHub")]
    assert (await client.post(f"/v1/vault/requests/{rid}/approve", headers=auth)).json()["status"] == "APPROVED"

    granted = (await client.post(f"/v1/vault/requests/{rid}/collect", headers=connect_key)).json()
    assert granted["username"] == "octo-dev" and granted["password"] == TEST_PASSWORD
    assert granted["totp_code"] == vault.totp_code(TOTP_SECRET) and len(granted["totp_code"]) == 6
    # One approval, one use.
    assert (await client.post(f"/v1/vault/requests/{rid}/collect", headers=connect_key)).json() == {"status": "USED"}
    assert (await client.post(f"/v1/vault/requests/{rid}/approve", headers=auth)).status_code == 409

    # Denied stays denied.
    rid2 = (await client.post(login_url, headers=connect_key, json={"url": "https://github.com/login"})).json()["request_id"]
    await client.post(f"/v1/vault/requests/{rid2}/deny", headers=auth)
    assert (await client.post(f"/v1/vault/requests/{rid2}/collect", headers=connect_key)).json() == {"status": "DENIED"}

    # "auto" mode releases immediately, still only for the right site.
    assert (await client.patch(f"/v1/vault/items/{item['id']}", headers=connect_key,
                               json={"approval": "auto"})).status_code == 403
    assert (await client.patch(f"/v1/vault/items/{item['id']}", headers=auth, json={"approval": "auto"})).status_code == 200
    auto = await client.post(login_url, headers=connect_key, json={"url": "https://github.com/session"})
    assert auto.status_code == 200 and auto.json()["password"] == TEST_PASSWORD
    assert (await client.post(login_url, headers=connect_key, json={"url": "https://evil.io/"})).status_code == 403

    # Tenant isolation.
    other = await login(client, "other@example.com", "Other")
    other_key = await agent_key(client, other["auth"], ["connect"])
    assert (await client.post(login_url, headers=other_key, json={"url": "https://github.com/login"})).status_code == 404

    assert (await client.delete(f"/v1/vault/items/{item['id']}", headers=auth)).status_code == 204
    assert (await client.post(login_url, headers=connect_key, json={"url": "https://github.com/login"})).status_code == 404
