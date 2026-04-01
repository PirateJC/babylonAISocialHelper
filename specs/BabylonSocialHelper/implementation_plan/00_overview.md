# Implementation Plan — Babylon.js Social Media Helper

## Project Summary

The Babylon.js Social Media Helper is a greenfield, end-to-end system for generating, reviewing, and publishing daily social media posts for Babylon.js across X (Twitter), LinkedIn, and Bluesky. It consists of three functional phases: AI content generation (Copilot skill), a static review web app (GitHub Pages), and automated daily posting (GitHub Actions). The system operates at $0 cost.

---

## Phasing Strategy

Implementation is organized into 4 phases with thin vertical slices within each. The posting pipeline (spec Phase 3) is built **before** the web app (spec Phase 2) so that `scheduled/` has a consumer ready for testing.

### Phase 1: Project Scaffolding & Schema (3 tasks)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `01_01_repo_scaffolding.md` | Initialize git, npm workspaces, TypeScript configs, directory structure, .gitignore |
| 1.2 | `01_02_schema_finalization.md` | Update posts.schema.json to remove fullText/characterCount, align with REQ-SCHEMA-* |
| 1.3 | `01_03_skill_validation_tooling.md` | Create a validation script that checks generated posts.json against the schema and content rules |

### Phase 2: GitHub Actions Posting Pipeline (7 tasks)

| Task | File | Description |
|------|------|-------------|
| 2.1 | `02_01_posting_types_and_retry.md` | Shared TypeScript types (PlatformResult, PostData) and retry-with-backoff utility |
| 2.2 | `02_02_bluesky_posting_module.md` | Bluesky posting via @atproto/api (simplest platform — establishes patterns) |
| 2.3 | `02_03_linkedin_posting_module.md` | LinkedIn posting via Marketing API with token refresh |
| 2.4 | `02_04_x_posting_module.md` | X/Twitter posting via agent-twitter-client |
| 2.5 | `02_05_posting_orchestrator.md` | Main orchestrator: reads scheduled/, posts to all 3, handles results and cleanup |
| 2.6 | `02_06_github_actions_workflow.md` | post-daily.yml with DST-aware dual cron and self-gating |
| 2.7 | `02_07_dry_run_and_testing.md` | --dry-run mode, manual test with real sample post, verify workflow |

### Phase 3: Review Web App (13 tasks)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `03_01_webapp_scaffold.md` | React + TypeScript + Vite project, routing shell, basic layout |
| 3.2 | `03_02_cloudflare_oauth_proxy.md` | Cloudflare Worker for GitHub OAuth token exchange |
| 3.3 | `03_03_authentication_flow.md` | GitHub OAuth login, team membership check, session management |
| 3.4 | `03_04_post_import_and_dates.md` | JSON import, schema validation, date assignment, localStorage storage |
| 3.5 | `03_05_post_list_view.md` | Post list with filtering by status/category/date, post count |
| 3.6 | `03_06_post_detail_view.md` | Individual post view with generic preview card |
| 3.7 | `03_07_post_editing.md` | Draft editing with live grapheme counter and image replacement |
| 3.8 | `03_08_individual_approve.md` | Single post approval: validate, commit JSON + PNG to scheduled/ |
| 3.9 | `03_09_batch_approve.md` | Batch approval with 15-post cap, sequential commits, progress indicator |
| 3.10 | `03_10_delete_single_and_batch.md` | Delete with confirmation modal for Draft/Scheduled/Failed posts |
| 3.11 | `03_11_status_tracking.md` | Status derivation from scheduled/ and failed/ scanning, status badges |
| 3.12 | `03_12_failed_post_retry.md` | Failed post detail view, retry action (move back to scheduled/) |
| 3.13 | `03_13_github_pages_deployment.md` | Vite build config for GitHub Pages, deployment workflow |

### Phase 4: Integration & Polish (2 tasks)

| Task | File | Description |
|------|------|-------------|
| 4.1 | `04_01_end_to_end_testing.md` | Full pipeline test: generate → import → approve → post → verify |
| 4.2 | `04_02_content_generation_skill_testing.md` | Generate a small batch with the skill, validate output |

---

## Task Count Summary

| Phase | Tasks |
|-------|-------|
| Phase 1: Scaffolding & Schema | 3 |
| Phase 2: Posting Pipeline | 7 |
| Phase 3: Review Web App | 13 |
| Phase 4: Integration & Polish | 2 |
| **Total** | **25** |

---

## Key Architecture Decisions

1. **Repo-as-database:** All persistent state lives in `scheduled/`, `failed/`, and `media/` directories in the GitHub repo. No external database.
2. **Drafts in localStorage:** Imported posts are Draft status in the browser only until approved.
3. **HashRouter:** GitHub Pages does not support server-side path rewriting, so hash-based routes are used.
4. **Cloudflare Worker OAuth proxy:** Keeps the GitHub OAuth client_secret server-side; stateless, no token storage.
5. **Sequential commits for batch approval:** One commit per post avoids partial-failure complexity. Capped at 15 posts.
6. **Dual cron with self-gating:** Two cron expressions (17:00 UTC for PDT, 18:00 UTC for PST) with a Pacific-time window check to prevent double-posting.
7. **No `fullText` or `characterCount` in schema:** Full text is assembled at post-time; validation uses body+link against 300-grapheme limit.
8. **Generic post preview only:** Platform-specific previews are deferred to a future release.
9. **Successfully posted content is deleted:** No `posted/` directory; repo stays lean.

---

## Requirement Coverage

All 108 requirements (REQ-AUTH through REQ-SCHEMA) are addressed across the 25 tasks. Each task file lists the specific REQ-* IDs it satisfies.

---

## File Naming Convention

Task files use the format `NN_MM_<task_name>.md` where:
- `NN` = phase number (01–04)
- `MM` = task number within the phase (01–13)
- `<task_name>` = kebab-case description
