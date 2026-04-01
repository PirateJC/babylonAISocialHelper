# Task 3.11: Status Tracking

## Goal
Implement the status derivation logic that determines each post's status (Draft, Scheduled, or Failed) by scanning localStorage and the repo's `scheduled/` and `failed/` directories, and ensure status badges are visually distinct throughout the UI.

## Requirements addressed
REQ-STATUS-1, REQ-STATUS-2, REQ-STATUS-3, REQ-STATUS-4, REQ-STATUS-5, REQ-STATUS-6

## Background
The Babylon.js Social Media Helper uses three post statuses, determined entirely by where a post's data lives:

| Status | Storage Location | Badge Color |
|--------|-----------------|-------------|
| **Draft** | Browser localStorage only | Gray |
| **Scheduled** | `scheduled/{YYYY-MM-DD}.json` in the repo | Green |
| **Failed** | `failed/{YYYY-MM-DD}.json` in the repo | Red |

There is no "Posted" status — successfully posted content is deleted from the repo entirely (REQ-CLEANUP-1). Status is derived at runtime by checking the data sources, not stored as a field in the JSON.

This task ensures the status derivation logic is robust, handles edge cases (e.g., a draft that has also been approved), and that status badges render consistently across the list view and detail view.

This task depends on:
- Task 3.4 (storage service and github-api.ts)
- Task 3.5 (post list — where status is displayed)
- Task 3.6 (post detail — where status is displayed)

## Files to modify/create

- `webapp/src/components/StatusBadge.tsx` — Reusable status badge component
- `webapp/src/components/CategoryBadge.tsx` — Reusable category badge component
- `webapp/src/components/PostList.tsx` — Ensure status derivation is correct during data merge

## Implementation details

### 1. Create `webapp/src/components/StatusBadge.tsx`

A small, reusable component that renders a status badge:

**Props:**
- `status: "draft" | "scheduled" | "failed"`

**Rendering:**
- **Draft:** Gray background, dark text, label "Draft"
- **Scheduled:** Green background, white text, label "Scheduled"
- **Failed:** Red background, white text, label "Failed"

Use a consistent pill/badge shape (rounded corners, small padding). Ensure the colors are accessible (sufficient contrast ratio).

### 2. Create `webapp/src/components/CategoryBadge.tsx`

A reusable component for category badges:

**Props:**
- `category: "feature-highlight" | "community-demo" | "docs-tutorial"`

**Rendering:**
- **Feature Highlight:** Blue badge, label "Feature"
- **Community Demo:** Purple badge, label "Community"
- **Docs & Tutorial:** Orange/amber badge, label "Docs"

### 3. Status derivation logic in PostList.tsx

The post list merges data from three sources. The status derivation logic should:

1. **Load drafts from localStorage** → set `status: "draft"` on each.
2. **Fetch scheduled posts from repo** → set `status: "scheduled"` on each.
3. **Fetch failed posts from repo** → set `status: "failed"` on each.
4. **Handle duplicates:** A post might exist in both localStorage (as a draft) and the repo (as scheduled — if it was just approved). The repo status takes precedence:
   - If a post ID exists in both localStorage and `scheduled/`, treat it as Scheduled (remove from localStorage if needed).
   - If a post ID exists in both localStorage and `failed/`, treat it as Failed (remove from localStorage).
   This handles the case where approval was partially completed (post committed to repo but localStorage wasn't cleaned up due to a browser crash).

5. **Merge and deduplicate:** Create a Map keyed by post ID. Scheduled and Failed posts override Drafts.

6. **Sort chronologically** by `assignedDate`.

### 4. Refresh logic

The post list should refresh its data:
- On initial mount (page load or navigation to the list).
- After an approval (single or batch) — to reflect the new Scheduled status.
- After a deletion — to reflect the removed post.
- On manual refresh (consider adding a "Refresh" button).

Avoid automatic polling (it would waste API calls). The user triggers refreshes through their actions.

### 5. Status-dependent UI behaviors

Ensure the following behaviors are correctly implemented across all components that use status:

| Behavior | Draft | Scheduled | Failed |
|----------|-------|-----------|--------|
| Editable fields | Yes | No (read-only) | No (read-only) |
| Approve button | Shown | Hidden | Hidden |
| Delete button | Shown | Shown | Shown |
| Retry button | Hidden | Hidden | Shown |
| Row styling | Default | Default | Red/highlighted |
| Checkbox selectable | Yes | Yes | Yes |
| Action button | Approve | View | Retry |

### 6. Replace placeholder badges

Go through all components that currently render status or category text and replace them with the `<StatusBadge>` and `<CategoryBadge>` components for visual consistency.

## Testing suggestions
- Import posts, verify they appear with "Draft" gray badges.
- Approve a post, refresh the list, verify it now shows "Scheduled" green badge.
- Manually create a `failed/` post in the repo, refresh the list, verify "Failed" red badge.
- Test the duplicate resolution: create a scenario where a post exists in both localStorage and `scheduled/` — verify the Scheduled status wins.
- Filter the list by status — verify correct filtering with the derived statuses.
- Verify badge colors are consistent between the list view and detail view.
- Verify badges have sufficient color contrast for accessibility.

## Gotchas
- **Duplicate resolution timing:** If a user approves a post but the browser crashes before localStorage is cleaned up, the post exists in both places. On next load, the merge logic should detect this and clean up localStorage.
- **Post identification:** Posts are identified by their `id` field (e.g., `post-001`). However, scheduled and failed posts are also identified by their filename (date). Two different posts could theoretically have the same `id` if the user imports different batches. The `id` + `assignedDate` combination should be unique.
- **No "Posted" status:** A post that was successfully published is completely gone from the system. It won't appear in any list. This is by design (REQ-STATUS-1). The user checks the actual social media accounts or the GitHub Actions logs to confirm posting.
- **Stale data:** The repo data is fetched once on page load. If the GitHub Actions workflow runs while the user has the page open (deleting a scheduled post or moving one to failed), the page won't reflect the change until refresh.

## Verification checklist
- [ ] StatusBadge renders correct colors: Draft (gray), Scheduled (green), Failed (red)
- [ ] CategoryBadge renders correct colors for each category
- [ ] Status is derived from data location (localStorage = Draft, scheduled/ = Scheduled, failed/ = Failed)
- [ ] No "Posted" status exists — successfully posted content is absent from all views
- [ ] Duplicate posts (same ID in localStorage and repo) resolve to the repo status
- [ ] Status-dependent behaviors are correct (editable, buttons, styling)
- [ ] Failed post rows have visually distinct styling in the list
- [ ] Badges are used consistently across list view and detail view
- [ ] List refreshes after approval, deletion, and retry actions
