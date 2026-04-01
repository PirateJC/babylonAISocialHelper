# Babylon.js Social Media Helper — Requirements Document

> **Version:** 1.0  
> **Last updated:** 2026-07-14  
> **Source:** [goals.md](./goals.md) · [mocks.html](./mocks.html) · [SKILL.md](../../skills/content-generation/SKILL.md) · [posts.schema.json](../../schemas/posts.schema.json)

---

## Table of Contents

- [1. AUTH — Authentication & Authorization](#1-auth--authentication--authorization)
- [2. IMPORT — JSON Import & Date Assignment](#2-import--json-import--date-assignment)
- [3. LIST — Post List View & Filtering](#3-list--post-list-view--filtering)
- [4. DETAIL — Individual Post View / Preview](#4-detail--individual-post-view--preview)
- [5. EDIT — Post Editing](#5-edit--post-editing)
- [6. APPROVE — Individual & Batch Approval](#6-approve--individual--batch-approval)
- [7. DELETE — Post Deletion](#7-delete--post-deletion)
- [8. STATUS — Status Tracking](#8-status--status-tracking)
- [9. SCHEDULE — GitHub Actions Workflow & Cron](#9-schedule--github-actions-workflow--cron)
- [10. POST-X — X / Twitter Posting](#10-post-x--x--twitter-posting)
- [11. POST-LI — LinkedIn Posting](#11-post-li--linkedin-posting)
- [12. POST-BS — Bluesky Posting](#12-post-bs--bluesky-posting)
- [13. RETRY — Retry Logic](#13-retry--retry-logic)
- [14. CLEANUP — Post-Publication Cleanup](#14-cleanup--post-publication-cleanup)
- [15. SKILL — Phase 1 Content Generation Skill](#15-skill--phase-1-content-generation-skill)
- [16. SCHEMA — JSON Schema & Validation](#16-schema--json-schema--validation)
- [Out of Scope](#out-of-scope)
- [Acceptance Criteria Summary](#acceptance-criteria-summary)

---

## Conventions

- **MUST / MUST NOT** — absolute requirement / prohibition (RFC 2119)
- **SHOULD / SHOULD NOT** — recommended but not mandatory
- **MAY** — truly optional
- Mock references use the format **(Mock N)** and correspond to sections in `mocks.html`.

---

## 1. AUTH — Authentication & Authorization

| ID | Requirement |
|----|-------------|
| **REQ-AUTH-1** | The web app MUST require GitHub OAuth authentication before granting access to any functionality. Unauthenticated users MUST see only the login screen. **(Mock 1)** |
| **REQ-AUTH-2** | The login screen MUST display a "Sign in with GitHub" button and a note indicating that BabylonJS core team membership is required. **(Mock 1)** |
| **REQ-AUTH-3** | Authentication MUST use the GitHub OAuth Web Flow with a lightweight serverless proxy (e.g., Cloudflare Worker, AWS Lambda, or Azure Function) that performs the authorization-code-to-token exchange. The proxy MUST NOT log or persist tokens. |
| **REQ-AUTH-4** | After successful OAuth, the app MUST verify that the authenticated user is a member of the GitHub team `BabylonJS/core-team-microsoft`. |
| **REQ-AUTH-5** | If the user is authenticated but NOT a member of `BabylonJS/core-team-microsoft`, the app MUST display an Access Denied screen with a message identifying the required team and a "Sign out" button. **(Mock 2)** |
| **REQ-AUTH-6** | The OAuth token MUST be stored in browser memory or sessionStorage for the duration of the session. The token MUST NOT be committed to the repo or logged to any console output in production. |
| **REQ-AUTH-7** | The app MUST provide a visible sign-out action in the navbar that clears the stored token and returns to the login screen. |
| **REQ-AUTH-8** | All GitHub API calls (reading repo contents, committing files) MUST use the authenticated user's OAuth token. |

---

## 2. IMPORT — JSON Import & Date Assignment

| ID | Requirement |
|----|-------------|
| **REQ-IMPORT-1** | The app MUST provide a JSON import screen with a drag-and-drop zone and a "Choose File" button for selecting a `posts.json` file from the local filesystem. **(Mock 3)** |
| **REQ-IMPORT-2** | The app MUST accept only `.json` files. Files that do not parse as valid JSON MUST be rejected with a user-visible error message. |
| **REQ-IMPORT-3** | Imported JSON MUST be validated against the `posts.schema.json` schema. Posts that fail validation MUST be flagged with specific error details. See **REQ-SCHEMA-1**. |
| **REQ-IMPORT-4** | On import, the app MUST query the repo's `scheduled/` directory via the GitHub API to determine the last scheduled date. The first imported post MUST be assigned the next calendar day after that date. Subsequent posts MUST be assigned sequentially, one per day, seven days a week. |
| **REQ-IMPORT-5** | If a date already has a file in `scheduled/`, the app MUST skip that date and assign the next available day. |
| **REQ-IMPORT-6** | After successful import, the app MUST display an import summary showing: total posts, category breakdown (Feature Highlights, Community Demos, Docs & Tutorials), and the assigned date range (first date → last date, plus the last existing scheduled date for context). **(Mock 4)** |
| **REQ-IMPORT-7** | Re-importing a new JSON file MUST replace all existing drafts — localStorage MUST be cleared of prior draft data and the new file's posts loaded in their place. |
| **REQ-IMPORT-8** | Imported posts MUST be stored as **Draft** status in browser localStorage only. They MUST NOT be committed to the repo until explicitly approved. |
| **REQ-IMPORT-9** | The import summary MUST provide a "Review Posts" button that navigates to the post list view and a "Re-import" button that returns to the import screen. **(Mock 4)** |

---

## 3. LIST — Post List View & Filtering

| ID | Requirement |
|----|-------------|
| **REQ-LIST-1** | The post list view MUST display all posts the user has visibility into: Draft posts (from localStorage), Scheduled posts (from `scheduled/` in the repo), and Failed posts (from `failed/` in the repo), in chronological order by assigned date. **(Mock 5, Mock 6)** |
| **REQ-LIST-2** | Each row in the post list MUST display: a checkbox for selection, a screenshot thumbnail, the scheduled date, a truncated post-text preview, a category badge (Feature / Community / Docs), a status badge (Draft / Scheduled / Failed), and an action button. **(Mock 5)** |
| **REQ-LIST-3** | Draft posts MUST show an "Approve" action button. Scheduled posts MUST show an "Edit" action button (which navigates to the read-only detail view). Failed posts MUST show a "Retry" action button. **(Mock 6)** |
| **REQ-LIST-4** | The list MUST support filtering by: status (All / Draft / Scheduled / Failed), category (All / Feature Highlight / Community Demo / Docs & Tutorial), and date range (start date, end date). **(Mock 5)** |
| **REQ-LIST-5** | The list MUST display a count of posts matching the current filters (e.g., "30 posts"). **(Mock 5)** |
| **REQ-LIST-6** | Each post row MUST include a checkbox. A "Select All" checkbox in the header row MUST toggle selection of all currently visible (filtered) posts. **(Mock 5)** |
| **REQ-LIST-7** | When one or more posts are selected, a batch action bar MUST appear showing the count of selected posts and buttons for "Approve Selected", "Delete Selected", and "Clear Selection". **(Mock 5)** |
| **REQ-LIST-8** | Clicking a post row (outside of the checkbox and action button) MUST navigate to the individual post detail view. |
| **REQ-LIST-9** | Failed post rows SHOULD be visually distinguished (e.g., highlighted background) to draw attention. **(Mock 6)** |
| **REQ-LIST-10** | The navbar MUST include an "Import Posts" button that opens the import flow. **(Mock 5)** |

---

## 4. DETAIL — Individual Post View / Preview

| ID | Requirement |
|----|-------------|
| **REQ-DETAIL-1** | The individual post detail view MUST display the full post text, the screenshot image, the link URL (clickable), category badge, status badge, metadata tags (topic, feature area, post format, emoji usage), and the list of hashtags with a note that hashtags are auto-appended on X & LinkedIn and skipped on Bluesky. **(Mock 7)** |
| **REQ-DETAIL-2** | The detail view MUST include a generic post preview card showing: the Babylon.js avatar and name, post body text, screenshot image, link card (domain + title), hashtags, and placeholder engagement icons (Reply, Repost, Like, Views). **(Mock 7)** |
| **REQ-DETAIL-3** | The preview MUST be generic (not platform-specific). A note MUST indicate that platform-specific previews are planned for a future release. **(Mock 7)** |
| **REQ-DETAIL-4** | A breadcrumb or back-link MUST be provided to return to the post list view. The breadcrumb MUST display the post ID, category badge, and status badge. **(Mock 7)** |
| **REQ-DETAIL-5** | For **Draft** posts, the detail view MUST show editable fields (see EDIT requirements) and "Approve" / "Delete" buttons. **(Mock 7)** |
| **REQ-DETAIL-6** | For **Scheduled** posts, the detail view MUST show all fields as read-only. Editing MUST be disabled. To make changes to a scheduled post, the user MUST delete it and re-approve a new version. |
| **REQ-DETAIL-7** | For **Failed** posts, the detail view MUST show per-platform posting results: for each platform (X, LinkedIn, Bluesky), display success/failure status, and for failures show the error message and retry count. **(Mock 8)** |
| **REQ-DETAIL-8** | For **Failed** posts, the detail view MUST provide "Retry Posting", "Edit & Reschedule", and "Delete" action buttons. **(Mock 8)** |
| **REQ-DETAIL-9** | For **Failed** posts, the detail view SHOULD display an action log showing timestamped events from the posting attempt (upload, post creation, retries, final outcome). **(Mock 8)** |

---

## 5. EDIT — Post Editing

| ID | Requirement |
|----|-------------|
| **REQ-EDIT-1** | Users MUST be able to edit the following fields on a **Draft** post: post body text, link URL, link type (select from: playground, demo, docs, forum, blog, community-project, youtube), scheduled date, and screenshot image. **(Mock 7)** |
| **REQ-EDIT-2** | **Scheduled** posts MUST be locked — all fields MUST be read-only. To change a scheduled post, the user MUST delete it and re-approve a corrected version. See **REQ-DETAIL-6**. |
| **REQ-EDIT-3** | Image replacement MUST be accomplished via a file upload from the local machine. The user picks a new PNG file from their computer. **(Mock 7)** |
| **REQ-EDIT-4** | The post text editor MUST display a live grapheme counter showing the current count of body text + link URL measured in graphemes, against the 300-grapheme limit. **(Mock 7)** |
| **REQ-EDIT-5** | The grapheme counter MUST turn red (visually indicate over-limit) when the combined body text + link URL exceeds 300 graphemes. |
| **REQ-EDIT-6** | Edits to draft posts MUST be saved to localStorage. The edit view MUST provide "Save Changes" and "Cancel" buttons. **(Mock 7)** |
| **REQ-EDIT-7** | The hashtags section MUST be displayed as read-only (standard hashtags are auto-appended per-platform at post-time and MUST NOT be manually edited). **(Mock 7)** |
| **REQ-EDIT-8** | Metadata fields (topic, feature area, post format, emoji flag) MUST be displayed as read-only tags. **(Mock 7)** |

---

## 6. APPROVE — Individual & Batch Approval

| ID | Requirement |
|----|-------------|
| **REQ-APPROVE-1** | Each **Draft** post MUST have an "Approve" button visible in both the list view and the detail view. **(Mock 5, Mock 7)** |
| **REQ-APPROVE-2** | Approving a post MUST commit the post's JSON file and its screenshot PNG to the `scheduled/` directory in the repo via the GitHub API. The JSON file MUST be named `{YYYY-MM-DD}.json` using the post's assigned date. |
| **REQ-APPROVE-3** | Approval MUST be blocked if the post's body text + link URL exceeds 300 graphemes. The app MUST display an error message indicating the post is over the character limit and cannot be approved. |
| **REQ-APPROVE-4** | After successful approval, the post's status MUST change from Draft to Scheduled, and the post MUST be removed from localStorage. |
| **REQ-APPROVE-5** | Users MUST be able to select multiple Draft posts via checkboxes and approve them in batch using the "Approve Selected" button in the batch action bar. **(Mock 5)** |
| **REQ-APPROVE-6** | Batch approval MUST be capped at a maximum of **15 posts** per batch operation. If more than 15 posts are selected, the app MUST display an error asking the user to select 15 or fewer. |
| **REQ-APPROVE-7** | Batch approval MUST commit posts sequentially (one commit per post, not a single bulk commit) and MUST display a progress indicator showing the current post number out of the total (e.g., "Committing 3 of 12…"). |
| **REQ-APPROVE-8** | If a commit fails during batch approval, the app MUST stop the batch, report which post failed, and leave the remaining posts as Drafts. Successfully committed posts up to that point MUST retain their Scheduled status. |
| **REQ-APPROVE-9** | Only **Draft** posts MAY be approved. The "Approve" action MUST NOT appear for Scheduled or Failed posts. |

---

## 7. DELETE — Post Deletion

| ID | Requirement |
|----|-------------|
| **REQ-DELETE-1** | Users MUST be able to delete a post from the detail view via a "Delete" button. **(Mock 7, Mock 8)** |
| **REQ-DELETE-2** | Deleting one or more posts MUST display a confirmation modal before proceeding. The modal MUST state the number of posts being deleted, warn that the action cannot be undone, and clarify that scheduled posts will also be removed from the repo. **(Mock 9)** |
| **REQ-DELETE-3** | Deleting a **Draft** post MUST remove it from localStorage. |
| **REQ-DELETE-4** | Deleting a **Scheduled** post MUST remove the JSON file and its associated screenshot PNG from the `scheduled/` and `media/` directories in the repo via the GitHub API. |
| **REQ-DELETE-5** | Deleting a **Failed** post MUST remove the JSON file from the `failed/` directory and its screenshot from `media/` in the repo via the GitHub API. |
| **REQ-DELETE-6** | Users MUST be able to select multiple posts via checkboxes and delete them in batch using the "Delete Selected" button, subject to the same confirmation modal. **(Mock 5, Mock 9)** |

---

## 8. STATUS — Status Tracking

| ID | Requirement |
|----|-------------|
| **REQ-STATUS-1** | Every post MUST have exactly one of three statuses: **Draft**, **Scheduled**, or **Failed**. There is no "Posted" status — successfully posted content is deleted from the repo. |
| **REQ-STATUS-2** | **Draft** — The post has been imported but not yet approved. It MUST exist only in browser localStorage and MUST NOT be committed to the repo. |
| **REQ-STATUS-3** | **Scheduled** — The post has been approved and committed to the `scheduled/` directory. It is awaiting pickup by the GitHub Actions workflow. |
| **REQ-STATUS-4** | **Failed** — The GitHub Actions workflow attempted to post but one or more platforms failed after all retries. The post has been moved to the `failed/` directory with per-platform error details recorded in the JSON. |
| **REQ-STATUS-5** | The app MUST determine post status by reading directory contents from the repo: files in `scheduled/` are Scheduled, files in `failed/` are Failed. Posts in localStorage that have no corresponding repo file are Drafts. |
| **REQ-STATUS-6** | Status badges MUST be visually distinct: Draft (gray), Scheduled (green), Failed (red). **(Mock 5, Mock 6)** |

---

## 9. SCHEDULE — GitHub Actions Workflow & Cron

| ID | Requirement |
|----|-------------|
| **REQ-SCHEDULE-1** | A GitHub Actions workflow MUST run daily and publish the post scheduled for the current date. The workflow file MUST be located at `.github/workflows/post-daily.yml`. |
| **REQ-SCHEDULE-2** | The workflow MUST be **DST-aware** and always fire at **10:00 AM Pacific Time**, adjusting between PST (UTC-8) and PDT (UTC-7) as appropriate. This MUST be achieved via dual cron triggers (`0 17 * * *` for PDT months and `0 18 * * *` for PST months) or an equivalent timezone-aware mechanism. |
| **REQ-SCHEDULE-3** | The workflow MUST look in the `scheduled/` directory for a JSON file named `{YYYY-MM-DD}.json` matching the current date. |
| **REQ-SCHEDULE-4** | If no post file exists for the current date, the workflow MUST exit cleanly with a success status and no error. |
| **REQ-SCHEDULE-5** | If a post file is found, the workflow MUST attempt to publish to all three platforms: X (Twitter), LinkedIn, and Bluesky. |
| **REQ-SCHEDULE-6** | The workflow MUST upload the screenshot image first, then create the text post with the image attached, on each platform. |
| **REQ-SCHEDULE-7** | All platform credentials MUST be stored as GitHub Secrets (encrypted, never exposed in logs). Required secrets: `X_USERNAME`, `X_PASSWORD`, `X_EMAIL`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_REFRESH_TOKEN`, `LINKEDIN_ORGANIZATION_ID`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`. |
| **REQ-SCHEDULE-8** | The workflow MUST commit all file changes (deletions on success, moves on failure) back to the repo at the end of the run. |

---

## 10. POST-X — X / Twitter Posting

| ID | Requirement |
|----|-------------|
| **REQ-POST-X-1** | The posting script MUST use the `agent-twitter-client` (goat-x) library to post to X. This library uses X's internal web API and does not require a paid API subscription. |
| **REQ-POST-X-2** | The script MUST authenticate using the X username, password, and email stored in GitHub Secrets (`X_USERNAME`, `X_PASSWORD`, `X_EMAIL`). |
| **REQ-POST-X-3** | The script MUST upload the screenshot image and create a tweet with the post body text, the link, all standard hashtags, and any conditional hashtags appended. |
| **REQ-POST-X-4** | X posting MUST degrade gracefully — if X posting fails after all retries, LinkedIn and Bluesky posting MUST continue unaffected. See **REQ-RETRY-1**. |
| **REQ-POST-X-5** | On success, the script MUST record the tweet ID or URL in the post's platform results. On failure, the script MUST record the error message and retry count. |

---

## 11. POST-LI — LinkedIn Posting

| ID | Requirement |
|----|-------------|
| **REQ-POST-LI-1** | The posting script MUST use the LinkedIn Marketing API (Posts API + Images API) to post to the Babylon.js company page (org ID `90520614`). |
| **REQ-POST-LI-2** | The script MUST authenticate using the OAuth 2.0 access token stored in `LINKEDIN_ACCESS_TOKEN`. |
| **REQ-POST-LI-3** | The script MUST upload the screenshot image via the Images API, then create a post with the body text, link, all standard hashtags, and any conditional hashtags appended. |
| **REQ-POST-LI-4** | The script MUST automatically refresh an expired LinkedIn access token using the refresh token stored in `LINKEDIN_REFRESH_TOKEN`. After a successful refresh, the script MUST update the `LINKEDIN_ACCESS_TOKEN` GitHub Secret via the GitHub API. This requires a GitHub token with `secrets` write permission. |
| **REQ-POST-LI-5** | On success, the script MUST record the LinkedIn post URN (e.g., `urn:li:share:...`) in the post's platform results. On failure, the script MUST record the error message. |

---

## 12. POST-BS — Bluesky Posting

| ID | Requirement |
|----|-------------|
| **REQ-POST-BS-1** | The posting script MUST use the `@atproto/api` library to post to Bluesky. |
| **REQ-POST-BS-2** | The script MUST authenticate using the handle and app password stored in `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD`. |
| **REQ-POST-BS-3** | The script MUST upload the screenshot image as a blob, then create a post with the body text and link only. Hashtags MUST NOT be appended for Bluesky posts. |
| **REQ-POST-BS-4** | On success, the script MUST record the Bluesky post URI (e.g., `at://did:plc:.../app.bsky.feed.post/...`) in the post's platform results. On failure, the script MUST record the error message. |

---

## 13. RETRY — Retry Logic

| ID | Requirement |
|----|-------------|
| **REQ-RETRY-1** | Each platform posting attempt MUST retry up to **3 times** with **exponential backoff** before marking that platform as failed. (e.g., wait ~30s, ~60s between retries.) |
| **REQ-RETRY-2** | If **any** platform fails after all 3 retries, the post MUST be moved from `scheduled/` to the `failed/` directory. Platforms that succeeded are recorded as successful in the JSON, but the post is still moved to `failed/`. See **REQ-CLEANUP-2**. |
| **REQ-RETRY-3** | Each platform's result MUST be independent — a failure on one platform MUST NOT prevent attempts on the remaining platforms. All three platforms MUST be attempted regardless of individual outcomes. |
| **REQ-RETRY-4** | Retrying a **Failed** post from the web app MUST move the post's JSON file back to the `scheduled/` directory with the same date (if that date has not passed) or the next available date (if the original date is in the past). The GitHub Actions workflow will pick it up on the scheduled date. |
| **REQ-RETRY-5** | The failed post JSON MUST include per-platform error details: for each platform, the success/failure status, error message (if failed), retry count attempted, and post ID or URI (if succeeded). **(Mock 8)** |

---

## 14. CLEANUP — Post-Publication Cleanup

| ID | Requirement |
|----|-------------|
| **REQ-CLEANUP-1** | When a post is successfully published to **all three platforms**, the workflow MUST delete both the post JSON file from `scheduled/` and its associated screenshot PNG from `media/`. There MUST NOT be a `posted/` directory — the repo stays lean. |
| **REQ-CLEANUP-2** | When a post fails on **any** platform (even if the other two succeed), the post JSON MUST be moved from `scheduled/` to `failed/` with per-platform results recorded. The screenshot MUST be retained in `media/` for potential retry. |
| **REQ-CLEANUP-3** | All file deletions and moves MUST be committed to the repo by the GitHub Actions workflow in the same run. |

---

## 15. SKILL — Phase 1 Content Generation Skill

| ID | Requirement |
|----|-------------|
| **REQ-SKILL-1** | The content generation skill MUST accept a single required input: the number of days of posts to generate. The skill MUST ask the user for this value and MUST NOT assume a default. |
| **REQ-SKILL-2** | The skill MUST output a single JSON file (`posts.json`) conforming to the schema defined in `posts.schema.json`. |
| **REQ-SKILL-3** | The skill MUST enforce the content mix: **40%** Feature Highlights, **20%** Community Demos, **40%** Docs & Tutorials (±1 post for rounding). |
| **REQ-SKILL-4** | The skill MUST write all post body text in the established Babylon.js voice: enthusiastic, accessible, conversational, community-centric, short and punchy (1–2 sentences), and action-oriented. |
| **REQ-SKILL-5** | The skill MUST use emoji in approximately **25%** of posts (1 in 4). Acceptable emojis: 😍, 🤯, 🔥, 🎮, ✨, 🚀. Never more than 2–3 emoji per post. |
| **REQ-SKILL-6** | The skill MUST use a mix of post formats across the batch: feature-statement (~25%), question (~20%), check-out (~20%), demo-showcase (~15%), community-pride (~10%), call-to-action (~10%). |
| **REQ-SKILL-7** | Every post MUST include the 8 standard hashtags: `#3D #WebDev #gamedev #indiedev #WebDevelopment #webgl #gamedevelopment #IndieDevs`. Posts in the `community-demo` category MUST additionally include `#BuiltWithBabylon`. No other posts MUST include `#BuiltWithBabylon`. |
| **REQ-SKILL-8** | The **body text + link URL** for each post MUST fit within **300 graphemes**. Hashtags are appended per-platform at post-time and MUST NOT be included in this 300-grapheme budget. The JSON MUST NOT contain a `fullText` field — full text is assembled at post-time. |
| **REQ-SKILL-9** | A specific topic (identified by `metadata.topic`) MUST NOT appear more than once per 30-day window. The same documentation page or playground URL MUST NOT be linked more than once per 30-day window. |
| **REQ-SKILL-10** | Every post MUST include exactly one link. The link SHOULD be to a live interactive experience (playground, feature demo, community project). If no interactive experience exists, the link MAY fall back to the relevant documentation page. |
| **REQ-SKILL-11** | Every post MUST include a screenshot captured automatically via Playwright during the content generation phase. The skill MUST navigate to the `media.sourceUrl`, wait for the page (including any WebGL/canvas content) to fully render, and capture a screenshot at 1280×720 resolution. Screenshots MUST be saved as PNG files to `media/post-{id}.png`. |
| **REQ-SKILL-12** | Screenshots MUST NOT be AI-generated images, stock photos, or screenshots of text-heavy pages. They MUST show visually inviting content (3D scenes, visual editors, interactive demos). |
| **REQ-SKILL-13** | Before generating posts, the skill MUST research and catalog content from all specified sources (documentation, playground, forum, API reference, feature demos, blog, community page, YouTube, GitHub) and build a catalog of at least **3× the requested number of posts**. |
| **REQ-SKILL-14** | Posts MUST be interleaved by category across the batch — the skill MUST NOT place consecutive runs of the same category (e.g., 5 feature posts in a row). |
| **REQ-SKILL-15** | The skill MUST produce a summary report after generation: total posts, category breakdown, post format distribution, emoji usage rate, topics covered, and any validation warnings. |

---

## 16. SCHEMA — JSON Schema & Validation

| ID | Requirement |
|----|-------------|
| **REQ-SCHEMA-1** | The `posts.schema.json` file MUST define a JSON Schema (draft-07) that validates the structure of the Phase 1 `posts.json` output. The web app MUST validate imported JSON against this schema before processing. |
| **REQ-SCHEMA-2** | Each post object MUST contain the following required fields: `id` (pattern `post-NNN`), `category` (enum: `feature-highlight`, `community-demo`, `docs-tutorial`), `text`, `hashtags` (min 8 items), `conditionalHashtags`, `link` (with `url`, `type`, `title`), `media` (with `type`, `sourceUrl`, `description`, `filePath`), and `metadata` (with `topic`, `babylonFeatureArea`, `contentSource`, `usesEmoji`, `postFormat`, `dayIndex`). |
| **REQ-SCHEMA-3** | The `link.type` field MUST be one of: `playground`, `demo`, `docs`, `forum`, `blog`, `community-project`, `youtube`. |
| **REQ-SCHEMA-4** | The `metadata.postFormat` field MUST be one of: `feature-statement`, `question`, `check-out`, `demo-showcase`, `community-pride`, `call-to-action`. |
| **REQ-SCHEMA-5** | The `media.filePath` field MUST match the pattern `media/post-NNN.png`. The `media.type` field MUST be `"screenshot"`. |
| **REQ-SCHEMA-6** | The top-level JSON MUST include `generatedAt` (ISO 8601 datetime), `generatedBy` (const: `"Babylon.js Social Media Agent"`), `totalPosts` (integer ≥ 1), `config` (with `daysRequested`, `contentMix`, `emojiRate`, `postingTime`, `platforms`), and a `posts` array. |
| **REQ-SCHEMA-7** | The scheduled post JSON (files in `scheduled/` and `failed/`) MUST include all fields from the original post schema plus platform-specific result fields added by the posting workflow (success/failure status, post IDs/URIs, error messages). |
| **REQ-SCHEMA-8** | The JSON MUST NOT include a `fullText` field or `characterCount` block. Body text + link are validated against the 300-grapheme limit; full post text is assembled at post-time by concatenating body + platform-appropriate hashtags. |

---

## Out of Scope

The following items are explicitly **not** in scope for this release:

| Item | Rationale |
|------|-----------|
| Video content | Images only for Phase 1; video is a future enhancement |
| Per-platform post customization | All platforms receive the same body text; hashtags are the only per-platform variation |
| Platform-specific preview layouts | Generic preview only; X/LinkedIn/Bluesky-specific previews deferred. See **REQ-DETAIL-3** |
| Analytics / engagement tracking | No social media analytics or dashboards |
| Comment monitoring / community management | Out of scope for this tool |
| Paid API subscriptions or third-party scheduling services | System operates at $0 cost |
| Dark mode | Nice to have; not required for this release |
| Automated failure notifications | Team checks Action logs and `failed/` directory manually; GitHub Issue alerts may be added later |
| Pause / resume capability for scheduled posts | Delete and reschedule manually; edge case doesn't justify complexity |
| `posted/` directory or "Posted" status | Successfully posted content is deleted from the repo. See **REQ-CLEANUP-1** |
| Manual hashtag editing | Hashtags are system-managed metadata. See **REQ-EDIT-7** |
| Per-platform text editing | Post-level editing only (single text for all platforms). See **REQ-EDIT-1** |

---

## Acceptance Criteria Summary

The following table summarizes the key acceptance criteria for each functional area. A feature is considered complete only when **all MUST-level requirements** in that area pass.

| Area | # Reqs | Key Acceptance Criteria |
|------|--------|------------------------|
| **AUTH** | 8 | User can sign in via GitHub OAuth; non-team members see Access Denied; token is used for all API calls; sign-out clears session |
| **IMPORT** | 9 | JSON file can be drag-dropped or browsed; dates are auto-assigned sequentially from last scheduled date; re-import replaces existing drafts; import summary shows correct stats |
| **LIST** | 10 | All three statuses visible in one list; filtering by status, category, date range works; batch selection enables batch actions; post count updates with filters |
| **DETAIL** | 9 | Full post content displayed; generic preview renders correctly; failed posts show per-platform results; navigation back to list works |
| **EDIT** | 8 | Draft fields are editable; scheduled posts are locked (read-only); live grapheme counter displays body+link count and turns red over 300; image replacement via file upload works |
| **APPROVE** | 9 | Single approve commits JSON + PNG to `scheduled/`; over-limit posts are blocked; batch approve commits sequentially with progress indicator; batch cap of 15 enforced |
| **DELETE** | 6 | Confirmation modal appears; draft deletion removes from localStorage; scheduled/failed deletion removes files from repo via API |
| **STATUS** | 6 | Three statuses (Draft/Scheduled/Failed) are visually distinct; status is derived from directory presence; no "Posted" status exists |
| **SCHEDULE** | 8 | Workflow fires daily at 10 AM Pacific (DST-aware); finds today's post in `scheduled/`; exits cleanly if no post; posts to all 3 platforms; commits changes |
| **POST-X** | 5 | Posts via `agent-twitter-client`; uploads image + text + hashtags; degrades gracefully on failure; records tweet ID or error |
| **POST-LI** | 5 | Posts via LinkedIn Marketing API; uploads image then creates post with hashtags; auto-refreshes expired token and updates GitHub Secret; records post URN or error |
| **POST-BS** | 4 | Posts via `@atproto/api`; uploads blob then creates post with body + link only (no hashtags); records post URI or error |
| **RETRY** | 5 | 3 retries with exponential backoff per platform; any platform failure → `failed/`; retry from web app moves post back to `scheduled/`; per-platform errors recorded |
| **CLEANUP** | 3 | All succeed → post JSON + screenshot deleted from repo; any fail → post moved to `failed/`; changes committed in same workflow run |
| **SKILL** | 15 | Generates N posts; enforces 40/20/40 mix; Babylon.js voice; 25% emoji rate; 300-grapheme body+link limit; de-dup per 30 days; Playwright screenshots; interleaved categories |
| **SCHEMA** | 8 | JSON validated against schema on import; all required fields present; enums enforced; no `fullText` field; scheduled/failed posts include platform results |
| **Total** | **108** | |
