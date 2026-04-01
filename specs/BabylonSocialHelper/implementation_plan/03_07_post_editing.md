# Task 3.7: Post Editing with Live Grapheme Counter

## Goal
Implement the inline editing experience for Draft posts: editable text, link, date, and image fields, with a live grapheme counter that tracks the 300-grapheme limit, and save/cancel functionality.

## Requirements addressed
REQ-EDIT-1, REQ-EDIT-2, REQ-EDIT-3, REQ-EDIT-4, REQ-EDIT-5, REQ-EDIT-6, REQ-EDIT-7, REQ-EDIT-8

## Background
Draft posts in the Babylon.js Social Media Helper can be edited before approval. The body text + link URL must fit within 300 graphemes (Bluesky's limit). The editor displays a live grapheme counter that updates as the user types and turns red when the limit is exceeded.

**Editable fields (Draft posts only):**
- Post body text (textarea)
- Link URL (text input)
- Link type (select dropdown)
- Scheduled date (date picker)
- Screenshot image (file upload to replace)

**Read-only fields (all statuses):**
- Hashtags (system-managed, auto-appended at post-time)
- Metadata tags (topic, feature area, post format, emoji flag)

**Scheduled posts are locked** — all fields are read-only (REQ-EDIT-2). The edit controls are only rendered for Draft posts.

This task depends on:
- Task 3.6 (post detail view — layout and data loading)
- Task 3.4 (storage service — for saving edits to localStorage)

## Files to modify/create

- `webapp/src/components/PostEditor.tsx` — Editable form fields (used within PostDetail for drafts)
- `webapp/src/components/GraphemeCounter.tsx` — Live grapheme counter component
- `webapp/src/utils/grapheme-count.ts` — Intl.Segmenter-based grapheme counting utility

## Implementation details

### 1. Create `webapp/src/utils/grapheme-count.ts`

Export a function **`countGraphemes(text: string): number`**:
- Use the `Intl.Segmenter` API with `granularity: "grapheme"` to segment the text.
- Count the segments and return the total.
- `Intl.Segmenter` correctly handles multi-codepoint characters like emoji (e.g., 👨‍👩‍👧‍👦 is 1 grapheme but 11 code points).

Export a helper **`countPostGraphemes(bodyText: string, linkUrl: string): number`**:
- Computes the grapheme count of the combined string: `bodyText + " " + linkUrl`.
- This matches the 300-grapheme validation logic (body text + link URL, NOT including hashtags).

### 2. Create `webapp/src/components/GraphemeCounter.tsx`

A display component that shows the current grapheme count and the 300-grapheme limit:

**Props:**
- `bodyText: string`
- `linkUrl: string`

**Rendering:**
- Compute `current = countPostGraphemes(bodyText, linkUrl)`.
- Display: `"{current} / 300 graphemes"`
- **Styling:**
  - Normal (under 300): Default text color.
  - Warning (280-300): Orange/yellow text.
  - Over limit (>300): Red text, bold (REQ-EDIT-5).

### 3. Create `webapp/src/components/PostEditor.tsx`

The editor form rendered inside `PostDetail` when the post is a Draft.

**Props:**
- `post: Post` — The draft post being edited.
- `onSave: (updatedPost: Post) => void` — Called when user saves changes.
- `onCancel: () => void` — Called when user cancels.

**Form fields:**

**a) Post body text (textarea):**
- Large textarea with the current post text.
- On change, update local state and re-render the GraphemeCounter.
- Placeholder: "Write your post text here..."

**b) Link URL (text input):**
- Input field with the current link URL.
- On change, update local state and re-render the GraphemeCounter (link URL contributes to grapheme count).

**c) Link type (select dropdown):**
- Dropdown with options: playground, demo, docs, forum, blog, community-project, youtube.
- Pre-selected to the current value.

**d) Scheduled date (date picker):**
- Date input pre-filled with the current `assignedDate`.
- The user can change the scheduled date.

**e) Screenshot image (file upload):**
- A file input that accepts only PNG files.
- When a file is selected, read it as a base64 data URL using `FileReader`.
- Display a preview of the selected image.
- Store the base64 data in the post's `localImageData` field (saved to localStorage).

**f) Hashtags (read-only, REQ-EDIT-7):**
- Display the standard hashtags as read-only pills/tags.
- Display conditional hashtags if present.
- Note: "Hashtags are managed by the system and appended per-platform at post-time."

**g) Metadata (read-only, REQ-EDIT-8):**
- Display metadata fields as read-only tags: topic, feature area, post format, emoji usage.

**Buttons:**
- **"Save Changes"** — Validate the form, then call `onSave(updatedPost)`. The parent saves to localStorage via `updateDraft()`.
- **"Cancel"** — Discard changes and call `onCancel()`.

**Save validation:**
- Before saving, re-validate the grapheme count. If over 300, show a warning but allow saving (the approval step will block over-limit posts).

### 4. Integration with PostDetail

In `PostDetail.tsx`, conditionally render `<PostEditor>` for Draft posts and read-only display for Scheduled posts:
- If `post.status === "draft"`, render the PostEditor form.
- If `post.status === "scheduled"`, render all fields as plain text (no inputs).
- The `onSave` handler calls `updateDraft(updatedPost)` from the storage service and shows a success message.
- The `onCancel` handler reverts to the original post data.

## Testing suggestions
- Edit a draft post's text and verify the grapheme counter updates in real time.
- Type text that exceeds 300 graphemes — verify the counter turns red.
- Edit the link URL — verify the grapheme counter reflects the new URL length.
- Change the link type — verify the dropdown updates.
- Change the scheduled date — verify the new date is saved.
- Upload a new screenshot image — verify the preview shows and the base64 data is stored.
- Click "Save Changes" — verify the updated post is stored in localStorage.
- Click "Cancel" — verify changes are discarded.
- Navigate to a Scheduled post — verify all fields are read-only (no edit controls).
- **Grapheme counter edge cases:** Test with emoji (e.g., 🤯🤯🤯 = 3 graphemes), combined emoji (e.g., 👨‍👩‍👧‍👦 = 1 grapheme), and non-Latin characters (e.g., Chinese characters = 1 grapheme each).

## Gotchas
- **`Intl.Segmenter` browser support:** Available in all modern browsers (Chrome 87+, Firefox 104+, Safari 15.4+). No polyfill needed for the target audience (developers using modern browsers).
- **Grapheme counting accuracy:** The 300-grapheme limit is specifically for Bluesky. Bluesky uses Unicode grapheme clusters. `Intl.Segmenter` with `granularity: "grapheme"` provides the correct count.
- **Base64 image storage in localStorage:** A 1280×720 PNG screenshot is typically 100–500KB. As base64, this becomes ~130–660KB. For 90 posts with replaced images, this could reach 60MB — well over localStorage limits. In practice, most users will only replace a few images. Add a warning if localStorage is getting full.
- **Form state management:** Use local component state (useState) for the form fields. Don't update localStorage on every keystroke — only on "Save Changes."
- **Date validation:** The date picker should not allow selecting dates that are already occupied by scheduled posts. Consider adding a warning if the selected date conflicts.

## Verification checklist
- [ ] `webapp/src/utils/grapheme-count.ts` correctly counts graphemes using Intl.Segmenter
- [ ] GraphemeCounter displays "{current} / 300 graphemes" and updates live
- [ ] Counter turns red when over 300 graphemes
- [ ] PostEditor renders editable textarea, link input, link type select, date picker, image upload
- [ ] Hashtags are displayed as read-only
- [ ] Metadata fields are displayed as read-only
- [ ] "Save Changes" persists edits to localStorage
- [ ] "Cancel" discards changes
- [ ] Image upload reads PNG, shows preview, stores as base64
- [ ] Scheduled posts show read-only fields (no edit controls)
- [ ] Grapheme counter correctly handles multi-codepoint emoji
