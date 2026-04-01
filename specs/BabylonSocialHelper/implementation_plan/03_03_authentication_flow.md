# Task 3.3: Authentication Flow

## Goal
Implement the complete GitHub OAuth authentication flow in the web app: redirecting to GitHub for authorization, exchanging the code via the Cloudflare Worker, storing the token, verifying team membership, and handling sign-out.

## Requirements addressed
REQ-AUTH-1, REQ-AUTH-2, REQ-AUTH-3, REQ-AUTH-4, REQ-AUTH-5, REQ-AUTH-6, REQ-AUTH-7, REQ-AUTH-8

## Background
The Babylon.js Social Media Helper requires GitHub OAuth authentication with team membership verification. Only members of the `BabylonJS/core-team-microsoft` GitHub team are authorized to use the app.

The authentication flow (documented in architecture.md Section 4.2):
1. User clicks "Sign in with GitHub."
2. Browser redirects to GitHub's OAuth authorize endpoint with client_id, redirect_uri, and scopes.
3. User authorizes the app on GitHub.
4. GitHub redirects back to the app with a `?code=` parameter.
5. The app sends the code to the Cloudflare Worker (Task 3.2).
6. The Worker exchanges the code for an access token and returns it.
7. The app stores the token in sessionStorage.
8. The app calls the GitHub API to get user info and verify team membership.
9. If the user is a team member, grant access. Otherwise, show Access Denied.

Required OAuth scopes: `repo` (read/write repo contents), `read:org` (verify team membership).

This task depends on:
- Task 3.1 (web app scaffold — AuthContext, LoginScreen, AccessDenied components)
- Task 3.2 (Cloudflare Worker — the token exchange proxy)

## Files to modify/create

- `webapp/src/services/auth.ts` — OAuth flow logic, team membership check
- `webapp/src/context/AuthContext.tsx` — Update with real OAuth implementation (replacing mock)
- `webapp/src/components/LoginScreen.tsx` — Update with functional Sign In button
- `webapp/src/components/AccessDenied.tsx` — Update with team name and Sign Out button

## Implementation details

### 1. Create `webapp/src/services/auth.ts`

Export the following functions:

**`getOAuthUrl(): string`**
Constructs the GitHub OAuth authorization URL:
```
https://github.com/login/oauth/authorize?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=repo read:org&
  state={random_nonce}
```
- `CLIENT_ID`: A configuration constant (can be stored in an environment variable or a config file — it is NOT secret).
- `REDIRECT_URI`: The GitHub Pages URL (e.g., `https://babylonjs.github.io/babylonAISocialHelper/`).
- `scope`: `repo read:org`
- `state`: A random nonce stored in sessionStorage to prevent CSRF attacks. Verify it on callback.

**`exchangeCodeForToken(code: string): Promise<string>`**
Sends the authorization code to the Cloudflare Worker and returns the access token:
1. POST to `{WORKER_URL}/api/auth/callback` with `{ code }`.
2. Parse the response and return the `access_token`.
3. On error, throw with a descriptive message.

**`fetchUser(token: string): Promise<{ login: string; avatarUrl: string; name: string }>`**
Calls the GitHub API to get the authenticated user's info:
- `GET https://api.github.com/user` with `Authorization: Bearer {token}`.
- Return `{ login, avatarUrl: avatar_url, name }`.

**`checkTeamMembership(token: string, username: string): Promise<boolean>`**
Verifies the user is a member of `BabylonJS/core-team-microsoft`:
- `GET https://api.github.com/orgs/BabylonJS/teams/core-team-microsoft/memberships/{username}` with `Authorization: Bearer {token}`.
- If the response is 200 and `state` is `"active"`, return `true`.
- If the response is 404 or `state` is not `"active"`, return `false`.
- Note: This API call requires the `read:org` scope AND the token owner must have visibility into the org's teams (which they do if they're a member).

**Configuration constants:**
Define `GITHUB_CLIENT_ID` and `OAUTH_WORKER_URL` as constants in this file. For production, these should be set at build time (e.g., via Vite's `import.meta.env` mechanism). For development, hardcode development values or use `.env` files.

### 2. Update `webapp/src/context/AuthContext.tsx`

Replace the mock auth logic with real OAuth:

**On mount (useEffect):**
1. Check if the URL has a `?code=` parameter (indicates a redirect back from GitHub).
2. If a code is present:
   a. Verify the `state` parameter matches the one stored in sessionStorage (CSRF protection).
   b. Call `exchangeCodeForToken(code)` to get the access token.
   c. Store the token in sessionStorage under key `"babylonsocial:token"`.
   d. Clean the URL by removing the `?code=` and `?state=` parameters (use `window.history.replaceState`).
3. Check sessionStorage for an existing token (handles page refreshes).
4. If a token exists:
   a. Set `isLoading: true`.
   b. Call `fetchUser(token)` to get user info.
   c. Call `checkTeamMembership(token, user.login)` to verify access.
   d. Set `isTeamMember` based on the result.
   e. Set `isLoading: false`.
5. If no token and no code, show the login screen.

**`login()` function:**
Redirect the browser to `getOAuthUrl()`: `window.location.href = getOAuthUrl()`.

**`logout()` function:**
Clear sessionStorage (`"babylonsocial:token"`), reset all auth state, and the user returns to the login screen.

**Error handling:**
If token exchange fails, show an error message on the login screen.
If the user info API call fails (e.g., token expired), clear the token and show the login screen.

### 3. Update `webapp/src/components/LoginScreen.tsx`

- Display the Babylon.js brand/logo.
- "Sign in with GitHub" button that calls `login()` from AuthContext.
- Note: "Requires BabylonJS core team membership" (REQ-AUTH-2).
- If there's an auth error (e.g., failed token exchange), display the error message.

### 4. Update `webapp/src/components/AccessDenied.tsx`

- "Access Denied" heading.
- Message: "You must be a member of the BabylonJS/core-team-microsoft team to access this application." (REQ-AUTH-5).
- Display the user's GitHub username.
- "Sign Out" button that calls `logout()`.

## Testing suggestions
- Test the full flow end-to-end with a real GitHub OAuth App and the Cloudflare Worker running locally (`npx wrangler dev`).
- Test with a user who IS a member of the required team — verify they get full access.
- Test with a user who is NOT a member — verify they see the Access Denied screen.
- Test sign-out — verify the token is cleared and the login screen is shown.
- Test page refresh — verify the token persists in sessionStorage and the user stays logged in.
- Test with an expired/revoked token — verify the app detects the 401 and redirects to login.
- Test the CSRF protection: tamper with the `state` parameter and verify the code exchange is rejected.

## Gotchas
- **GitHub Pages callback URL:** The OAuth callback URL in the GitHub OAuth App settings must exactly match the app's URL. For HashRouter, GitHub redirects back with `?code=` in the query string (before the hash), so the code is available via `window.location.search`.
- **Clearing URL parameters:** After extracting the code, use `window.history.replaceState` to remove `?code=` and `?state=` from the URL. This prevents the code from being reused on page refresh (expired codes cause errors).
- **sessionStorage vs localStorage:** The token is stored in sessionStorage (REQ-AUTH-6), which is cleared when the browser tab closes. This is intentional for security — tokens don't persist across sessions.
- **Team membership API:** The `GET /orgs/{org}/teams/{team}/memberships/{username}` endpoint requires the token owner to be a member of the organization. If the user is not in the BabylonJS org at all, the API returns 404.
- **OAuth scopes:** The `repo` scope grants full read/write access to repositories. The `read:org` scope grants read access to organization membership and teams. Both are required.
- **Vite environment variables:** Use `import.meta.env.VITE_GITHUB_CLIENT_ID` and `import.meta.env.VITE_OAUTH_WORKER_URL` for build-time configuration. These must be prefixed with `VITE_` to be exposed to client code.

## Verification checklist
- [ ] `webapp/src/services/auth.ts` exports getOAuthUrl, exchangeCodeForToken, fetchUser, checkTeamMembership
- [ ] LoginScreen shows "Sign in with GitHub" button that redirects to GitHub OAuth
- [ ] After GitHub authorization, the app exchanges the code for a token via the Worker
- [ ] Token is stored in sessionStorage (not localStorage, not URL, not repo)
- [ ] User info is fetched and displayed in the navbar
- [ ] Team membership is verified against BabylonJS/core-team-microsoft
- [ ] Non-team members see the Access Denied screen with team name and Sign Out button
- [ ] Sign Out clears the token and returns to login
- [ ] Page refresh preserves the session (token in sessionStorage)
- [ ] CSRF state parameter is verified on callback
- [ ] Auth errors are displayed to the user
