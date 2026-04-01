# Task 2.2: Bluesky Posting Module

## Goal
Implement the Bluesky posting module that authenticates with the AT Protocol, uploads a screenshot image as a blob, and creates a post with body text and link (no hashtags). This is the simplest platform module and establishes patterns for the LinkedIn and X modules.

## Requirements addressed
REQ-POST-BS-1, REQ-POST-BS-2, REQ-POST-BS-3, REQ-POST-BS-4, REQ-SCHEDULE-6

## Background
The Babylon.js Social Media Helper publishes posts to three platforms daily via GitHub Actions. Each platform has its own posting module. Bluesky is the simplest and is implemented first to establish the module pattern.

Bluesky uses the AT Protocol. The `@atproto/api` npm package provides a typed client. Authentication uses a handle (e.g., `babylonjs.bsky.social`) and an app password (generated at https://bsky.app/settings/app-passwords). Both are stored as GitHub Secrets: `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD`.

The posting flow is:
1. Create an authenticated session using handle + app password.
2. Read the screenshot image file from disk.
3. Upload the image as a blob via the AT Protocol API.
4. Create a post record with the body text, the link (as a facet or embed), and the uploaded image.
5. Return the post URI on success or an error message on failure.

**Hashtags are NOT included** in Bluesky posts (REQ-POST-BS-3). Bluesky does not use hashtags conventionally.

The image must be uploaded first, then the post is created referencing the uploaded blob (REQ-SCHEDULE-6).

This task depends on Task 2.1 (for the PlatformResult type and retry utility).

The relevant files from prior tasks:
```
scripts/
├── utils/
│   ├── types.ts    # PostData, PlatformResult, etc.
│   └── retry.ts    # retryWithBackoff, assembleFullText
├── package.json    # @atproto/api already listed as dependency
└── tsconfig.json
```

## Files to modify/create

- `scripts/post-to-bluesky.ts` — Bluesky posting module

## Implementation details

### 1. Create `scripts/post-to-bluesky.ts`

Export a function `postToBluesky(post: PostData, imagePath: string): Promise<PlatformResult>`.

**Step-by-step logic:**

**a) Import dependencies:**
Import `BskyAgent` (or the equivalent class) from `@atproto/api`. Import `PostData`, `PlatformResult` from `./utils/types.ts`. Import `retryWithBackoff`, `assembleFullText` from `./utils/retry.ts`. Import `fs` from Node.js for reading the image file.

**b) Read environment variables:**
Read `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` from `process.env`. If either is missing, return a `PlatformResult` with `success: false` and an error message indicating missing credentials.

**c) Wrap the entire posting logic in `retryWithBackoff`:**

Inside the retry function:

1. **Create session:** Instantiate a `BskyAgent` (set the service URL to `https://bsky.social`). Call `agent.login({ identifier: handle, password: appPassword })`. This authenticates and creates a session.

2. **Read image from disk:** Read the screenshot file at `imagePath` using `fs.readFileSync()`. The file is a PNG.

3. **Upload image blob:** Call `agent.uploadBlob(imageBuffer, { encoding: "image/png" })`. This uploads the image and returns a blob reference (`blob.ref`). The blob reference is needed to attach the image to the post.

4. **Assemble post text:** Call `assembleFullText(post, "bluesky")` to get the body text + link URL (no hashtags).

5. **Create the post record:** Call `agent.post({ text, embed, facets })`. The exact structure depends on the @atproto/api version:
   - **Embed:** Use `app.bsky.embed.images` to attach the screenshot. The embed object includes the uploaded blob reference and alt text from `post.media.description`.
   - **Link facet (optional):** If you want the link to be clickable, create a facet of type `app.bsky.richtext.facet` with a link feature pointing to `post.link.url`. The facet byte range must match the link URL's position in the text string.
   - Alternatively, use `app.bsky.embed.external` for a link card embed alongside the image. Check @atproto/api docs for the best approach to include both an image and a link. If the API supports `app.bsky.embed.recordWithMedia` or similar, use that. Otherwise, prioritize the image embed and include the link as a text facet.

6. **Extract post URI:** The response from `agent.post()` includes a `uri` field (e.g., `at://did:plc:abc123/app.bsky.feed.post/xyz789`). This is the Bluesky post identifier.

**d) Build and return PlatformResult:**
- On success: `{ platform: "bluesky", success: true, postId: uri, retryCount }`
- On failure: `{ platform: "bluesky", success: false, error: errorMessage, retryCount }`

### 2. Logging

Add `console.log` statements for each major step:
- `[Bluesky] Authenticating as {handle}...`
- `[Bluesky] Uploading image ({size} bytes)...`
- `[Bluesky] Creating post...`
- `[Bluesky] ✅ Posted successfully: {uri}`
- `[Bluesky] ❌ Failed: {error}`
- `[Bluesky] Retrying (attempt {n}/3)...`

These logs appear in the GitHub Actions workflow run log and are essential for debugging.

## Testing suggestions
- Create a unit test that mocks `BskyAgent` and verifies the module calls `login`, `uploadBlob`, and `post` in the correct order with the correct arguments.
- Test with missing credentials — verify the module returns a PlatformResult with `success: false` and an appropriate error message.
- Test with a mock that throws on `login` — verify retry logic is triggered and the error is reported.
- Test with a mock that throws on `uploadBlob` — verify the error is captured.
- Test that the assembled text for Bluesky does NOT include hashtags.
- If you have a Bluesky test account (free to create), do a manual integration test by running the module against it with a test post.

## Gotchas
- The `@atproto/api` library evolves frequently. Check the latest API for the correct way to create posts with images and link facets. The class may be `BskyAgent` or `AtpAgent` depending on the version.
- Bluesky's image upload has a size limit (typically 1MB for blobs). Screenshots at 1280×720 in PNG format should be well under this, but consider adding a file size check.
- Facet byte ranges must be calculated on the UTF-8 byte representation of the text, not the character count. If the link URL appears in the post text, its byte start/end positions must be accurate or the link won't render correctly.
- The `agent.login()` creates a session that expires. Since each posting attempt creates a fresh session (within the retry loop), this is not a concern. But if refactored to share a session across retries, handle session expiration.
- Bluesky rate limits: As of writing, Bluesky allows 1,500 API calls per 5 minutes for authenticated users. A single post requires ~3 calls (login, uploadBlob, createRecord), well within limits.

## Verification checklist
- [ ] `scripts/post-to-bluesky.ts` exists and exports `postToBluesky` function
- [ ] Function signature matches: `(post: PostData, imagePath: string) => Promise<PlatformResult>`
- [ ] Authenticates using `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` from environment
- [ ] Uploads image before creating the post (REQ-SCHEDULE-6)
- [ ] Post text includes body + link URL but NOT hashtags (REQ-POST-BS-3)
- [ ] Returns PlatformResult with Bluesky post URI on success (REQ-POST-BS-4)
- [ ] Returns PlatformResult with error message on failure (REQ-POST-BS-4)
- [ ] Uses retryWithBackoff for up to 3 retries with exponential backoff
- [ ] Handles missing credentials gracefully
- [ ] TypeScript compiles without errors
