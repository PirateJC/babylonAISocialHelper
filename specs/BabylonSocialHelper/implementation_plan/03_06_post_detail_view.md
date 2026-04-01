# Task 3.6: Post Detail View with Generic Preview

## Goal
Implement the individual post detail view that displays all post fields, a generic social media preview card, and navigation. This view serves as the read-only display for Scheduled posts and the base for the editable Draft view.

## Requirements addressed
REQ-DETAIL-1, REQ-DETAIL-2, REQ-DETAIL-3, REQ-DETAIL-4, REQ-DETAIL-5, REQ-DETAIL-6

## Background
The post detail view shows the full content of a single post: text, image, link, metadata, hashtags, and a generic preview of how the post will look when published. The view adapts based on the post's status:

- **Draft:** Editable fields (handled in Task 3.7), plus Approve and Delete buttons.
- **Scheduled:** All fields are read-only (REQ-DETAIL-6).
- **Failed:** Shows per-platform error details (handled in Task 3.12).

This task implements the shared layout, the read-only display, the generic preview card, and the navigation breadcrumb.

This task depends on:
- Task 3.1 (web app scaffold — PostDetail placeholder)
- Task 3.4 (storage service for loading drafts)
- Task 3.5 (post list — for navigation context and github-api.ts for fetching repo posts)

## Files to modify/create

- `webapp/src/components/PostDetail.tsx` — Full post detail implementation
- `webapp/src/components/PostPreview.tsx` — Generic social media preview card

## Implementation details

### 1. Update `webapp/src/components/PostDetail.tsx`

**Data loading:**
The component reads `:id` from the URL params. It needs to find the post from one of three sources:
1. Check localStorage drafts for a post with this ID.
2. Check the fetched scheduled posts (from GitHub API).
3. Check the fetched failed posts (from GitHub API).

Consider receiving the post data via navigation state (from the list view) to avoid redundant API calls. Fall back to fetching directly if navigation state is not available (e.g., direct URL access).

**Layout (two-column on desktop):**

**Left column — Post content:**
- **Breadcrumb:** "Posts > {post.id}" with the post ID, category badge, and status badge (REQ-DETAIL-4). "Posts" links back to `#/posts`.
- **Post body text:** Displayed in full (not truncated).
- **Link:** Clickable link showing the URL and type badge.
- **Screenshot image:** Full-size display. For drafts, show the `localImageData` if available; for repo posts, show the image from the raw GitHub URL.
- **Hashtags section:** Display all standard hashtags as pill/tags. Show a note: "Hashtags are auto-appended on X & LinkedIn and skipped on Bluesky." (REQ-DETAIL-1).
- **Metadata section:** Display as read-only tags: topic, feature area, post format, emoji usage (yes/no), day index.

**Right column — Preview:**
- **Generic preview card** (`<PostPreview>`) — See section 2 below.

**Action buttons (bottom):**
- If Draft: "Approve" and "Delete" buttons (REQ-DETAIL-5). Approve is wired in Task 3.8, Delete in Task 3.10.
- If Scheduled: No action buttons (read-only).
- If Failed: "Retry Posting", "Edit & Reschedule", "Delete" buttons (handled in Task 3.12).

### 2. Create `webapp/src/components/PostPreview.tsx`

A generic social media preview card that shows how the post will appear when published:

**Layout:**
- **Header:** Babylon.js avatar (a small circular image — use the Babylon.js logo or a placeholder) and account name "Babylon.js".
- **Body text:** The full post text.
- **Image:** The screenshot image.
- **Link card:** A simplified card showing the domain name extracted from the link URL and the link title.
- **Hashtags:** Displayed below the body text (representing how they'd appear on X/LinkedIn).
- **Engagement placeholders:** Row of placeholder icons (Reply, Repost, Like, Views) with zero counts — just to make it look like a real social post.

**Note below the preview:** "This is a generic preview. Platform-specific previews (X, LinkedIn, Bluesky) are planned for a future release." (REQ-DETAIL-3).

The preview is the same for all statuses — it's a visual representation of the post content.

### 3. Responsive layout

On desktop (>1024px): Two-column layout — content on the left, preview on the right.
On mobile/tablet (<1024px): Single column — content first, then preview below.

## Testing suggestions
- Navigate to a Draft post detail view — verify all fields are displayed.
- Navigate to a Scheduled post detail view — verify all fields are read-only and no edit controls are shown.
- Verify the breadcrumb links back to the post list.
- Verify the generic preview shows the post text, image, link card, and hashtags.
- Verify the screenshot image loads correctly for both draft posts (from localStorage or placeholder) and repo posts (from GitHub raw URL).
- Verify the link is clickable and opens in a new tab.
- Verify metadata tags display correctly.
- Test direct URL access (navigate directly to `#/posts/post-001`) — verify the post loads correctly.

## Gotchas
- **Loading post data from URL:** If the user navigates directly to `#/posts/post-001`, there may be no navigation state. The component needs to load the post by fetching from localStorage and/or the GitHub API. Consider a shared data context or caching layer.
- **Image display for drafts:** Draft posts have images in the Phase 1 `media/` output directory (local to the user's machine). These are NOT accessible via the web. Options: (a) show a placeholder until the user uploads a replacement, (b) try to load from the `media.sourceUrl` (the original webpage the screenshot was taken from — but this won't be the actual screenshot), or (c) require the user to import images separately. The simplest approach: show a placeholder for drafts, show the repo image for scheduled/failed.
- **Domain extraction from URL:** For the link card in the preview, extract the domain from the link URL using `new URL(url).hostname`. Handle invalid URLs gracefully.
- **Hashtag display note:** The note about hashtags being skipped on Bluesky is important context for the reviewer. Make it prominent but not intrusive.

## Verification checklist
- [ ] PostDetail displays full post text, image, link, hashtags, and metadata
- [ ] Breadcrumb shows "Posts > {id}" with category and status badges
- [ ] Breadcrumb "Posts" link navigates back to the list
- [ ] Generic preview card shows avatar, name, text, image, link card, hashtags, engagement placeholders
- [ ] Note about generic preview (platform-specific is future) is displayed
- [ ] Draft posts show Approve and Delete action buttons
- [ ] Scheduled posts are fully read-only (no edit controls, no action buttons)
- [ ] Link is clickable and opens in a new tab
- [ ] Image loads correctly for repo posts (via GitHub raw URL)
- [ ] Direct URL navigation works (post loads without coming from the list)
