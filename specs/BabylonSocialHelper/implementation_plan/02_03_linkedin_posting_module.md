# Task 2.3: LinkedIn Posting Module

## Goal
Implement the LinkedIn posting module that authenticates via OAuth 2.0, uploads a screenshot image via the LinkedIn Images API, creates an organization post via the Posts API, and automatically refreshes expired tokens.

## Requirements addressed
REQ-POST-LI-1, REQ-POST-LI-2, REQ-POST-LI-3, REQ-POST-LI-4, REQ-POST-LI-5, REQ-SCHEDULE-6

## Background
The Babylon.js Social Media Helper publishes daily posts to the Babylon.js LinkedIn company page (organization ID `90520614`). LinkedIn uses the Marketing API (Posts API + Images API) for programmatic posting. Authentication uses OAuth 2.0 with an access token and refresh token stored as GitHub Secrets.

LinkedIn tokens expire after 60 days. The module must automatically detect expired tokens (HTTP 401), refresh them using the refresh token, update the GitHub Secrets via the GitHub API, and retry the posting operation. This prevents silent failures from token expiry.

This task depends on Task 2.1 (PlatformResult type and retry utility).

The relevant files from prior tasks:
```
scripts/
├── utils/
│   ├── types.ts    # PostData, PlatformResult, PostingSecrets
│   └── retry.ts    # retryWithBackoff, assembleFullText
├── package.json    # @octokit/rest already listed
└── tsconfig.json
```

## Files to modify/create

- `scripts/post-to-linkedin.ts` — LinkedIn posting module
- `scripts/utils/linkedin-token-refresh.ts` — Token refresh and GitHub Secret update utility

## Implementation details

### 1. Create `scripts/utils/linkedin-token-refresh.ts`

Export a function `refreshLinkedInToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>`.

**Logic:**
1. Make a POST request to `https://www.linkedin.com/oauth/v2/accessToken` with:
   - `grant_type`: `refresh_token`
   - `refresh_token`: the current refresh token
   - `client_id`: read from `LINKEDIN_CLIENT_ID` environment variable
   - `client_secret`: read from `LINKEDIN_CLIENT_SECRET` environment variable
   Content-Type: `application/x-www-form-urlencoded`

2. Parse the response JSON. Extract `access_token` and `refresh_token` from the response.

3. Return the new tokens.

Export a function `updateGitHubSecret(secretName: string, secretValue: string): Promise<void>`.

**Logic:**
1. Read `GH_TOKEN_SECRETS_WRITE` from environment. This is a GitHub PAT or App token with permission to write repository secrets.
2. Read `GITHUB_REPOSITORY` from environment (automatically set in GitHub Actions, format: `owner/repo`).
3. Use the `@octokit/rest` library (or plain fetch) to:
   a. Get the repository public key via `GET /repos/{owner}/{repo}/actions/secrets/public-key`.
   b. Encrypt the secret value using the public key (libsodium sealed box encryption — use the `tweetsodium` npm package or `libsodium-wrappers`).
   c. Create or update the secret via `PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}` with the encrypted value and key ID.

Export a convenience function `refreshAndUpdateSecrets(currentRefreshToken: string): Promise<string>` that:
1. Calls `refreshLinkedInToken` to get new tokens.
2. Calls `updateGitHubSecret("LINKEDIN_ACCESS_TOKEN", newAccessToken)`.
3. Calls `updateGitHubSecret("LINKEDIN_REFRESH_TOKEN", newRefreshToken)`.
4. Returns the new access token for immediate use.

### 2. Create `scripts/post-to-linkedin.ts`

Export a function `postToLinkedIn(post: PostData, imagePath: string): Promise<PlatformResult>`.

**Step-by-step logic:**

**a) Read environment variables:**
Read `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_REFRESH_TOKEN`, and `LINKEDIN_ORGANIZATION_ID` (expected: `90520614`) from `process.env`. If missing, return a failure PlatformResult.

**b) Wrap in retryWithBackoff:**

Inside the retry function:

1. **Assemble post text:** Call `assembleFullText(post, "linkedin")` to get body + link + all hashtags (standard + conditional).

2. **Register image upload:** POST to `https://api.linkedin.com/rest/images?action=initializeUpload` with:
   - Header: `Authorization: Bearer {accessToken}`, `LinkedIn-Version: 202401`, `Content-Type: application/json`
   - Body: `{ "initializeUploadRequest": { "owner": "urn:li:organization:{orgId}" } }`
   - Response contains `uploadUrl` and `image` (the image URN).

3. **Upload image binary:** PUT the screenshot PNG bytes to the `uploadUrl` returned in step 2. Set `Content-Type: application/octet-stream`.

4. **Create the post:** POST to `https://api.linkedin.com/rest/posts` with:
   - Header: `Authorization: Bearer {accessToken}`, `LinkedIn-Version: 202401`, `Content-Type: application/json`
   - Body:
     ```json
     {
       "author": "urn:li:organization:{orgId}",
       "commentary": "{assembledText}",
       "visibility": "PUBLIC",
       "distribution": { "feedDistribution": "MAIN_FEED" },
       "content": {
         "media": {
           "title": "{post.link.title}",
           "id": "{imageURN}"
         }
       },
       "lifecycleState": "PUBLISHED"
     }
     ```

5. **Handle 401 (token expired):** If any LinkedIn API call returns HTTP 401:
   a. Call `refreshAndUpdateSecrets(refreshToken)` to get a new access token.
   b. Update the local `accessToken` variable.
   c. Throw an error to trigger a retry with the new token.

6. **Extract post URN:** The response from the create-post call includes a header `x-restli-id` or a body field with the post URN (e.g., `urn:li:share:7052398176523`).

**c) Return PlatformResult:**
- Success: `{ platform: "linkedin", success: true, postId: postURN, retryCount }`
- Failure: `{ platform: "linkedin", success: false, error: message, retryCount }`

### 3. Add dependency

Add `tweetsodium` (or `libsodium-wrappers`) to `scripts/package.json` for encrypting secrets before writing them to GitHub.

### 4. Logging

Add `console.log` for:
- `[LinkedIn] Initializing image upload...`
- `[LinkedIn] Uploading image ({size} bytes)...`
- `[LinkedIn] Creating post for org {orgId}...`
- `[LinkedIn] ✅ Posted successfully: {urn}`
- `[LinkedIn] ❌ Failed: {error}`
- `[LinkedIn] Token expired — refreshing...`
- `[LinkedIn] Token refreshed — GitHub Secrets updated`

## Testing suggestions
- Unit test the module with mocked HTTP calls. Verify the correct API endpoints are called in order (initializeUpload → upload binary → create post).
- Test the token refresh flow: mock a 401 response on the first attempt, then a success after refresh. Verify `refreshAndUpdateSecrets` is called and the retry succeeds.
- Test missing credentials handling.
- Test the `updateGitHubSecret` function with mocked Octokit calls — verify it fetches the public key, encrypts the value, and calls the update endpoint.
- Verify that the assembled text for LinkedIn includes all standard hashtags plus conditional hashtags for community-demo posts.

## Gotchas
- LinkedIn's API versioning: Always include the `LinkedIn-Version` header (e.g., `202401`). The API behavior changes between versions.
- LinkedIn image upload is a two-step process (register + upload binary). The upload URL is temporary and must be used promptly.
- The `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are needed for token refresh but NOT for regular posting (which uses the access token). These must also be stored as GitHub Secrets and read from environment.
- Encrypting GitHub Secrets requires libsodium sealed box encryption. The `tweetsodium` package provides this for Node.js. Alternatively, `libsodium-wrappers` can be used.
- The `GH_TOKEN_SECRETS_WRITE` token needs `repo` scope or a fine-grained PAT with `actions:write` permission scoped to this repository.
- LinkedIn rate limits: The Marketing API allows approximately 100 calls per day for posting. A single post uses ~3 calls, well within limits.
- The `refreshToken` returned by LinkedIn may or may not change on each refresh. Always update both the access token and refresh token secrets to be safe.

## Verification checklist
- [ ] `scripts/post-to-linkedin.ts` exports `postToLinkedIn` function
- [ ] Function authenticates using `LINKEDIN_ACCESS_TOKEN` from environment
- [ ] Image is uploaded via LinkedIn Images API before creating the post
- [ ] Post includes body text + link + all hashtags (standard + conditional)
- [ ] Posts to the correct organization (`urn:li:organization:90520614`)
- [ ] Returns PlatformResult with LinkedIn post URN on success
- [ ] Returns PlatformResult with error message on failure
- [ ] Detects 401 responses and triggers token refresh
- [ ] `scripts/utils/linkedin-token-refresh.ts` refreshes tokens and updates GitHub Secrets
- [ ] Uses retryWithBackoff for retry logic
- [ ] TypeScript compiles without errors
