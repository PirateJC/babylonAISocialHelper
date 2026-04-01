# Task 2.1: Posting Types and Retry Utility

## Goal
Create the shared TypeScript types and the retry-with-exponential-backoff utility that all three platform posting modules and the orchestrator depend on.

## Requirements addressed
REQ-RETRY-1, REQ-RETRY-2, REQ-RETRY-3, REQ-RETRY-5, REQ-SCHEMA-7

## Background
The Babylon.js Social Media Helper's Phase 3 (auto-posting via GitHub Actions) uses three independent platform posting modules (X, LinkedIn, Bluesky) that all share the same data types and retry logic. This task creates the foundational code that subsequent posting tasks (2.2–2.5) build upon.

Each platform posting module is an independent TypeScript function that:
1. Accepts a post object and platform credentials.
2. Attempts to post (upload image, then create text post with image attached).
3. Retries up to 3 times with exponential backoff on failure.
4. Returns a standardized `PlatformResult` object.

The orchestrator (Task 2.5) calls all three modules, aggregates results, and decides whether to delete the post (all succeed) or move it to `failed/` (any fail).

The repository structure at this point (after Phase 1 tasks):
```
babylonAISocialHelper/
├── scripts/
│   ├── package.json       # Has agent-twitter-client, @atproto/api, @octokit/rest
│   ├── tsconfig.json
│   └── validate-posts.ts  # From Task 1.3
├── schemas/posts.schema.json  # Corrected schema
└── ...
```

## Files to modify/create

- `scripts/utils/types.ts` — Shared TypeScript interfaces: PostData, PlatformResult, PostingConfig
- `scripts/utils/retry.ts` — Retry-with-exponential-backoff utility function

## Implementation details

### 1. Create `scripts/utils/types.ts`

Define the following TypeScript interfaces:

**`PostData`** — Represents a single post read from a `scheduled/*.json` file:
- `id`: string (e.g., "post-001")
- `assignedDate`: string (YYYY-MM-DD format)
- `category`: `"feature-highlight" | "community-demo" | "docs-tutorial"`
- `text`: string (the post body text)
- `hashtags`: string[] (the 8 standard hashtags)
- `conditionalHashtags`: string[] (e.g., ["#BuiltWithBabylon"] for community demos)
- `link`: `{ url: string; type: string; title: string }`
- `media`: `{ type: "screenshot"; sourceUrl: string; description: string; filePath: string }`
- `metadata`: `{ topic: string; babylonFeatureArea: string; contentSource: string; usesEmoji: boolean; postFormat: string; dayIndex: number }`
- `platformResults?`: Record of per-platform results (optional — only present in failed posts)

**`PlatformResult`** — Standardized result from a platform posting attempt:
- `platform`: `"x" | "linkedin" | "bluesky"`
- `success`: boolean
- `postId?`: string (Tweet ID, LinkedIn URN, or Bluesky URI — present only on success)
- `error?`: string (error message — present only on failure)
- `retryCount`: number (0–3, how many retries were attempted)

**`PlatformPostingFn`** — Type alias for a platform posting function:
- A function that takes `(post: PostData, imagePath: string)` and returns `Promise<PlatformResult>`

**`AggregatedResults`** — The combined results from all three platforms:
- `allSucceeded`: boolean
- `results`: `{ x: PlatformResult; linkedin: PlatformResult; bluesky: PlatformResult }`

**`PostingSecrets`** — Credentials loaded from environment variables:
- `X_USERNAME`: string
- `X_PASSWORD`: string
- `X_EMAIL`: string
- `LINKEDIN_ACCESS_TOKEN`: string
- `LINKEDIN_REFRESH_TOKEN`: string
- `LINKEDIN_ORGANIZATION_ID`: string
- `BLUESKY_HANDLE`: string
- `BLUESKY_APP_PASSWORD`: string
- `GH_TOKEN_SECRETS_WRITE?`: string (optional, for LinkedIn token refresh)

### 2. Create `scripts/utils/retry.ts`

Implement a generic retry utility function:

**Function signature:** `retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<{ result?: T; error?: Error; retryCount: number }>`

**`RetryOptions`:**
- `maxRetries`: number (default: 3)
- `baseDelayMs`: number (default: 30000 — 30 seconds)
- `backoffMultiplier`: number (default: 2)
- `onRetry?`: callback `(attempt: number, error: Error) => void` (for logging)

**Behavior:**
1. Call `fn()`. If it resolves, return `{ result, retryCount: 0 }`.
2. If it throws, wait `baseDelayMs * backoffMultiplier^(attempt-1)` milliseconds.
3. Retry up to `maxRetries` times.
4. If all retries fail, return `{ error: lastError, retryCount: maxRetries }`.
5. Call `onRetry` callback before each retry (for logging the retry attempt number and error).

The delay sequence with defaults: ~30s, ~60s (30s × 2^1) between retries. This means:
- Attempt 1: immediate
- (wait ~30s)
- Attempt 2: retry 1
- (wait ~60s)  
- Attempt 3: retry 2
- (wait ~120s — though this 4th attempt won't happen with maxRetries=3 total attempts)

Clarification: The 3 retries per REQ-RETRY-1 means 3 total attempts (1 initial + 2 retries) OR 1 initial + 3 retries = 4 total attempts. The requirements say "retry up to 3 times" which means 4 total attempts (1 original + 3 retries). Implement as 1 initial + up to 3 retries = 4 total attempts.

**Important:** The `retryWithBackoff` function should use a real `setTimeout`-based delay (via a promise wrapper), not a busy-wait. The delay should be approximate (jitter is acceptable to avoid thundering herd).

Also export a helper function **`assembleFullText(post: PostData, platform: "x" | "linkedin" | "bluesky"): string`** that constructs the full post text for a given platform:
- For `"x"` and `"linkedin"`: `post.text + "\n\n" + post.link.url + "\n\n" + post.hashtags.join(" ") + (post.conditionalHashtags.length > 0 ? " " + post.conditionalHashtags.join(" ") : "")`
- For `"bluesky"`: `post.text + "\n\n" + post.link.url` (no hashtags — per REQ-POST-BS-3)

## Testing suggestions
- Write a unit test for `retryWithBackoff` with a function that fails twice then succeeds — verify it returns success with retryCount 2.
- Write a unit test for `retryWithBackoff` with a function that always fails — verify it returns the error with retryCount 3 after 3 retries.
- Write a unit test for `retryWithBackoff` with a function that succeeds immediately — verify retryCount is 0.
- Write a unit test for `assembleFullText` that verifies X/LinkedIn text includes hashtags and Bluesky text does not.
- Write a unit test for `assembleFullText` with a community-demo post that verifies `#BuiltWithBabylon` is appended for X/LinkedIn.
- Verify that the types compile without errors: `npx tsc --noEmit -p scripts/tsconfig.json`.

## Gotchas
- The retry count semantics: "retry up to 3 times" (REQ-RETRY-1) means the posting function can be called up to 4 times total (1 initial + 3 retries). Make sure this is clear in the implementation.
- The exponential backoff delays (~30s, ~60s) are long because these are real API calls to external platforms. In tests, use a short baseDelay (e.g., 10ms) to avoid slow test suites.
- The `assembleFullText` function must handle the newline/space formatting consistently. The exact format (newlines between body, link, and hashtags) may need adjustment based on how each platform renders whitespace.
- `PlatformResult.retryCount` should reflect the number of retries attempted (0 if first attempt succeeded, up to 3 if all retries were exhausted).

## Verification checklist
- [ ] `scripts/utils/types.ts` exports PostData, PlatformResult, PlatformPostingFn, AggregatedResults, PostingSecrets interfaces
- [ ] `scripts/utils/retry.ts` exports `retryWithBackoff` function
- [ ] `scripts/utils/retry.ts` exports `assembleFullText` function
- [ ] `retryWithBackoff` retries up to 3 times (4 total attempts)
- [ ] `retryWithBackoff` waits with exponential backoff between retries
- [ ] `assembleFullText` includes hashtags for X and LinkedIn
- [ ] `assembleFullText` excludes hashtags for Bluesky
- [ ] `assembleFullText` includes conditional hashtags for community-demo posts
- [ ] TypeScript compiles without errors: `npx tsc --noEmit -p scripts/tsconfig.json`
