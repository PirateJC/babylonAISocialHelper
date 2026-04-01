# Task 4.1: End-to-End Testing

## Goal
Verify the complete pipeline works end-to-end: generate content with the Phase 1 skill, import it into the web app, review and approve posts, and verify the posting workflow handles them correctly (via dry-run and optionally real posting).

## Requirements addressed
All REQ-* requirements (integration verification across the full pipeline)

## Background
The Babylon.js Social Media Helper has three phases that form a pipeline:
1. **Phase 1 — Content Generation:** AI agent skill generates posts.json + media/*.png.
2. **Phase 2 — Review Web App:** Team imports, reviews, edits, and approves posts.
3. **Phase 3 — Auto-Posting:** GitHub Actions workflow reads scheduled/ and posts to all platforms.

This task performs end-to-end testing across all three phases to verify they integrate correctly. It uses a small test batch (5–7 posts) rather than a full production batch.

This task depends on all previous tasks (1.1–3.13) being complete.

## Files to modify/create

No new files. This task is a testing and verification exercise using existing infrastructure.

## Implementation details

### 1. Generate a small test batch

Use the Phase 1 content generation skill (SKILL.md) to generate 5–7 posts:
1. Invoke the skill and request 5 posts.
2. Verify the skill outputs `output/posts.json` and `media/post-001.png` through `media/post-005.png`.
3. Run the validation script: `npm run validate -w scripts -- ../output/posts.json`.
4. Verify all checks pass (schema, content mix, grapheme limits, hashtags, de-duplication).

If the skill is not yet available (it runs via the AI agent), create the test data manually using the sample post fixture from Task 2.7, expanded to 5 posts with different categories and content.

### 2. Import into the web app

1. Start the web app locally: `npm run dev -w webapp`.
2. Log in via GitHub OAuth (or use dev auth bypass if testing locally without the Worker).
3. Navigate to the import screen.
4. Import the `posts.json` file via drag-drop or file picker.
5. Verify:
   - JSON is parsed and validated against the schema.
   - Dates are assigned starting from the day after the last scheduled date.
   - Import summary shows correct totals and category breakdown.
   - Posts appear in the list as Drafts.

### 3. Review and edit posts

1. Navigate to the post list.
2. Click into a post detail view — verify all fields display correctly.
3. Edit a draft post's text — verify the grapheme counter updates in real time.
4. Try to exceed 300 graphemes — verify the counter turns red.
5. Upload a replacement image — verify the preview shows the new image.
6. Save changes — verify they persist in localStorage.

### 4. Approve posts

1. Approve a single post from the detail view — verify it commits to `scheduled/` in the repo.
2. Select 3 posts and batch approve — verify sequential commits with progress indicator.
3. Check the repo's `scheduled/` directory — verify JSON files and screenshots are present.
4. Verify approved posts now show as "Scheduled" in the list (not editable).

### 5. Test the posting pipeline (dry-run)

1. The approved posts should now be in `scheduled/` with specific dates.
2. Run the posting orchestrator in dry-run mode with one of those dates:
   `cd scripts && npx tsx post-daily.ts --dry-run --date {one-of-the-dates}`
3. Verify the orchestrator:
   - Finds the post file.
   - Reads the JSON and locates the screenshot.
   - Reports mock success for all three platforms.
   - Shows the correct assembled text for each platform (X/LinkedIn with hashtags, Bluesky without).

### 6. Test failure handling

1. Create a `failed/` post manually (copy a scheduled post to `failed/` and add `platformResults`).
2. In the web app, verify the failed post appears with a red badge and "Retry" action.
3. Click into the failed post detail — verify per-platform results are displayed.
4. Click "Retry Posting" — verify the post moves back to `scheduled/`.
5. Click "Edit & Reschedule" on another failed post — verify it appears as a Draft.

### 7. Test deletion

1. Delete a Draft post — verify it's removed from localStorage and the list.
2. Delete a Scheduled post — verify the files are removed from the repo.
3. Batch delete multiple posts — verify the confirmation modal and sequential deletion.

### 8. Test edge cases

- Import with no existing scheduled posts — verify dates start from tomorrow.
- Import when all dates are occupied — verify correct skip logic.
- Approve a post that's over 300 graphemes — verify it's blocked.
- Batch approve more than 15 posts — verify the cap error.
- Access the app without authentication — verify only the login screen is visible.
- Access with a non-team-member account — verify the Access Denied screen.

## Testing suggestions
- This task IS the testing. Each step above is a test case.
- Document the results of each test (pass/fail) and any issues found.
- If issues are found, fix them and re-test.

## Gotchas
- **Real platform posting:** Do NOT test with real platform accounts unless explicitly authorized. Dry-run mode is sufficient for integration testing.
- **GitHub API rate limits:** Running multiple approvals and deletions in quick succession may approach rate limits. Space out operations if needed.
- **Browser state:** localStorage persists across page refreshes but not across browsers or incognito sessions. Test with a single browser session.
- **OAuth in local dev:** The OAuth flow requires the Cloudflare Worker to be running (either locally via `wrangler dev` or deployed). If testing without OAuth, use the dev auth bypass.

## Verification checklist
- [ ] Phase 1 output validates against the schema
- [ ] Import flow correctly assigns dates and stores drafts
- [ ] Post list displays merged Draft/Scheduled/Failed posts
- [ ] Filtering by status, category, and date works
- [ ] Post editing updates grapheme counter in real time
- [ ] Single approval commits JSON and PNG to repo
- [ ] Batch approval commits sequentially with progress
- [ ] Posting orchestrator (dry-run) finds and processes scheduled posts
- [ ] Failed post detail shows per-platform results
- [ ] Retry moves failed posts back to scheduled
- [ ] Deletion works for all statuses (Draft, Scheduled, Failed)
- [ ] Auth flow works (login, team check, sign-out)
- [ ] Edge cases handled (no posts, date conflicts, over-limit, batch cap)
