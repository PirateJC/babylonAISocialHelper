# Exploration Notes — BabylonSocialHelper Implementation Plan

## Summary

The BabylonSocialHelper is a greenfield, end-to-end system for generating, reviewing, and auto-publishing daily social media posts for Babylon.js across X (Twitter), LinkedIn, and Bluesky. It operates at $0 cost using GitHub Pages, GitHub Actions, Cloudflare Workers (free tier), and free platform APIs/libraries.

---

## Key Findings from Spec Documents

### From goals.md

- **Three-phase pipeline:** (1) AI content generation skill → (2) Review web app → (3) GitHub Actions auto-posting.
- **Posting cadence:** 1 post/day, 7 days/week, at 10:00 AM Pacific (DST-aware).
- **Posts are identical across all three platforms.** Hashtags are the only per-platform variation (appended at post-time; skipped on Bluesky).
- **Content mix:** 40% Feature Highlights, 20% Community Demos, 40% Docs & Tutorials.
- **300-grapheme limit** (Bluesky constraint) for body text + link URL. Hashtags are metadata appended per-platform and excluded from this budget.
- **No `fullText` field** in JSON — full text is assembled at post-time.
- **No `characterCount` block** — the schema must be updated to remove these.
- **Media:** Every post must include a real Playwright-captured screenshot (no AI images, no stock photos).
- **De-duplication:** Same topic/URL must not appear more than once per 30-day window.
- **Key decisions logged:** 23 decisions including no database (repo is the DB), no `posted/` directory, agent-twitter-client for X, generic preview only in web app.

### From requirements.md

- **108 total requirements** across 16 functional areas: AUTH (8), IMPORT (9), LIST (10), DETAIL (9), EDIT (8), APPROVE (9), DELETE (6), STATUS (6), SCHEDULE (8), POST-X (5), POST-LI (5), POST-BS (4), RETRY (5), CLEANUP (3), SKILL (15), SCHEMA (8).
- **AUTH:** GitHub OAuth with Cloudflare Worker proxy for token exchange. Team membership check against `BabylonJS/core-team-microsoft`. Token in sessionStorage only. Required scopes: `repo`, `read:org`.
- **IMPORT:** Drag-drop JSON file, validate against schema, auto-assign dates from last scheduled date, store as Draft in localStorage, re-import replaces existing drafts.
- **LIST:** Combined view of Draft + Scheduled + Failed posts. Checkbox selection, batch actions, filtering by status/category/date range.
- **DETAIL:** Full post view with generic preview card. Draft posts are editable; Scheduled posts are read-only; Failed posts show per-platform error results.
- **EDIT:** Live grapheme counter (Intl.Segmenter), red over-limit indicator, image replacement via file upload, hashtags and metadata are read-only.
- **APPROVE:** Single + batch (max 15). Sequential commits with progress indicator. Blocked if over 300 graphemes. Commits JSON + PNG to `scheduled/`.
- **DELETE:** Confirmation modal. Drafts removed from localStorage; Scheduled/Failed removed from repo via GitHub API.
- **STATUS:** Three statuses only: Draft (localStorage), Scheduled (`scheduled/`), Failed (`failed/`). No "Posted" status.
- **SCHEDULE:** Dual cron triggers for DST (17:00 UTC for PDT, 18:00 UTC for PST). Self-gates on Pacific time window.
- **POST-X:** `agent-twitter-client` library, credentials via secrets, graceful degradation.
- **POST-LI:** LinkedIn Marketing API, auto-refresh expired tokens, update GitHub Secrets.
- **POST-BS:** `@atproto/api`, body + link only (no hashtags on Bluesky).
- **RETRY:** 3 retries with exponential backoff per platform. Any platform failure → `failed/`. Independent per platform.
- **CLEANUP:** All succeed → delete post + screenshot. Any fail → move to `failed/`.
- **SKILL:** 15 requirements covering content generation, voice, emoji, formats, screenshots, validation.
- **SCHEMA:** Must remove `fullText` and `characterCount` from current schema. Add `dayIndex` to metadata.

### From architecture.md

- **Component architecture:** React + TypeScript + Vite SPA with HashRouter.
- **Component tree defined:** App → AuthProvider → LoginScreen | AccessDenied | AuthenticatedLayout → Navbar + Routes (ImportPanel, PostList, PostDetail).
- **File plan:** Complete directory structure with ~40+ files across webapp/, scripts/, oauth-worker/, .github/workflows/.
- **Services layer:** github-api.ts, auth.ts, storage.ts.
- **Utils layer:** grapheme-count.ts, date-assign.ts, schema-validate.ts.
- **Types layer:** post.ts for all TypeScript interfaces.
- **OAuth flow:** 10-step flow documented: browser → GitHub Pages → Cloudflare Worker → GitHub OAuth → back.
- **GitHub API interactions:** 9 operations documented (read scheduled, read failed, commit post, delete, etc.).
- **Import flow:** Parse → Validate → Query GitHub for last date → Assign dates → Store in localStorage.
- **Approve flow:** Validate graphemes → Read screenshot → Create Git Blob → Commit JSON → Remove from localStorage.
- **Batch operations:** Sequential commits, progress indicator, stop-on-failure.
- **Posting modules:** Standardized PlatformResult type. Each module is independent TypeScript function.
- **LinkedIn token refresh:** Automated flow with GitHub Secrets update.
- **Dual cron with self-gating:** Both triggers fire daily; workflow checks Pacific time window.
- **Testing strategy:** Unit tests (Vitest), component tests (Testing Library), E2E (Playwright), dry-run mode for posting.
- **OAuth proxy:** Cloudflare Worker at oauth-worker/ directory.

### From posts.schema.json (current state)

- **Must be updated:** Currently contains `fullText` (required) and `characterCount` (required) fields.
- **These must be removed** per REQ-SCHEMA-8 and goals.md decisions.
- **`dayIndex` already present** in metadata — this is correct.
- **Enums correctly defined:** category, link.type, metadata.postFormat.
- **Pattern for post ID:** `^post-\\d{3,}$`.
- **Pattern for media filePath:** `^media/post-\\d{3,}\\.png$`.

### From SKILL.md (current state)

- **Must be updated to match schema changes:** Currently references `fullText` and `characterCount` in its output schema and examples.
- **Content generation procedure well-documented:** 6 steps (Research, Plan, Write, Screenshot, Validate, Output).
- **Examples include `fullText` and `characterCount`** — these need removal in the schema update task.

### From mocks.context.md

- Minimal content. Confirms the web app's purpose and key screens.
- No Q&A or tweaks logged yet.

### From mocks.html (skimmed via context)

- 9 mock screens documented: Login (1), Access Denied (2), Import (3), Import Summary (4), Post List (5), Post List with states (6), Post Detail/Edit (7), Failed Post Detail (8), Delete Confirmation (9).
- These directly map to the component architecture in architecture.md.

---

## Schema Delta (Critical Finding)

The current `posts.schema.json` and `SKILL.md` both include `fullText` and `characterCount` as required fields. Per REQ-SCHEMA-8 and the goals document (Decision #13), these must be removed:

- **Remove from schema:** `fullText` (string, required), `characterCount` (object with fullText/bodyOnly/withHashtags, required).
- **Update SKILL.md:** Remove references to `fullText` and `characterCount` in the output schema, field reference table, examples, and validation steps.
- **Rationale:** Full text is assembled at post-time by posting scripts (body + platform-appropriate hashtags). The 300-grapheme validation is body text + link URL only.

---

## Phasing Decisions

Per the user's instruction, implementation is reordered from the spec's natural phase numbering:

1. **Phase 1 (Implementation):** Project scaffolding & schema finalization.
2. **Phase 2 (Implementation):** GitHub Actions posting pipeline (spec's Phase 3) — built first so `scheduled/` has a consumer for testing.
3. **Phase 3 (Implementation):** Review web app (spec's Phase 2) — built after posting pipeline.
4. **Phase 4 (Implementation):** Integration & polish.

---

## Risk Items Relevant to Implementation

1. **agent-twitter-client fragility:** Uses X's internal web API. May break without notice. Must implement graceful degradation.
2. **LinkedIn API access requires review/approval:** May take days/weeks. Start application early (noted as open question in goals.md).
3. **DST double-posting:** Dual cron triggers overlap ~2 weeks around transitions. Self-gating logic is critical.
4. **GitHub API rate limits:** 5,000/hr. 15-post batch cap ensures safety.
5. **localStorage is ephemeral:** Users must re-import if browser data is cleared. By design.
6. **Concurrent approval conflicts:** Two users approving posts for the same date can cause 409 conflicts. Web app should handle gracefully.

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Web app framework | React 18+ with TypeScript |
| Build tool | Vite |
| Routing | react-router-dom (HashRouter) |
| State management | React Context + localStorage |
| Schema validation | ajv (JSON Schema draft-07) |
| Grapheme counting | Intl.Segmenter API |
| OAuth proxy | Cloudflare Workers |
| Hosting (web app) | GitHub Pages |
| CI/CD (posting) | GitHub Actions |
| X posting | agent-twitter-client (goat-x) |
| LinkedIn posting | LinkedIn Marketing API (REST) |
| Bluesky posting | @atproto/api |
| Screenshot capture | Playwright (Node.js) |
| Testing | Vitest + Testing Library + Playwright |
