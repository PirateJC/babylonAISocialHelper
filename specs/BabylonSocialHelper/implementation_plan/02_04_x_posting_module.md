# Task 2.4: X (Twitter) Posting Module

## Goal
Implement the X/Twitter posting module that uses the `agent-twitter-client` library to authenticate via X credentials, upload a screenshot image, and create a tweet with body text, link, and hashtags.

## Requirements addressed
REQ-POST-X-1, REQ-POST-X-2, REQ-POST-X-3, REQ-POST-X-4, REQ-POST-X-5, REQ-SCHEDULE-6

## Background
The Babylon.js Social Media Helper publishes daily posts to the @babylonjs X (Twitter) account. X's official API requires a paid subscription ($100/mo for Basic tier). The project uses `agent-twitter-client` (also known as `goat-x`), an open-source library that uses X's internal web API — the same endpoints used by the X website. This is free but inherently more fragile than an official API.

Authentication uses the X account's username, password, and email (for 2FA challenges). These are stored as GitHub Secrets: `X_USERNAME`, `X_PASSWORD`, `X_EMAIL`.

**Key risk:** X can change its internal API at any time, breaking `agent-twitter-client`. The module must degrade gracefully — if X posting fails, LinkedIn and Bluesky posting continue unaffected (REQ-POST-X-4). This is handled by the orchestrator (Task 2.5) treating each platform independently.

This task depends on Task 2.1 (PlatformResult type and retry utility).

The relevant files from prior tasks:
```
scripts/
├── utils/
│   ├── types.ts    # PostData, PlatformResult
│   └── retry.ts    # retryWithBackoff, assembleFullText
├── package.json    # agent-twitter-client already listed
└── tsconfig.json
```

## Files to modify/create

- `scripts/post-to-x.ts` — X/Twitter posting module

## Implementation details

### 1. Create `scripts/post-to-x.ts`

Export a function `postToX(post: PostData, imagePath: string): Promise<PlatformResult>`.

**Step-by-step logic:**

**a) Read environment variables:**
Read `X_USERNAME`, `X_PASSWORD`, and `X_EMAIL` from `process.env`. If any are missing, return a failure PlatformResult with a descriptive error.

**b) Wrap in retryWithBackoff:**

Inside the retry function:

1. **Create a Scraper instance:** Import the `Scraper` class (or equivalent — check the latest `agent-twitter-client` docs for the correct class name). Instantiate it.

2. **Authenticate:** Call the login method with username, password, and email. The library handles the web-based authentication flow internally, including potential 2FA/email challenges. The email is needed in case X prompts for email verification during login.

3. **Read the screenshot image:** Read the file at `imagePath` using `fs.readFileSync()`. The library may accept a file path or a Buffer — check its API.

4. **Upload the image:** Use the library's media upload method. This typically involves calling a method like `scraper.uploadMedia(imageBuffer)` that returns a media ID. The image must be uploaded before creating the tweet (REQ-SCHEDULE-6).

5. **Assemble the tweet text:** Call `assembleFullText(post, "x")` to get the body text + link + all hashtags (standard + conditional). Note: URLs on X count as 23 characters regardless of actual length, but since we're using the web API (not the official API), the character counting may differ. The 300-grapheme limit was designed for Bluesky; X Premium allows up to 4,000 characters, so length is not a concern for X.

6. **Create the tweet:** Call the tweet creation method (e.g., `scraper.sendTweet(text, undefined, [mediaId])`) with the assembled text and the uploaded media ID.

7. **Extract tweet ID:** The response should contain the tweet ID or URL. Extract it for the PlatformResult.

**c) Return PlatformResult:**
- Success: `{ platform: "x", success: true, postId: tweetId, retryCount }`
- Failure: `{ platform: "x", success: false, error: message, retryCount }`

### 2. Cookie/session management

The `agent-twitter-client` library may cache cookies/sessions. In a GitHub Actions environment, each run starts fresh with no cached state. The library should handle creating a new session from scratch each time. If the library supports cookie persistence (via file or in-memory), configure it appropriately for the ephemeral Actions environment.

Some versions of `agent-twitter-client` may require setting cookies from a prior session. If so:
- On first login, the library creates cookies.
- Since Actions runs are ephemeral, every run performs a fresh login.
- This may trigger X's security measures (suspicious login from a new IP). Adding `X_EMAIL` helps with email verification challenges.

### 3. Logging

Add `console.log` for:
- `[X/Twitter] Authenticating as @{username}...`
- `[X/Twitter] Uploading image ({size} bytes)...`
- `[X/Twitter] Creating tweet...`
- `[X/Twitter] ✅ Tweeted successfully: {tweetId}`
- `[X/Twitter] ❌ Failed: {error}`
- `[X/Twitter] Retrying (attempt {n}/3)...`

**Important:** Never log the password or email in plain text. The `X_PASSWORD` and `X_EMAIL` environment variables are automatically masked by GitHub Actions when they come from secrets.

## Testing suggestions
- Unit test with a mocked `Scraper` class. Verify the module calls login, uploadMedia, and sendTweet in the correct order.
- Test missing credentials — verify graceful failure with a descriptive error.
- Test with a mock that throws on login — verify retry logic is triggered.
- Test that the assembled text includes all standard hashtags plus conditional hashtags for community-demo posts.
- If possible, test against a real test/dummy X account. Note: `agent-twitter-client` uses the real X service, so there is no sandbox. Any test posts will be publicly visible unless deleted.
- Verify the module handles the `agent-twitter-client` library's API correctly by checking its latest documentation or examples.

## Gotchas
- **Library API instability:** `agent-twitter-client` wraps X's internal web API, which changes without notice. The class name, method signatures, and authentication flow may differ between library versions. Always check the library's README and source code for the current API.
- **Authentication challenges:** X may present CAPTCHAs, email verification, or phone verification when logging in from a new IP (GitHub Actions runners). The `X_EMAIL` secret helps with email challenges, but CAPTCHAs cannot be solved programmatically. If this becomes a persistent issue, it's a known risk documented in the architecture.
- **Rate limiting:** X's internal API has undocumented rate limits. Posting once per day is extremely unlikely to trigger them, but the retry mechanism (3 retries × backoff) should respect potential 429 responses.
- **Import path:** The package may export from different entry points depending on version. Check whether to import from `agent-twitter-client` or a sub-path like `agent-twitter-client/dist/esm`.
- **Media upload format:** Some versions of the library require the image as a `Buffer`, others as a file path, and others as base64. Check the current API.
- **Graceful degradation (REQ-POST-X-4):** The orchestrator (Task 2.5) is responsible for ensuring that X failures don't block other platforms. This module just needs to return a proper PlatformResult on failure — it does NOT need to catch and suppress errors.

## Verification checklist
- [ ] `scripts/post-to-x.ts` exports `postToX` function
- [ ] Function signature: `(post: PostData, imagePath: string) => Promise<PlatformResult>`
- [ ] Authenticates using `X_USERNAME`, `X_PASSWORD`, `X_EMAIL` from environment
- [ ] Uploads image before creating tweet (REQ-SCHEDULE-6)
- [ ] Tweet text includes body + link + all hashtags (standard + conditional)
- [ ] Returns PlatformResult with tweet ID on success
- [ ] Returns PlatformResult with error message on failure
- [ ] Uses retryWithBackoff for retry logic
- [ ] Handles missing credentials gracefully
- [ ] No credentials logged in plain text
- [ ] TypeScript compiles without errors
