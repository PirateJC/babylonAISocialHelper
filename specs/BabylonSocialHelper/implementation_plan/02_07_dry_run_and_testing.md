# Task 2.7: Dry Run and Testing

## Goal
Verify the complete posting pipeline works end-to-end by creating a sample test post, running the orchestrator in dry-run mode, and then optionally running against real platform test accounts.

## Requirements addressed
REQ-SCHEDULE-3, REQ-SCHEDULE-4, REQ-SCHEDULE-5, REQ-CLEANUP-1, REQ-CLEANUP-2 (verification of all posting pipeline requirements)

## Background
The posting pipeline (Tasks 2.1–2.6) is now complete. This task creates test fixtures, verifies the orchestrator's file discovery and cleanup logic, and documents how to perform a real integration test.

The full posting pipeline consists of:
- `scripts/utils/types.ts` — Shared types
- `scripts/utils/retry.ts` — Retry utility and text assembly
- `scripts/utils/linkedin-token-refresh.ts` — LinkedIn token management
- `scripts/post-to-bluesky.ts` — Bluesky posting module
- `scripts/post-to-linkedin.ts` — LinkedIn posting module
- `scripts/post-to-x.ts` — X posting module
- `scripts/post-daily.ts` — Main orchestrator
- `.github/workflows/post-daily.yml` — GitHub Actions workflow

## Files to modify/create

- `scripts/test-fixtures/sample-post.json` — A valid sample post JSON file for testing
- `scripts/test-fixtures/sample-post.png` — A small placeholder PNG image for testing (can be a 1×1 pixel PNG)
- `scripts/package.json` — Add a `"test:dry-run"` script entry

## Implementation details

### 1. Create test fixture: `scripts/test-fixtures/sample-post.json`

Create a valid post JSON file that conforms to the schema. Use tomorrow's date as the `assignedDate` so it doesn't conflict with real scheduled posts. Example content:

```json
{
  "id": "post-test-001",
  "assignedDate": "2099-12-31",
  "category": "feature-highlight",
  "text": "Babylon.js Node Material Editor lets you create complex shaders visually — no code required!",
  "hashtags": ["#3D", "#WebDev", "#gamedev", "#indiedev", "#WebDevelopment", "#webgl", "#gamedevelopment", "#IndieDevs"],
  "conditionalHashtags": [],
  "link": {
    "url": "https://nme.babylonjs.com",
    "type": "demo",
    "title": "Node Material Editor"
  },
  "media": {
    "type": "screenshot",
    "sourceUrl": "https://nme.babylonjs.com",
    "description": "The Babylon.js Node Material Editor interface",
    "filePath": "media/post-test-001.png"
  },
  "metadata": {
    "topic": "Node Material Editor",
    "babylonFeatureArea": "Materials",
    "contentSource": "https://doc.babylonjs.com/features/featuresDeepDive/materials/node_material",
    "usesEmoji": false,
    "postFormat": "feature-statement",
    "dayIndex": 1
  }
}
```

### 2. Create test fixture: `scripts/test-fixtures/sample-post.png`

Create a minimal valid PNG file. This can be a 1×1 pixel image — the content doesn't matter for dry-run testing. It just needs to be a valid PNG that the posting modules can read.

### 3. Add npm script for dry-run testing

In `scripts/package.json`, add:
```json
"test:dry-run": "tsx post-daily.ts --dry-run --date 2099-12-31"
```

### 4. Set up the dry-run test

To run a dry-run test:

1. Copy `scripts/test-fixtures/sample-post.json` to `scheduled/2099-12-31.json` (at the repo root).
2. Copy `scripts/test-fixtures/sample-post.png` to `media/post-test-001.png` (at the repo root).
3. Run `npm run test:dry-run -w scripts` from the repo root.
4. Verify the orchestrator:
   - Finds the post file at `scheduled/2099-12-31.json`
   - Reads the JSON correctly
   - Locates the screenshot at `media/post-test-001.png`
   - Reports mock success for all three platforms (dry-run mode)
   - Reports that it would delete the files (but doesn't actually delete them in dry-run)
5. Clean up: remove the copied files from `scheduled/` and `media/`.

### 5. Verify edge cases

**No post for today:**
- Ensure `scheduled/` does not have a file for the `--date` value.
- Run the orchestrator with `--dry-run --date 2099-01-01`.
- Verify it exits cleanly with "No post scheduled" message and exit code 0.

**Verify text assembly:**
- Check the dry-run output to confirm the assembled text for each platform is correct:
  - X: body + link + all hashtags
  - LinkedIn: body + link + all hashtags
  - Bluesky: body + link only (no hashtags)

**Verify TypeScript compilation:**
- Run `npx tsc --noEmit -p scripts/tsconfig.json` to ensure all posting scripts compile without errors.

### 6. Document integration testing procedure

Create a section in the README or as comments in the test fixture documenting how to perform a real integration test:

1. Set up test accounts on each platform (or use the real accounts if authorized).
2. Set environment variables: `X_USERNAME`, `X_PASSWORD`, `X_EMAIL`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_REFRESH_TOKEN`, `LINKEDIN_ORGANIZATION_ID`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`.
3. Create a real scheduled post with today's date.
4. Run `npx tsx post-daily.ts` (without `--dry-run`).
5. Verify posts appear on all three platforms.
6. Verify the scheduled file and screenshot are deleted from the repo (or moved to `failed/` if any platform fails).

**Caution:** Real integration tests will create actual public posts. Only run with explicit authorization. Delete test posts after verification.

## Testing suggestions
- Run the dry-run test as described in step 4 above.
- Verify exit code 0 for both "post found" and "no post found" scenarios.
- Verify TypeScript compilation of all scripts.
- If the GitHub Actions workflow has been committed, trigger it manually with `dry_run: true` and `date: 2099-12-31` (after placing the test fixture in `scheduled/`). Verify the Actions run completes successfully.

## Gotchas
- The dry-run test requires copying files to `scheduled/` and `media/` at the repo root. Don't commit these test files — clean them up after testing. Add `scheduled/2099-*` to `.gitignore` as an extra safety measure if desired.
- The `--date` override bypasses the DST self-gating check, which is necessary for testing.
- The sample PNG must be a valid PNG file, not just any binary data. Some image upload APIs validate the image format.
- Make sure the `scripts/` package has been installed (`npm install -w scripts`) before running tests.
- The dry-run mode should be clearly distinguishable in output (e.g., `[DRY RUN]` prefix on all log messages) to prevent confusion with real posting.

## Verification checklist
- [ ] `scripts/test-fixtures/sample-post.json` exists and is valid JSON conforming to the schema
- [ ] `scripts/test-fixtures/sample-post.png` exists and is a valid PNG file
- [ ] `scripts/package.json` has `"test:dry-run"` script
- [ ] Dry-run test completes successfully with the sample post
- [ ] Dry-run output shows correct text assembly for each platform
- [ ] "No post found" scenario exits cleanly with code 0
- [ ] All TypeScript files compile without errors
- [ ] Integration testing procedure is documented
- [ ] Test fixtures are cleaned up after testing (not committed to `scheduled/` or `media/`)
