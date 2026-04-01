# Task 3.9: Batch Approval

## Goal
Implement batch approval of multiple Draft posts: validate the selection, enforce the 15-post cap, commit posts sequentially with a progress indicator, and handle mid-batch failures gracefully.

## Requirements addressed
REQ-APPROVE-5, REQ-APPROVE-6, REQ-APPROVE-7, REQ-APPROVE-8

## Background
The Babylon.js Social Media Helper allows users to select multiple Draft posts and approve them in a single batch operation. Batch approval commits posts one at a time (sequentially, not in parallel) to avoid API complexity and provide clear progress feedback.

**Batch constraints:**
- Maximum 15 posts per batch (REQ-APPROVE-6). This prevents excessive API calls and respects GitHub's rate limits.
- Sequential commits with a progress indicator: "Committing 3 of 12…" (REQ-APPROVE-7).
- If any commit fails mid-batch, the process stops. Posts already committed keep their Scheduled status; remaining posts stay as Drafts (REQ-APPROVE-8).

This task depends on:
- Task 3.5 (post list — batch action bar, selection state)
- Task 3.8 (individual approval — the `approvePost` function)

## Files to modify/create

- `webapp/src/components/BatchActionBar.tsx` — Wire the "Approve Selected" button
- `webapp/src/components/PostList.tsx` — Add batch approval state management and progress UI

## Implementation details

### 1. Wire "Approve Selected" in BatchActionBar.tsx

When the user clicks "Approve Selected":

**a) Validate selection:**
1. Filter the selected posts to include only Drafts. If any selected post is not a Draft, silently exclude it (or show a notice).
2. Check the count of Draft posts to approve:
   - If count is 0, show: "No Draft posts selected."
   - If count > 15, show: "Please select 15 or fewer posts. You have {count} selected." (REQ-APPROVE-6).
   - If count is 1–15, proceed.

**b) Validate each post's grapheme count:**
Before starting the batch, check all selected posts against the 300-grapheme limit. If any post exceeds the limit, show an error listing the over-limit posts and do NOT start the batch. This pre-validation prevents mid-batch failures due to grapheme violations.

**c) Start batch approval:**
Show a modal or overlay with the progress indicator.

### 2. Batch approval execution

Create a function **`batchApprove(token: string, posts: Post[], onProgress: (current: number, total: number) => void): Promise<BatchResult>`**

Where `BatchResult` is:
```
{
  completedCount: number;
  failedPostId?: string;
  error?: string;
}
```

**Logic:**
1. For each post in the array (in order):
   a. Call `onProgress(i + 1, posts.length)` to update the progress indicator.
   b. Call `approvePost(token, post)` (the same function from Task 3.8).
   c. If the call succeeds, continue to the next post.
   d. If the call fails: stop the batch, record the failed post ID and error, return immediately (REQ-APPROVE-8).
2. After all posts are processed, return the result.

### 3. Progress UI

While the batch is running, display a progress indicator:
- **Modal/overlay** that blocks interaction with the rest of the UI.
- **Progress text:** "Committing 3 of 12…" (REQ-APPROVE-7).
- **Progress bar** (optional but helpful): visual bar from 0% to 100%.
- **Current post info:** Show the post ID and date being committed.

### 4. Result handling

**All succeeded:**
- Dismiss the progress modal.
- Show a success message: "Successfully approved {N} posts."
- Refresh the post list (re-fetch from localStorage and GitHub API).

**Mid-batch failure:**
- Dismiss the progress modal.
- Show an error message: "Batch stopped at post {failedPostId} ({i} of {N}). Error: {error}. {i-1} posts were successfully approved. The remaining {N-i} posts are still Drafts."
- The successfully committed posts should already have been removed from localStorage (by `approvePost`). The list should reflect the mixed state.

### 5. Update PostList.tsx

Add state for batch operation:
- `isBatchRunning: boolean`
- `batchProgress: { current: number; total: number } | null`

Pass `isBatchRunning` to BatchActionBar to disable buttons during the operation. When the batch completes, clear selection and refresh the post list.

## Testing suggestions
- Select 3 Draft posts and batch approve — verify all three are committed and appear as Scheduled.
- Select 16+ Draft posts — verify the 15-post cap error is shown.
- Select a mix of Draft and Scheduled posts — verify only Drafts are approved (Scheduled are skipped).
- Simulate a mid-batch failure (e.g., by revoking the token mid-batch or having a date conflict) — verify the batch stops, the error is reported, and earlier posts retain Scheduled status.
- Verify the progress indicator shows correct counts during the batch.
- Verify the post list refreshes after the batch completes.
- Select Draft posts where one exceeds 300 graphemes — verify pre-validation catches it before the batch starts.

## Gotchas
- **Sequential, not parallel:** Posts must be committed one at a time. Parallel commits would create merge conflicts (each commit tries to update the same branch HEAD).
- **Rate limits:** Each post approval requires ~2 API calls. A 15-post batch = ~30 API calls. GitHub allows 5,000 per hour. Well within limits, but add a small delay between commits (e.g., 500ms) to be a good API citizen.
- **UI blocking:** The progress modal should prevent the user from interacting with the list while the batch is running. Clicking away should not cancel the batch.
- **Partial state:** After a mid-batch failure, the post list is in a mixed state: some posts are now Scheduled (committed), others are still Drafts (in localStorage). The list should accurately reflect this. Re-fetching from both sources is the safest approach.
- **Grapheme pre-validation:** Validate ALL posts before starting the batch. Don't start committing and then discover a grapheme violation on post #8.

## Verification checklist
- [ ] "Approve Selected" button is enabled when Draft posts are selected
- [ ] Batch is blocked if more than 15 posts are selected (with error message)
- [ ] All selected posts are pre-validated against 300-grapheme limit
- [ ] Progress indicator shows "Committing N of M…" during the batch
- [ ] Posts are committed sequentially (one at a time)
- [ ] On success: all posts move from Draft to Scheduled, success message shown
- [ ] On mid-batch failure: batch stops, error reported, earlier posts keep Scheduled status
- [ ] Post list refreshes after batch completion
- [ ] UI is blocked during batch operation (no double-clicks or navigation)
- [ ] Selection is cleared after batch completes
