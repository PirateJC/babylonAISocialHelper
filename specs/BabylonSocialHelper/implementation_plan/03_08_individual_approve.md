# Task 3.8: Individual Post Approval

## Goal
Implement the single-post approval flow: validate the post is within the 300-grapheme limit, commit the post JSON and screenshot PNG to the `scheduled/` directory in the GitHub repo, update the post's status from Draft to Scheduled, and remove it from localStorage.

## Requirements addressed
REQ-APPROVE-1, REQ-APPROVE-2, REQ-APPROVE-3, REQ-APPROVE-4, REQ-APPROVE-9

## Background
Approving a post in the Babylon.js Social Media Helper means committing it to the GitHub repo's `scheduled/` directory so the daily GitHub Actions workflow can pick it up and publish it. The approval flow:

1. Validate that body text + link URL ≤ 300 graphemes.
2. Read the screenshot image (from localStorage base64 data or from the original Phase 1 media file).
3. Create a Git Blob for the PNG image via the GitHub API.
4. Commit the post JSON to `scheduled/{YYYY-MM-DD}.json`.
5. Commit the screenshot PNG to `media/{filePath}`.
6. Remove the post from localStorage.
7. Update the UI to reflect the new "Scheduled" status.

Only Draft posts can be approved (REQ-APPROVE-9). The Approve button must NOT appear for Scheduled or Failed posts.

This task depends on:
- Task 3.4 (storage service — removeDraft)
- Task 3.5 (post list — for wiring the Approve action button)
- Task 3.6 (post detail — for the Approve button)
- Task 3.7 (grapheme counting utility)

## Files to modify/create

- `webapp/src/services/github-api.ts` — Add commit/upload functions
- `webapp/src/components/PostDetail.tsx` — Wire the Approve button
- `webapp/src/components/PostRow.tsx` — Wire the Approve action button in list view

## Implementation details

### 1. Add commit functions to `webapp/src/services/github-api.ts`

**`commitPostToScheduled(token: string, post: Post, imageData: string | ArrayBuffer): Promise<void>`**

This function commits both the post JSON and the screenshot image to the repo. The steps:

**a) Prepare the post JSON:**
Create a clean post object for the scheduled file. Remove `status`, `localImageData`, and any other UI-only fields. The JSON file should match the schema format expected by the posting scripts:
```json
{
  "id": "post-001",
  "assignedDate": "2026-04-17",
  "category": "feature-highlight",
  "text": "...",
  "hashtags": [...],
  "conditionalHashtags": [...],
  "link": { ... },
  "media": { ... },
  "metadata": { ... }
}
```

**b) Commit the screenshot image to `media/`:**
- Path: `media/{post.media.filePath}` — but `filePath` already includes the `media/` prefix (e.g., `media/post-001.png`), so the path is just `{post.media.filePath}`.
- If `imageData` is a base64 string (from localStorage `localImageData`), strip the data URL prefix (`data:image/png;base64,`) and use the raw base64.
- Use the GitHub Contents API: `PUT /repos/{owner}/{repo}/contents/{path}` with:
  - `message`: `"chore: add screenshot for {post.id}"`
  - `content`: base64-encoded image data
  - This creates or updates the file.

**c) Commit the post JSON to `scheduled/`:**
- Path: `scheduled/{post.assignedDate}.json`
- Content: the post JSON, base64-encoded.
- Use the GitHub Contents API: `PUT /repos/{owner}/{repo}/contents/scheduled/{date}.json` with:
  - `message`: `"chore: schedule post {post.id} for {post.assignedDate}"`
  - `content`: base64-encoded JSON string

**Important:** These are two separate commits. If the image commit succeeds but the JSON commit fails, the image will be orphaned. This is acceptable — the user can retry, and orphaned images are harmless. A more robust approach (using the Git Trees API for atomic multi-file commits) can be added as a future optimization.

### 2. Add approval logic

Create a reusable function (e.g., in a new file `webapp/src/services/approve.ts` or within the PostDetail/PostRow components):

**`approvePost(token: string, post: Post): Promise<{ success: boolean; error?: string }>`**

1. **Validate grapheme limit:** Count graphemes of `post.text + " " + post.link.url`. If > 300, return `{ success: false, error: "Post exceeds 300-grapheme limit (current: {count}). Please shorten the text or link." }` (REQ-APPROVE-3).

2. **Get image data:** 
   - If `post.localImageData` exists (user uploaded a replacement), use it.
   - Otherwise, the image must come from the original Phase 1 output. Since the Phase 1 images are on the user's local machine and the web app can't access local files directly, the user should have uploaded the images during import or editing. If no image data is available, return an error asking the user to upload a screenshot.

3. **Commit to repo:** Call `commitPostToScheduled(token, post, imageData)`.

4. **Update local state:** Call `removeDraft(post.id)` to remove from localStorage.

5. **Return success.**

### 3. Wire the Approve button

**In PostDetail.tsx:**
- For Draft posts, show an "Approve" button.
- On click, call `approvePost(token, post)`.
- Show a loading spinner during the commit.
- On success, show a success message and navigate back to the post list (or update the status to "Scheduled" in place).
- On failure, show the error message (e.g., over-limit, API error).

**In PostRow.tsx:**
- For Draft posts, the action button is "Approve."
- On click, trigger the same approval flow.
- On success, update the post's status in the list.

### 4. Handle image data for import

This task reveals an important design consideration: when posts are imported, the screenshot images are on the user's local machine (from the Phase 1 skill output). The web app needs access to these images to commit them to the repo.

**Solution:** During import (Task 3.4), the ImportPanel should allow the user to select the `media/` directory alongside the `posts.json` file, or the import flow should read the images and store them as base64 in localStorage alongside each draft post. Alternatively, add a step in the import flow that reads each image file referenced in the JSON.

If this wasn't handled in Task 3.4, update the import flow to:
1. Accept a folder selection (or multiple file selection) for the media files.
2. Match each image file to its post via the `media.filePath` field.
3. Store the base64 image data in each draft's `localImageData` field.

## Testing suggestions
- Approve a draft post — verify the JSON appears in `scheduled/` and the image in `media/` in the repo.
- Try to approve a post that exceeds 300 graphemes — verify the error message and that no commit is made.
- Try to approve a Scheduled post — verify the Approve button is not shown (REQ-APPROVE-9).
- Approve from the list view (action button) and from the detail view — verify both paths work.
- After approval, verify the post is removed from localStorage and appears as "Scheduled" in the list.
- Test with a network error during commit — verify the error is shown and the post remains as a Draft.

## Gotchas
- **Two separate commits:** The GitHub Contents API creates one commit per file. This means approval requires 2 API calls (image + JSON). If the second call fails, the image is orphaned. For a more robust approach, use the Git Trees/References API to create an atomic multi-file commit in a single API call. This is more complex but ensures atomicity.
- **Base64 encoding for GitHub API:** The GitHub Contents API expects the file content to be base64-encoded. For the image, this is straightforward (it's already base64 in localStorage). For the JSON, encode the JSON string with `btoa()` or equivalent.
- **File path:** The `media.filePath` field in the post JSON is `media/post-001.png`. When committing to the repo, the path is relative to the repo root.
- **Image data availability:** This is the trickiest part. Draft posts may not have image data in localStorage if the import didn't capture it. The import flow (Task 3.4) should be designed to handle this. If not, this task must add image import capability.
- **Commit message:** Each commit creates a new entry in the repo's git history. Keep commit messages descriptive but concise.

## Verification checklist
- [ ] Approve button visible for Draft posts only (not Scheduled or Failed)
- [ ] Approval validates grapheme count (body + link ≤ 300)
- [ ] Over-limit posts are blocked with a clear error message
- [ ] Approval commits post JSON to `scheduled/{YYYY-MM-DD}.json`
- [ ] Approval commits screenshot PNG to `media/{filePath}`
- [ ] Post is removed from localStorage after successful approval
- [ ] Post status changes from Draft to Scheduled in the UI
- [ ] Loading indicator shown during the commit process
- [ ] API errors are caught and displayed to the user
- [ ] Approve from list view and detail view both work
