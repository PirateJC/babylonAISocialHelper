# Task 3.5: Post List View with Filtering

## Goal
Implement the post list view that displays all posts (Draft, Scheduled, and Failed) in chronological order with filtering by status, category, and date range, plus checkbox selection for batch operations.

## Requirements addressed
REQ-LIST-1, REQ-LIST-2, REQ-LIST-3, REQ-LIST-4, REQ-LIST-5, REQ-LIST-6, REQ-LIST-7, REQ-LIST-8, REQ-LIST-9, REQ-LIST-10

## Background
The post list is the main working view of the Babylon.js Social Media Helper web app. It merges posts from three sources into a single chronological list:
1. **Draft posts** — from localStorage (imported but not yet approved).
2. **Scheduled posts** — from the repo's `scheduled/` directory (approved, awaiting publication).
3. **Failed posts** — from the repo's `failed/` directory (posting failed on one or more platforms).

Each post row shows: checkbox, screenshot thumbnail, date, text preview (truncated), category badge, status badge, and an action button. The action button varies by status: Approve (Draft), Edit (Scheduled — navigates to read-only detail), Retry (Failed).

The list supports filtering by status, category, and date range. A batch action bar appears when posts are selected.

This task depends on:
- Task 3.1 (web app scaffold — PostList placeholder, PostRow)
- Task 3.3 (authentication — for GitHub API token)
- Task 3.4 (import and storage — for localStorage draft management and github-api.ts)

## Files to modify/create

- `webapp/src/components/PostList.tsx` — Full post list implementation
- `webapp/src/components/PostRow.tsx` — Individual post row component
- `webapp/src/components/FilterBar.tsx` — Filter controls
- `webapp/src/components/BatchActionBar.tsx` — Batch action bar (selection count + action buttons)
- `webapp/src/services/github-api.ts` — Add functions to read scheduled and failed post contents

## Implementation details

### 1. Update `webapp/src/services/github-api.ts`

Add two functions:

**`fetchScheduledPosts(token: string): Promise<Post[]>`**
- List files in `scheduled/` via `GET /repos/{owner}/{repo}/contents/scheduled/`.
- For each `.json` file, fetch its content via `GET /repos/{owner}/{repo}/contents/scheduled/{filename}`.
- GitHub returns file content as base64. Decode it, parse as JSON, and map to `Post` objects with `status: "scheduled"`.
- Set `assignedDate` from the filename (strip `.json`).

**`fetchFailedPosts(token: string): Promise<Post[]>`**
- Same as above but for the `failed/` directory.
- Set `status: "failed"` on each post.

**Performance note:** Fetching individual file contents is N+1 API calls (1 for directory listing + N for file contents). For small numbers of files (< 50), this is acceptable. For larger batches, consider using the Git Trees API to fetch all file contents in a single call. Start with the simple approach and optimize later if needed.

### 2. Update `webapp/src/components/PostList.tsx`

**Data loading (on mount and when filters change):**
1. Load draft posts from localStorage via `loadDrafts()`.
2. Fetch scheduled posts via `fetchScheduledPosts(token)`.
3. Fetch failed posts via `fetchFailedPosts(token)`.
4. Merge all three arrays into a single list.
5. Sort by `assignedDate` in ascending chronological order.
6. Apply filters.

**State management:**
- `allPosts: Post[]` — The merged, unfiltered list.
- `filteredPosts: Post[]` — After applying filters.
- `selectedIds: Set<string>` — IDs of currently selected posts.
- `filters: { status: string; category: string; dateStart: string; dateEnd: string }` — Current filter values.
- `isLoading: boolean` — True while fetching from GitHub.

**Rendering:**
- Show a loading spinner while fetching.
- Display the post count: "{N} posts" matching current filters (REQ-LIST-5).
- Render `<FilterBar>` at the top.
- Render a header row with "Select All" checkbox (REQ-LIST-6).
- Render `<PostRow>` for each filtered post.
- Render `<BatchActionBar>` when `selectedIds.size > 0` (REQ-LIST-7).

### 3. Create `webapp/src/components/PostRow.tsx`

Each row displays:
- **Checkbox** for selection (toggles the post's ID in `selectedIds`).
- **Screenshot thumbnail** — For drafts, use the `localImageData` if available, or show a placeholder. For scheduled/failed posts, construct the GitHub raw content URL for the image (`https://raw.githubusercontent.com/{owner}/{repo}/main/{media.filePath}`).
- **Date** — `assignedDate` formatted as readable (e.g., "Apr 17, 2026").
- **Text preview** — First ~80 characters of `post.text`, truncated with ellipsis.
- **Category badge** — "Feature", "Community", or "Docs" with distinct colors.
- **Status badge** — "Draft" (gray), "Scheduled" (green), "Failed" (red) (REQ-STATUS-6).
- **Action button:**
  - Draft → "Approve" button (triggers individual approval — wired in Task 3.8)
  - Scheduled → "View" button (navigates to detail view)
  - Failed → "Retry" button (triggers retry — wired in Task 3.12)

**Click behavior:** Clicking the row (outside checkbox and action button) navigates to `#/posts/{post.id}` (REQ-LIST-8).

**Failed post styling:** Failed rows should have a visually distinct background (e.g., light red/pink) (REQ-LIST-9).

### 4. Create `webapp/src/components/FilterBar.tsx`

Render filter controls:
- **Status dropdown:** All / Draft / Scheduled / Failed
- **Category dropdown:** All / Feature Highlight / Community Demo / Docs & Tutorial
- **Date range:** Start date picker and End date picker

When any filter changes, update the parent's filter state. The parent (`PostList`) recomputes `filteredPosts`.

### 5. Create `webapp/src/components/BatchActionBar.tsx`

Render when one or more posts are selected:
- "**N selected**" text showing the count.
- **"Approve Selected"** button (only enabled if all selected posts are Drafts) — wired in Task 3.9.
- **"Delete Selected"** button — wired in Task 3.10.
- **"Clear Selection"** button that resets `selectedIds` to empty.

For now, the Approve and Delete buttons can show "Coming soon" alerts. They'll be wired to real functionality in Tasks 3.9 and 3.10.

## Testing suggestions
- Import a batch of posts (10+), verify they appear in the list as Drafts in chronological order.
- Manually create a `scheduled/YYYY-MM-DD.json` file in the repo, refresh the list, verify it appears with "Scheduled" status.
- Filter by status "Draft" — verify only drafts are shown. Filter by "Scheduled" — verify only scheduled posts show.
- Filter by category — verify only matching categories appear.
- Filter by date range — verify only posts within the range appear.
- Select posts via checkboxes — verify the batch action bar appears with the correct count.
- Click "Select All" — verify all visible posts are selected. Click again — verify all are deselected.
- Click a post row — verify it navigates to the detail view.
- Verify failed posts have distinct visual styling.

## Gotchas
- **Merging three data sources:** Draft posts (from localStorage) and repo posts (Scheduled/Failed) may have different shapes. Ensure the `Post` type is flexible enough to handle both. Draft posts won't have `platformResults`; failed posts will.
- **Stale data:** The list loads data on mount. If another team member approves or imports posts, the list won't update until refresh. Consider adding a refresh button.
- **Image thumbnails for drafts:** Draft posts don't have images in the repo (they're not committed yet). The thumbnail for drafts should either: (a) show a placeholder icon, (b) display the `localImageData` if the user has uploaded a replacement, or (c) attempt to load from the source URL (which may be a third-party site).
- **GitHub API rate limits:** Fetching contents for each file individually is expensive. If there are 30+ scheduled posts, this is 30+ API calls on every page load. Consider caching results in sessionStorage with a short TTL (e.g., 5 minutes) or using the Git Trees API for batch fetching.
- **"Select All" applies to visible (filtered) posts only** — not all posts in the unfiltered list (REQ-LIST-6).

## Verification checklist
- [ ] Post list displays Draft, Scheduled, and Failed posts in chronological order
- [ ] Each row shows: checkbox, thumbnail, date, text preview, category badge, status badge, action button
- [ ] Draft rows show "Approve" action, Scheduled show "View", Failed show "Retry"
- [ ] Status filter works: All / Draft / Scheduled / Failed
- [ ] Category filter works: All / Feature Highlight / Community Demo / Docs & Tutorial
- [ ] Date range filter works
- [ ] Post count updates when filters change
- [ ] Checkbox selection works; "Select All" toggles all visible posts
- [ ] Batch action bar appears when posts are selected
- [ ] Clicking a row (outside checkbox/action) navigates to detail view
- [ ] Failed posts have visually distinct styling
- [ ] Loading spinner shown while fetching from GitHub
