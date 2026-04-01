# Task 2.5: Posting Orchestrator

## Goal
Implement the main posting orchestrator script that reads today's scheduled post from the repo, calls all three platform posting modules, aggregates results, and performs cleanup (delete on full success, move to `failed/` on any failure).

## Requirements addressed
REQ-SCHEDULE-3, REQ-SCHEDULE-4, REQ-SCHEDULE-5, REQ-SCHEDULE-6, REQ-SCHEDULE-8, REQ-RETRY-2, REQ-RETRY-3, REQ-CLEANUP-1, REQ-CLEANUP-2, REQ-CLEANUP-3

## Background
The posting orchestrator is the entry point for the daily GitHub Actions workflow. It runs once per day at 10:00 AM Pacific and performs the end-to-end posting flow:

1. Determine today's date in Pacific Time.
2. Look for `scheduled/{YYYY-MM-DD}.json` in the repo.
3. If no file exists, exit cleanly (no error).
4. If found, read the post JSON and locate the screenshot image.
5. Call all three platform posting modules (X, LinkedIn, Bluesky) independently.
6. Aggregate results: if all three succeed, delete the post JSON and screenshot from the repo; if any fail, move the post JSON to `failed/` with per-platform results recorded.
7. Commit all changes to the repo.

This task depends on:
- Task 2.1 (types and retry utility)
- Task 2.2 (Bluesky posting module)
- Task 2.3 (LinkedIn posting module)
- Task 2.4 (X posting module)

The relevant files:
```
scripts/
├── post-to-bluesky.ts
├── post-to-linkedin.ts
├── post-to-x.ts
├── utils/
│   ├── types.ts
│   ├── retry.ts
│   └── linkedin-token-refresh.ts
├── package.json
└── tsconfig.json
```

## Files to modify/create

- `scripts/post-daily.ts` — Main orchestrator script

## Implementation details

### 1. Create `scripts/post-daily.ts`

This is the script executed by the GitHub Actions workflow.

**a) Parse CLI arguments:**
Support a `--dry-run` flag that performs all steps except actually calling platform APIs and committing changes. This is essential for testing.
Support a `--date YYYY-MM-DD` flag to override the current date (for testing/manual runs).

**b) Determine today's date:**
Get the current date in Pacific Time. Use the `Intl.DateTimeFormat` API with `timeZone: "America/Los_Angeles"` to get the current Pacific date, regardless of the server's timezone (GitHub Actions runners are UTC).

Format as `YYYY-MM-DD`.

**c) DST self-gating check:**
Before proceeding, check that the current Pacific time is within the 09:30–10:30 AM window. This prevents double-posting when both cron triggers (17:00 UTC and 18:00 UTC) fire on the same day during DST transition periods.

If outside the window, log `[Orchestrator] Current Pacific time is outside the 09:30-10:30 AM window. Exiting.` and exit with code 0.

Skip this check if `--dry-run` or `--date` is specified (manual runs should always proceed).

**d) Find today's post:**
Look for the file `scheduled/{date}.json` in the repo's working directory (the Actions checkout). If the file does not exist, log `[Orchestrator] No post scheduled for {date}. Exiting.` and exit with code 0 (REQ-SCHEDULE-4).

**e) Read the post JSON:**
Parse the JSON file into a `PostData` object. Read the screenshot image path from `post.media.filePath` (e.g., `media/post-001.png`). Verify the screenshot file exists on disk.

**f) Post to all three platforms:**
Call the three posting functions. Each platform is attempted independently — a failure on one does not prevent the others (REQ-RETRY-3).

Call all three in sequence (not parallel) to avoid any potential credential conflicts and to make logs easier to follow:

```
const xResult = await postToX(post, imagePath);
const linkedinResult = await postToLinkedIn(post, imagePath);
const blueskyResult = await postToBluesky(post, imagePath);
```

If `--dry-run` is active, skip the actual API calls and return mock success results for all three platforms.

**g) Aggregate results:**
Check if all three succeeded:
- `allSucceeded = xResult.success && linkedinResult.success && blueskyResult.success`

**h) Cleanup based on results:**

If `allSucceeded` (REQ-CLEANUP-1):
1. Delete `scheduled/{date}.json`
2. Delete `media/{post.media.filePath}` (the screenshot PNG)
3. Log `[Orchestrator] ✅ All platforms succeeded. Cleaned up post and screenshot.`

If NOT `allSucceeded` (REQ-CLEANUP-2):
1. Add a `platformResults` object to the post JSON with the results from all three platforms:
   ```json
   "platformResults": {
     "x": { "success": true, "postId": "...", "retryCount": 0 },
     "linkedin": { "success": false, "error": "...", "retryCount": 3 },
     "bluesky": { "success": true, "postId": "...", "retryCount": 0 }
   }
   ```
2. Write the updated JSON to `failed/{date}.json`
3. Delete `scheduled/{date}.json`
4. Keep the screenshot in `media/` (it may be needed for retry)
5. Log `[Orchestrator] ❌ One or more platforms failed. Moved to failed/.`

**i) Commit changes to the repo (REQ-SCHEDULE-8, REQ-CLEANUP-3):**
Use git commands (via `child_process.execSync` or `@octokit/rest`) to:
1. `git add -A` (stages deletions and new files)
2. `git commit -m "chore: post {date} — {success|partial failure}"` 
3. `git push`

If `--dry-run`, skip the commit step and log what would have been committed.

**j) Exit code:**
- Exit 0 if the workflow completed (regardless of platform outcomes). The workflow itself succeeds; platform failures are recorded in `failed/`.
- Exit 1 only for unexpected errors (file not found, git commit failure, etc.).

### 2. Logging summary

At the end of the run, print a summary:
```
=== Posting Summary for 2026-04-17 ===
X (Twitter):  ✅ Success (tweet ID: 1234567890)
LinkedIn:     ❌ Failed after 3 retries (Rate limit exceeded)
Bluesky:      ✅ Success (uri: at://did:plc:abc/app.bsky.feed.post/xyz)

Result: Partial failure — moved to failed/2026-04-17.json
```

## Testing suggestions
- Run with `--dry-run` and a real `scheduled/YYYY-MM-DD.json` file — verify it reads the file, skips API calls, and reports mock success.
- Run with `--dry-run --date 2026-01-01` and no file for that date — verify it exits cleanly with "No post scheduled" message.
- Unit test the DST self-gating logic with mocked dates during DST transition weeks.
- Unit test the cleanup logic: mock all three platforms succeeding → verify scheduled file and screenshot are deleted. Mock one platform failing → verify file is moved to `failed/` with platformResults added.
- Verify the `--date` flag correctly overrides the date.
- Verify exit codes: 0 for normal operation (even with platform failures), 1 for unexpected errors.

## Gotchas
- **Pacific Time calculation:** GitHub Actions runners are UTC. Use `Intl.DateTimeFormat` with `timeZone: "America/Los_Angeles"` and format options to get the Pacific date. Do not rely on system timezone.
- **Git operations in Actions:** The Actions checkout uses a detached HEAD by default. The workflow YAML (Task 2.6) must configure the checkout with a proper branch reference and set up git credentials for pushing.
- **File paths:** The orchestrator runs from the repo root. `scheduled/{date}.json` and `media/{filePath}` are relative to the repo root.
- **Sequential vs parallel posting:** While the architecture mentions "parallel" posting, sequential execution is simpler, avoids credential conflicts, and makes logs easier to read. The total posting time (~3-5 minutes for all three platforms including retries) is well within the GitHub Actions job timeout.
- **Exit code 0 on platform failure:** The workflow should always succeed (exit 0) as long as the orchestrator ran correctly. Platform failures are not workflow failures — they're recorded in `failed/`. This prevents the Actions run from being marked as failed when only social media posting had issues.

## Verification checklist
- [ ] `scripts/post-daily.ts` exists and is the main entry point
- [ ] Supports `--dry-run` flag
- [ ] Supports `--date YYYY-MM-DD` flag
- [ ] Correctly determines today's date in Pacific Time
- [ ] Implements DST self-gating (09:30–10:30 AM Pacific window)
- [ ] Exits cleanly with code 0 if no post is scheduled (REQ-SCHEDULE-4)
- [ ] Calls all three platform modules independently (REQ-RETRY-3)
- [ ] On full success: deletes post JSON and screenshot from scheduled/ and media/ (REQ-CLEANUP-1)
- [ ] On any failure: moves post to failed/ with platformResults, retains screenshot (REQ-CLEANUP-2)
- [ ] Commits all changes to the repo (REQ-SCHEDULE-8)
- [ ] Prints a summary report at the end
- [ ] Exit code 0 for normal operation, 1 only for unexpected errors
- [ ] TypeScript compiles without errors
