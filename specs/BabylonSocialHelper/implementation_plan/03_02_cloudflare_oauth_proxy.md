# Task 3.2: Cloudflare OAuth Proxy

## Goal
Implement the Cloudflare Worker that acts as the OAuth token exchange proxy for GitHub OAuth. The Worker receives an authorization code from the browser, exchanges it for an access token using the client secret, and returns the token to the browser.

## Requirements addressed
REQ-AUTH-3, REQ-AUTH-6

## Background
GitHub OAuth requires a server-side component to exchange the authorization code for an access token (because the exchange requires the client secret, which must never be exposed to the browser). The Babylon.js Social Media Helper uses a Cloudflare Worker for this — a serverless function running on Cloudflare's edge network (free tier: 100K requests/day).

The Worker is intentionally minimal and stateless:
1. Receives an authorization `code` from the browser.
2. Sends a POST request to GitHub's token endpoint with the code, client ID, and client secret.
3. Returns the access token to the browser.
4. Does NOT log or persist tokens.

The Worker is deployed separately from the web app and has its own URL (e.g., `https://babylon-social-auth.{account}.workers.dev`).

This task depends on Task 1.1 (repo scaffolding — the oauth-worker/ directory).

The relevant files from Task 1.1:
```
oauth-worker/
├── package.json      # wrangler as dev dependency
├── wrangler.toml     # Stub configuration
└── src/
    └── index.ts      # Placeholder handler
```

## Files to modify/create

- `oauth-worker/src/index.ts` — Full Worker implementation
- `oauth-worker/wrangler.toml` — Updated configuration with secrets binding

## Implementation details

### 1. Update `oauth-worker/wrangler.toml`

```toml
name = "babylon-social-auth"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
GITHUB_CLIENT_ID = ""   # Set via wrangler secret or deploy config
ALLOWED_ORIGIN = ""      # The GitHub Pages URL, for CORS

# GITHUB_CLIENT_SECRET is stored as a Worker Secret (not in this file)
# Set it via: wrangler secret put GITHUB_CLIENT_SECRET
```

### 2. Implement `oauth-worker/src/index.ts`

The Worker handles two routes:

**Route 1: `POST /api/auth/callback`**

This is the main token exchange endpoint.

Request body (JSON):
```json
{ "code": "the_authorization_code_from_github" }
```

Handler logic:
1. Parse the request body and extract the `code` field.
2. If `code` is missing, return HTTP 400 with `{ "error": "Missing authorization code" }`.
3. Make a POST request to `https://github.com/login/oauth/access_token` with:
   - `client_id`: from Worker environment variable `GITHUB_CLIENT_ID`
   - `client_secret`: from Worker secret `GITHUB_CLIENT_SECRET`
   - `code`: the authorization code from the request
   - Headers: `Accept: application/json`
4. Parse GitHub's response. If the response contains an `error` field (e.g., `bad_verification_code`), return HTTP 400 with the error.
5. Extract `access_token` from the response.
6. Return HTTP 200 with `{ "access_token": "gho_..." }`.

**Route 2: `GET /health`**

Returns `{ "status": "ok" }` for monitoring.

**CORS handling:**

The Worker must include CORS headers to allow requests from the GitHub Pages domain:
- `Access-Control-Allow-Origin`: Set to the `ALLOWED_ORIGIN` environment variable (e.g., `https://babylonjs.github.io`). Do NOT use `*` in production.
- `Access-Control-Allow-Methods`: `POST, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type`

Handle `OPTIONS` preflight requests by returning 204 with the CORS headers.

**Security requirements:**
- The Worker MUST NOT log the access token, client secret, or authorization code (REQ-AUTH-3).
- The Worker MUST NOT persist any tokens or codes — it is purely a pass-through proxy.
- Error responses MUST NOT include the client secret.

### 3. Deployment instructions

Document the deployment process in the Worker's README or as comments:

1. **Create a GitHub OAuth App:**
   - Go to GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App.
   - Set the authorization callback URL to the GitHub Pages URL (e.g., `https://babylonjs.github.io/babylonAISocialHelper/`).
   - Note the Client ID and Client Secret.

2. **Configure Worker secrets:**
   ```bash
   cd oauth-worker
   npx wrangler secret put GITHUB_CLIENT_SECRET
   # Paste the Client Secret when prompted
   ```

3. **Set Worker environment variables:**
   Update `wrangler.toml` with the `GITHUB_CLIENT_ID` and `ALLOWED_ORIGIN` values, or set them as secrets:
   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID
   ```

4. **Deploy the Worker:**
   ```bash
   cd oauth-worker
   npx wrangler deploy
   ```

5. **Note the Worker URL:** After deployment, Wrangler prints the Worker URL (e.g., `https://babylon-social-auth.{account}.workers.dev`). This URL is needed by the web app (Task 3.3) as the OAuth callback proxy endpoint.

## Testing suggestions
- Run `npx wrangler dev` in the `oauth-worker/` directory. This starts a local dev server.
- Test the health endpoint: `curl http://localhost:8787/health` → should return `{ "status": "ok" }`.
- Test with a mock code: Send a POST to `/api/auth/callback` with `{ "code": "invalid" }`. GitHub will return an error (`bad_verification_code`), which the Worker should forward as a 400 response.
- Test CORS: Send an OPTIONS request and verify the correct headers are returned.
- Test with a real code (obtain one by starting the OAuth flow manually in a browser, capturing the `code` from the callback URL before it's exchanged, and sending it to the Worker).
- Verify no tokens or secrets appear in Worker logs (`wrangler tail`).

## Gotchas
- **Cloudflare Workers secrets vs environment variables:** Secrets are encrypted and not visible in the dashboard. Environment variables (in `[vars]`) are visible. Use secrets for `GITHUB_CLIENT_SECRET` and optionally for `GITHUB_CLIENT_ID`. Use environment variables for non-sensitive config like `ALLOWED_ORIGIN`.
- **GitHub OAuth code expiration:** Authorization codes expire after 10 minutes. The Worker must exchange the code promptly.
- **CORS origin:** The `ALLOWED_ORIGIN` must exactly match the origin of the web app (including protocol and no trailing slash). For example: `https://babylonjs.github.io` (not `https://babylonjs.github.io/`).
- **Cloudflare Workers free tier:** 100K requests/day, 10ms CPU time per invocation. OAuth exchanges are well within these limits.
- **No logging of sensitive data:** In development (`wrangler dev`), console.log output is visible. Ensure the Worker does not log the access token or client secret even in development.

## Verification checklist
- [ ] `oauth-worker/src/index.ts` handles POST `/api/auth/callback`
- [ ] Worker exchanges authorization code for access token via GitHub API
- [ ] Worker returns the access token in the response body (not in URL params)
- [ ] Worker does NOT log or persist tokens or secrets
- [ ] Worker handles CORS with the configured origin
- [ ] Worker handles OPTIONS preflight requests
- [ ] Worker returns appropriate errors for missing/invalid codes
- [ ] `oauth-worker/wrangler.toml` is configured correctly
- [ ] Health endpoint (`GET /health`) returns `{ "status": "ok" }`
- [ ] `npx wrangler dev` starts successfully in oauth-worker/ directory
- [ ] Deployment instructions are documented
