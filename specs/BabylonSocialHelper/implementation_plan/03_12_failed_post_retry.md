# Task 3.12: Failed Post Retry

## Goal
Implement the failed post detail view showing per-platform posting results, and the retry action that moves a failed post back to the `scheduled/` directory for the next posting cycle.

## Requirements addressed
REQ-DETAIL-7, REQ-DETAIL-8, REQ-DETAIL-9, REQ-RETRY-4, REQ-RETRY-5

## Background
When the GitHub Actions posting workflow fails to post to one or more platforms (after 3 retries per platform), the post is moved from `scheduled/` to `failed/` with per-platform results recorded in the JSON. The web app's Failed post detail view displays these results and provides actions to retry, edit & reschedule, or delete.

The per-platform results in a failed post's JSON look like:
```json
"platformResults": {
  "x": { "success": false, "error": "Rate limit exceeded", "retryCount": 3 },
  "linkedin": { "success": true, "postId": "urn:li:share:123", "retryCount": 0 },
  "bluesky": { "success": true, "postId": "at://did:plc:abc/app.bsky.feed.post/xyz", "retryCount": 0 }
}
```

This task depends on:
- Task 3.6 (post detail view — layout)
- Task 3.5 (post list — Retry action button)

## Files to modify/create

- `webapp/src/components/FailedPostDetail.tsx` — Failed post view with platform results
- `webapp/src/components/PlatformResultRow.tsx` — Single platform result display
- `webapp/src/services/github-api.ts` — Add function to move a post from failed/ back to scheduled/
- `webapp/src/components/PostDetail.tsx` — Integrate FailedPostDetail for failed status

## Implementation details

### 1. Create `webapp/src/components/PlatformResultRow.tsx`

A row component that displays the result for one platform:

**Props:**
- `platform: "x" | "linkedin" | "bluesky"`
- `result: PlatformResult`

**Rendering:**
- **Platform name:** Display "X (Twitter)", "LinkedIn", or "Bluesky" with the platform's icon/logo.
- **Status:** Green checkmark + "Success" or Red X + "Failed"
- **Post ID (on success):** Display the tweet ID, LinkedIn URN, or Bluesky URI as a clickable link (where possible — X and Bluesky URIs can be converted to web URLs).
- **Error message (on failure):** Display the error message in a highlighted box.
- **Retry count:** "Attempted {retryCount + 1} time(s)" (the initial attempt + retries).

### 2. Create `webapp/src/components/FailedPostDetail.tsx`

Extends the post detail view for failed posts:

**Layout:**
- All the standard post content (text, image, link, metadata) from PostDetail.
- **Platform Results section:** Three `<PlatformResultRow>` components, one for each platform (X, LinkedIn, Bluesky).
- **Action Log (optional, REQ-DETAIL-9):** If the failed post JSON includes timestamp data, display a chronological log of events (e.g., "10:00:01 — Uploading image to X", "10:00:05 — X posting failed: Rate limit", etc.). This is a SHOULD requirement, so implement it if the data is available, otherwise show a note linking to the GitHub Actions run log.

**Action buttons (REQ-DETAIL-8):**
- **"Retry Posting"** — Move the post back to `scheduled/` for the next posting cycle.
- **"Edit & Reschedule"** — Copy the post to localStorage as a Draft (with a new date) so the user can edit and re-approve. Remove from `failed/`.
- **"Delete"** — Delete the post from `failed/` and its screenshot from `media/` (reuses the delete logic from Task 3.10).

### 3. Implement retry logic

**`retryFailedPost(token: string, post: Post): Promise<void>`** (add to github-api.ts)

This function moves a post from `failed/` back to `scheduled/` (REQ-RETRY-4):

1. **Determine the date:** If the original `assignedDate` is today or in the future, use it. If the date has passed, assign the next available date (query `scheduled/` to find the next open date, similar to the import date assignment logic).

2. **Prepare the post JSON:** Remove the `platformResults` field (since we're retrying, start fresh). Keep all other fields intact.

3. **Commit the post JSON to `scheduled/{date}.json`** via the GitHub API.

4. **Delete the post from `failed/{originalDate}.json`** via the GitHub API.

5. **Ensure the screenshot still exists in `media/`** (it should, since REQ-CLEANUP-2 retains screenshots for failed posts).

### 4. Implement "Edit & Reschedule"

When the user clicks "Edit & Reschedule":
1. Create a copy of the post data (without `platformResults`).
2. Set `status: "draft"` and optionally assign a new date (next available).
3. Save to localStorage via `saveDrafts` (add to existing drafts).
4. Delete the post from `failed/` in the repo.
5. Navigate to the post detail view where the user can edit and re-approve.

### 5. Integrate with PostDetail.tsx

In `PostDetail.tsx`, when the post's status is `"failed"`:
- Render `<FailedPostDetail>` instead of the standard detail layout.
- This component wraps the standard content display with the platform results section and failed-specific action buttons.

### 6. Wire Retry button in PostList.tsx

In `PostRow.tsx`, the "Retry" action button for failed posts should:
- On click, call `retryFailedPost(token, post)`.
- Show a loading indicator.
- On success, refresh the post list (the post should now appear as Scheduled).
- On error, show the error message.

## Testing suggestions
- Create a mock failed post JSON (with platformResults) in the `failed/` directory. Load the detail view and verify platform results are displayed correctly.
- Click "Retry Posting" — verify the post moves from `failed/` to `scheduled/`.
- Click "Retry Posting" on a post whose date has passed — verify it gets assigned a future date.
- Click "Edit & Reschedule" — verify the post appears in localStorage as a Draft and is removed from `failed/`.
- Click "Delete" on a failed post — verify the confirmation modal appears and the post is deleted.
- Verify that the "Retry" button in the post list works the same as in the detail view.
- Test with a post where all three platforms failed — verify all three rows show failure.
- Test with a post where 2 platforms succeeded and 1 failed — verify the mix of results.

## Gotchas
- **Date assignment for retry:** When retrying a post whose date has passed, the new date must not conflict with existing scheduled posts. Reuse the date assignment logic from Task 3.4.
- **Platform results format:** The `platformResults` field is added by the posting orchestrator (Task 2.5). Ensure the web app correctly reads this nested structure.
- **Post URI to URL conversion:** For success results, converting platform-specific IDs to clickable URLs:
  - X: `https://x.com/babylonjs/status/{tweetId}` (assuming the tweet ID is numeric).
  - LinkedIn: LinkedIn post URNs are not directly linkable in a simple URL format. Show the URN as text.
  - Bluesky: `https://bsky.app/profile/{handle}/post/{postRkey}` (extract from the AT URI).
- **Removing platformResults on retry:** When moving back to `scheduled/`, strip the `platformResults` field. The posting workflow will re-add results after the new attempt.
- **Screenshot retention:** When a post fails, the screenshot is retained in `media/` (per REQ-CLEANUP-2). When retrying, no new image upload is needed — the existing image is already in the repo.

## Verification checklist
- [ ] FailedPostDetail displays per-platform results (success/failure, error messages, post IDs)
- [ ] PlatformResultRow shows correct status icon, message, and retry count for each platform
- [ ] "Retry Posting" moves the post from `failed/` to `scheduled/`
- [ ] If the date has passed, a new future date is assigned
- [ ] "Edit & Reschedule" copies the post to localStorage as a Draft and removes from `failed/`
- [ ] "Delete" removes the post from `failed/` and screenshot from `media/`
- [ ] Retry button in the post list row works correctly
- [ ] `platformResults` field is stripped when moving back to `scheduled/`
- [ ] Post list refreshes after retry/edit/delete actions
