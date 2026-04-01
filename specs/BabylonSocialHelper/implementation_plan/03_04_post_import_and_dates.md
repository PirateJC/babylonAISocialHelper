# Task 3.4: Post Import and Date Assignment

## Goal
Implement the JSON import flow: drag-drop/file picker for `posts.json`, schema validation, automatic date assignment based on the last scheduled date in the repo, storage in localStorage, and the import summary screen.

## Requirements addressed
REQ-IMPORT-1, REQ-IMPORT-2, REQ-IMPORT-3, REQ-IMPORT-4, REQ-IMPORT-5, REQ-IMPORT-6, REQ-IMPORT-7, REQ-IMPORT-8, REQ-IMPORT-9, REQ-SCHEMA-1

## Background
The Babylon.js Social Media Helper's Phase 1 skill generates a `posts.json` file containing N days of social media posts. The web app's import flow reads this file, validates it against the JSON schema, assigns dates to each post, and stores them as Draft posts in localStorage.

**Date assignment logic:**
1. Query the GitHub repo's `scheduled/` directory to find all existing scheduled post files (named `YYYY-MM-DD.json`).
2. Find the latest date among those files.
3. Assign the first imported post to the next calendar day after that latest date.
4. Assign subsequent posts sequentially, one per day, 7 days a week.
5. If an assigned date already has a file in `scheduled/`, skip it and use the next available date.

**Import replaces existing drafts:** Re-importing a new JSON file clears all existing draft data from localStorage.

This task depends on:
- Task 3.1 (web app scaffold — ImportPanel placeholder)
- Task 3.3 (authentication — token for GitHub API calls)
- Task 1.2 (schema finalization — corrected posts.schema.json)

## Files to modify/create

- `webapp/src/components/ImportPanel.tsx` — Full import UI with drag-drop and file picker
- `webapp/src/components/ImportSummary.tsx` — Import results display
- `webapp/src/services/github-api.ts` — GitHub API wrapper (initial: read directory contents)
- `webapp/src/services/storage.ts` — localStorage management for drafts
- `webapp/src/utils/schema-validate.ts` — JSON Schema validation using ajv
- `webapp/src/utils/date-assign.ts` — Date assignment logic

## Implementation details

### 1. Create `webapp/src/services/github-api.ts`

Export functions for interacting with the GitHub API. For this task, implement:

**`listScheduledPosts(token: string): Promise<string[]>`**
- Call `GET /repos/{owner}/{repo}/contents/scheduled/` with `Authorization: Bearer {token}`.
- Parse the response (an array of file objects). Extract file names (e.g., `2026-04-17.json`).
- Return an array of date strings extracted from filenames (e.g., `["2026-04-17", "2026-04-18"]`).
- If the directory is empty or doesn't exist (404), return an empty array.

Define constants for `REPO_OWNER` and `REPO_NAME` (e.g., `BabylonJS` and `babylonAISocialHelper` — make these configurable).

### 2. Create `webapp/src/utils/date-assign.ts`

Export a function **`assignDates(posts: Post[], existingScheduledDates: string[]): Post[]`**:
1. Create a Set of existing scheduled dates for O(1) lookup.
2. Find the latest date in the Set (or use today's date if the Set is empty).
3. Starting from the day after the latest date:
   a. For each post, find the next available date that is NOT in the existing scheduled dates Set.
   b. Assign that date as the post's `assignedDate`.
   c. Add the date to the Set (to avoid assigning the same date to two imported posts).
4. Return the updated posts array.

Date arithmetic should use standard JavaScript `Date` operations. Be careful with timezone handling — always work with date strings in `YYYY-MM-DD` format and avoid timezone conversions.

### 3. Create `webapp/src/utils/schema-validate.ts`

Export a function **`validatePostsJson(data: unknown): { valid: boolean; errors: string[] }`**:
1. Load the JSON schema. The schema can be embedded directly in the code (copy from `schemas/posts.schema.json`) or fetched at runtime. Embedding is simpler and avoids an async fetch — use this approach.
2. Use `ajv` with `ajv-formats` to compile and validate.
3. If validation fails, return the array of error messages (formatted as human-readable strings with JSON paths).
4. If validation succeeds, return `{ valid: true, errors: [] }`.

### 4. Create `webapp/src/services/storage.ts`

Export functions for managing drafts in localStorage:

**`saveDrafts(posts: Post[]): void`**
- Serialize the posts array (with assigned dates and `status: "draft"`) to JSON.
- Store under the key `"babylonsocial:drafts"` in localStorage.
- Include an `importedAt` timestamp.

**`loadDrafts(): Post[]`**
- Read from `"babylonsocial:drafts"` in localStorage.
- Parse and return the posts array. If the key doesn't exist, return an empty array.

**`clearDrafts(): void`**
- Remove the `"babylonsocial:drafts"` key from localStorage.

**`removeDraft(postId: string): void`**
- Load drafts, filter out the post with the given ID, save back.

**`updateDraft(post: Post): void`**
- Load drafts, find and replace the post with the matching ID, save back.

### 5. Update `webapp/src/components/ImportPanel.tsx`

Replace the placeholder with the full import UI:

**Layout:**
- A drag-drop zone (large dashed border area) with text "Drag & drop your posts.json file here"
- A "Choose File" button that opens a file picker (accept `.json` only)
- Instructions text explaining the import process

**Behavior:**
1. On file drop or selection, read the file using `FileReader`.
2. Parse the JSON. If parsing fails, show an error: "Invalid JSON file."
3. Validate against the schema using `validatePostsJson()`. If validation fails, show detailed error messages.
4. Fetch existing scheduled dates from the repo: call `listScheduledPosts(token)`.
5. Assign dates: call `assignDates(posts, scheduledDates)`.
6. Set all posts' status to `"draft"`.
7. Clear existing drafts and save the new ones: call `clearDrafts()` then `saveDrafts(posts)`.
8. Navigate to the ImportSummary view (or display it inline).

**Error display:**
- JSON parse errors: "The selected file is not valid JSON."
- Schema validation errors: Show each error with its path (e.g., "posts[3].link.type: must be one of: playground, demo, docs, ...")
- File type errors: "Please select a .json file."

### 6. Create `webapp/src/components/ImportSummary.tsx`

Display after a successful import:

- **Total posts:** N
- **Category breakdown:**
  - Feature Highlights: X (Y%)
  - Community Demos: X (Y%)
  - Docs & Tutorials: X (Y%)
- **Date range:** First assigned date → Last assigned date
- **Context:** Last existing scheduled date (to show continuity)
- **Buttons:**
  - "Review Posts" → navigate to `#/posts`
  - "Re-import" → navigate back to the import screen

## Testing suggestions
- Import a valid `posts.json` with 10 posts. Verify dates are assigned sequentially starting from the day after the last scheduled date.
- Import when there are no scheduled posts — verify dates start from tomorrow.
- Import when some dates are already occupied — verify those dates are skipped.
- Import an invalid JSON file (syntax error) — verify the error message.
- Import a JSON file that fails schema validation — verify specific errors are shown.
- Re-import a new file — verify existing drafts are replaced.
- Verify drafts persist across page refreshes (localStorage).
- Verify the import summary shows correct category counts and date range.

## Gotchas
- **GitHub API 404 for empty directory:** If `scheduled/` is empty, GitHub's contents API may return a 404 instead of an empty array. Handle both cases.
- **Date string parsing:** JavaScript's `new Date("2026-04-17")` may parse as UTC midnight, which could shift to the previous day in negative-offset timezones. Always work with date strings directly (split on `-`, manipulate components) or use UTC methods.
- **localStorage size limit:** localStorage typically has a 5–10MB limit per origin. A batch of 90 posts with metadata is well under this (~500KB). However, if posts include base64-encoded image data (from image replacement in Task 3.7), the size could grow. Monitor this.
- **Schema embedding:** Embedding the JSON schema in the TypeScript code (as a const object) avoids an async fetch and simplifies the build. But it means the schema must be manually kept in sync with `schemas/posts.schema.json`. Consider a build step that copies the schema into the app.
- **File drag-drop:** Use `event.preventDefault()` on the `dragover` event for the drop zone, otherwise the browser will navigate to the dropped file instead of handling it.

## Verification checklist
- [ ] ImportPanel has drag-drop zone and file picker button
- [ ] Only `.json` files are accepted
- [ ] Invalid JSON shows a parse error
- [ ] Schema validation errors show specific field paths
- [ ] Dates are assigned sequentially from the day after the last scheduled date
- [ ] Occupied dates are skipped
- [ ] Drafts are stored in localStorage with `status: "draft"`
- [ ] Re-import replaces existing drafts
- [ ] Import summary shows total posts, category breakdown, and date range
- [ ] "Review Posts" button navigates to `#/posts`
- [ ] "Re-import" button returns to the import screen
- [ ] GitHub API call to read `scheduled/` uses the authenticated user's token
