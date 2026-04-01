# Task 3.10: Delete (Single and Batch) with Confirmation

## Goal
Implement post deletion for all three statuses (Draft, Scheduled, Failed) with a confirmation modal, supporting both single-post and batch deletion.

## Requirements addressed
REQ-DELETE-1, REQ-DELETE-2, REQ-DELETE-3, REQ-DELETE-4, REQ-DELETE-5, REQ-DELETE-6

## Background
The Babylon.js Social Media Helper allows users to delete posts from any status. The deletion behavior varies by status:

- **Draft:** Remove from localStorage (no repo changes needed).
- **Scheduled:** Delete the JSON file from `scheduled/` and the screenshot from `media/` in the repo via the GitHub API.
- **Failed:** Delete the JSON file from `failed/` and the screenshot from `media/` in the repo via the GitHub API.

All deletions require a confirmation modal before proceeding. Batch deletion follows the same pattern with a count-aware message.

This task depends on:
- Task 3.4 (storage service — removeDraft)
- Task 3.5 (post list — batch action bar)
- Task 3.6 (post detail — Delete button)

## Files to modify/create

- `webapp/src/components/DeleteConfirmModal.tsx` — Confirmation dialog
- `webapp/src/services/github-api.ts` — Add file deletion functions
- `webapp/src/components/PostDetail.tsx` — Wire the Delete button
- `webapp/src/components/BatchActionBar.tsx` — Wire the "Delete Selected" button
- `webapp/src/components/PostList.tsx` — Add deletion state management

## Implementation details

### 1. Create `webapp/src/components/DeleteConfirmModal.tsx`

A modal dialog that appears before any deletion:

**Props:**
- `isOpen: boolean`
- `postCount: number` — Number of posts being deleted (1 for single, N for batch).
- `hasScheduledPosts: boolean` — Whether any of the posts are Scheduled (triggers repo warning).
- `hasFailedPosts: boolean` — Whether any are Failed.
- `onConfirm: () => void`
- `onCancel: () => void`

**Content (REQ-DELETE-2):**
- Title: "Delete {N} post(s)?"
- Warning text: "This action cannot be undone."
- If `hasScheduledPosts` or `hasFailedPosts`: "Scheduled and failed posts will also be removed from the repository."
- If only drafts: "Draft posts will be removed from your browser."
- Buttons: "Delete" (red/destructive styling) and "Cancel"

### 2. Add deletion functions to `webapp/src/services/github-api.ts`

**`deleteRepoFile(token: string, path: string): Promise<void>`**
- Call `GET /repos/{owner}/{repo}/contents/{path}` to get the file's SHA.
- Call `DELETE /repos/{owner}/{repo}/contents/{path}` with the SHA and a commit message.

**`deleteScheduledPost(token: string, post: Post): Promise<void>`** (REQ-DELETE-4)
1. Delete `scheduled/{post.assignedDate}.json` via `deleteRepoFile`.
2. Delete `{post.media.filePath}` (e.g., `media/post-001.png`) via `deleteRepoFile`.

**`deleteFailedPost(token: string, post: Post): Promise<void>`** (REQ-DELETE-5)
1. Delete `failed/{post.assignedDate}.json` via `deleteRepoFile`.
2. Delete `{post.media.filePath}` via `deleteRepoFile`.

### 3. Create a unified delete function

**`deletePost(token: string, post: Post): Promise<void>`**
- If `post.status === "draft"`: Call `removeDraft(post.id)` (REQ-DELETE-3).
- If `post.status === "scheduled"`: Call `deleteScheduledPost(token, post)`.
- If `post.status === "failed"`: Call `deleteFailedPost(token, post)`.

### 4. Wire single-post deletion

**In PostDetail.tsx:**
- Show a "Delete" button for all post statuses (Draft, Scheduled, Failed).
- On click: Open `DeleteConfirmModal` with `postCount: 1`.
- On confirm: Call `deletePost(token, post)`. Show a loading indicator.
- On success: Navigate back to the post list.
- On error: Show the error message.

### 5. Wire batch deletion

**In BatchActionBar.tsx:**
- "Delete Selected" button is always enabled when posts are selected.
- On click: Open `DeleteConfirmModal` with `postCount: selectedPosts.length`.
- Set `hasScheduledPosts` and `hasFailedPosts` based on the selected posts' statuses.

**In PostList.tsx:**
- On batch confirm:
  1. For each selected post, call `deletePost(token, post)`.
  2. Process sequentially (like batch approval) to avoid conflicts.
  3. Show progress: "Deleting 3 of 12…"
  4. If a deletion fails, stop and report (similar to batch approval failure handling).
  5. On completion, refresh the post list and clear selection.

### 6. Error handling

- If deleting a repo file fails (e.g., file doesn't exist, permission error), show the error to the user.
- A 404 error when deleting means the file was already deleted (possibly by another user). Treat this as a success.
- Network errors should be retried or reported clearly.

## Testing suggestions
- Delete a Draft post — verify it's removed from localStorage and the list.
- Delete a Scheduled post — verify the JSON and screenshot are removed from the repo.
- Delete a Failed post — verify the JSON and screenshot are removed from the repo.
- Verify the confirmation modal appears for all deletion types.
- Verify the modal message mentions repo deletion for Scheduled/Failed posts.
- Select 5 posts (mix of statuses) and batch delete — verify all are removed.
- Test deletion when the file doesn't exist in the repo (already deleted) — verify it's handled gracefully.
- Test deletion from both the detail view and the list view.
- Cancel a deletion — verify nothing is removed.

## Gotchas
- **Two API calls per repo deletion:** Deleting a file requires knowing its SHA first (GET then DELETE). This means each Scheduled/Failed post deletion requires 2–4 API calls (2 for the JSON, 2 for the image).
- **Race conditions:** If two users try to delete the same post simultaneously, the second DELETE will fail with a 409 (SHA mismatch). Handle this by re-fetching the SHA or treating 404/409 as success.
- **Orphaned images:** If the JSON file is deleted but the image deletion fails, the image is orphaned. This is harmless — orphaned images don't affect the system. But consider logging a warning.
- **Batch deletion order:** Delete in any order since deletions are independent. However, sequential execution prevents conflicts.
- **Confirmation modal for batch:** The modal should show the total count and the types of posts being deleted. "Delete 5 posts? This will remove 2 scheduled posts from the repository and 3 draft posts from your browser. This action cannot be undone."

## Verification checklist
- [ ] Delete button appears on Detail view for all statuses
- [ ] Confirmation modal appears before any deletion
- [ ] Modal shows correct post count and appropriate warnings
- [ ] Draft deletion removes from localStorage
- [ ] Scheduled deletion removes JSON from `scheduled/` and image from `media/` via GitHub API
- [ ] Failed deletion removes JSON from `failed/` and image from `media/` via GitHub API
- [ ] Batch deletion works for multiple posts
- [ ] Progress indicator for batch deletion
- [ ] Post list refreshes after deletion
- [ ] 404 errors (already deleted) are handled gracefully
- [ ] Cancel dismisses the modal without deleting
