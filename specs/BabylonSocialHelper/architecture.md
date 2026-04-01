# Babylon.js Social Media Helper — Architecture Document

> **Version:** 1.0
> **Last updated:** 2026-07-14
> **Source:** [goals.md](./goals.md) · [requirements.md](./requirements.md) · [mocks.html](./mocks.html) · [SKILL.md](../../skills/content-generation/SKILL.md) · [posts.schema.json](../../schemas/posts.schema.json)

---

## 1. Executive Summary

The Babylon.js Social Media Helper is an end-to-end system for generating, reviewing, and publishing daily social media posts for Babylon.js across three platforms: **X (Twitter)**, **LinkedIn**, and **Bluesky**. The system operates at **$0 cost** using free-tier services throughout.

The system is divided into three phases that form a pipeline:

1. **Phase 1 — Content Generation:** An AI agent skill generates batches of post content (text, links, screenshots) and outputs a structured JSON file with accompanying media.
2. **Phase 2 — Review Web App:** A React/TypeScript static web app hosted on GitHub Pages allows the Babylon.js core team to import, review, edit, and approve posts via GitHub OAuth.
3. **Phase 3 — Auto-Posting:** A GitHub Actions workflow runs daily at 10:00 AM Pacific, picks up approved posts, and publishes them to all three platforms.

### System Overview

| Phase | Purpose | Components | Tech Stack |
|-------|---------|------------|------------|
| **Phase 1** | Content Generation | AI agent + SKILL.md + Playwright | Copilot CLI skill, Playwright (Node.js), JSON schema validation |
| **Phase 2** | Review & Approval | Static web app + OAuth proxy | React, TypeScript, Vite, Cloudflare Worker, GitHub API, localStorage |
| **Phase 3** | Auto-Posting | Posting scripts + cron workflow | Node.js/TypeScript, GitHub Actions, agent-twitter-client, LinkedIn Marketing API, @atproto/api |

All state lives in the GitHub repo (`scheduled/`, `failed/`, `media/`) and browser localStorage (drafts). There is no database.

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LOCAL MACHINE                                 │
│                                                                      │
│   ┌──────────────────────────────────────────────┐                   │
│   │          Phase 1: Content Generation          │                  │
│   │                                               │                  │
│   │  User Prompt ──► AI Agent + SKILL.md          │                  │
│   │                    │                          │                  │
│   │                    ├──► Crawl sources          │                  │
│   │                    ├──► Generate post text     │                  │
│   │                    ├──► Playwright screenshots  │                 │
│   │                    │                          │                  │
│   │                    ▼                          │                  │
│   │              posts.json + media/*.png          │                  │
│   └──────────────────────┬───────────────────────┘                   │
│                          │                                           │
│                          │ User uploads posts.json                   │
│                          ▼                                           │
│   ┌──────────────────────────────────────────────┐                   │
│   │          Browser: Review Web App              │                  │
│   │          (served from GitHub Pages)           │                  │
│   │                                               │                  │
│   │  Import ──► localStorage (drafts)             │                  │
│   │  Review ──► Edit / Delete / Approve           │                  │
│   │  Approve ──► GitHub API commit                │                  │
│   └──────────────────────┬───────────────────────┘                   │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                      │
        │        GITHUB REPO                      │
        │                                         │
        │  scheduled/YYYY-MM-DD.json              │
        │  media/post-NNN.png                     │
        │  failed/YYYY-MM-DD.json                 │
        │                                         │
        └──────────────────┬──────────────────────┘
                           │
                           │ Daily cron trigger
                           ▼
        ┌─────────────────────────────────────────┐
        │      Phase 3: GitHub Actions Workflow    │
        │                                         │
        │  Find today's post in scheduled/        │
        │          │                              │
        │          ├──► Post to X (agent-twitter)  │
        │          ├──► Post to LinkedIn (API)     │
        │          ├──► Post to Bluesky (AT Proto) │
        │          │                              │
        │          ▼                              │
        │  All succeed?                           │
        │    YES ──► Delete from scheduled/ + media/
        │    NO  ──► Move to failed/              │
        │          ──► Commit changes to repo     │
        └─────────────────────────────────────────┘
```

### Data Flow

```
Generation ──► Import ──► Review ──► Approve ──► Schedule ──► Post ──► Cleanup

  posts.json     Parse &     Edit      Commit to    Cron        Publish    Delete or
  media/*.png    assign      text,     scheduled/   picks up    to X,      move to
  (local)        dates to    image,    via GitHub   today's     LinkedIn,  failed/
                 localStorage link      API          post        Bluesky
```

### Key Boundaries

| Boundary | Components | Trust Level |
|----------|-----------|-------------|
| **Local machine** | AI agent, Playwright, posts.json output | Trusted (developer workstation) |
| **GitHub repo** | scheduled/, failed/, media/, webapp/ | Trusted (team-scoped access) |
| **GitHub Pages** | Static web app assets (HTML/JS/CSS) | Public (read-only static files) |
| **Cloudflare Worker** | OAuth token exchange proxy | Semi-trusted (stateless, no token storage) |
| **GitHub Actions** | Posting workflow, platform scripts | Trusted (encrypted secrets) |
| **Social platforms** | X, LinkedIn, Bluesky APIs | External (rate limits, auth required) |

---

## 3. Phase 1 — Content Generation Skill

Phase 1 runs entirely on the developer's local machine as a Copilot CLI skill. It is invoked manually and produces output files that feed Phase 2.

### How It Works

The AI agent reads the `SKILL.md` file, which contains detailed instructions for the Babylon.js voice, content mix rules, de-duplication logic, and output schema. The agent then:

1. **Asks the user** for the number of posts to generate (**REQ-SKILL-1**)
2. **Researches content** by crawling Babylon.js sources: docs, playground, forum, feature demos, blog, community page, YouTube, GitHub — building a catalog of ≥ 3× the requested posts (**REQ-SKILL-13**)
3. **Plans the batch** — calculates 40/20/40 category split, distributes post formats, marks ~25% for emoji, interleaves categories (**REQ-SKILL-3**, **REQ-SKILL-6**, **REQ-SKILL-14**)
4. **Writes posts** in the Babylon.js voice, enforcing the 300-grapheme body+link limit (**REQ-SKILL-4**, **REQ-SKILL-8**)
5. **Captures screenshots** via Playwright for every post (**REQ-SKILL-11**, **REQ-SKILL-12**)
6. **Validates** the full batch against all content rules (**REQ-SKILL-15**)

### Input / Output

```
INPUT                              OUTPUT
─────                              ──────
User prompt:                       output/posts.json    (structured JSON)
  "Generate 90 posts"              media/post-001.png   (screenshot)
                                   media/post-002.png   (screenshot)
SKILL.md                           media/post-003.png   ...
  (voice, rules, schema)           ...
                                   media/post-090.png   (screenshot)
posts.schema.json
  (validation reference)           Summary report (stdout)
```

### Playwright Screenshot Capture Flow

```
For each post in the batch:

  ┌─────────────────────────┐
  │ Read media.sourceUrl    │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ Launch Playwright        │
  │ (Chromium, 1280×720)     │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ Navigate to sourceUrl   │
  │ Wait for page load      │
  │ Wait for canvas/WebGL   │
  │ render (if applicable)  │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐     ┌──────────────────────────┐
  │ Page has visual content? ├─NO─►│ Flag & try alt sourceUrl │
  └───────────┬─────────────┘     └──────────────────────────┘
              │ YES
              ▼
  ┌─────────────────────────┐
  │ Capture full-viewport   │
  │ screenshot as PNG       │
  │ Save to media/post-NNN  │
  └─────────────────────────┘
```

### Content Validation Pipeline

The skill enforces these validation rules before outputting the final JSON:

| Validation Rule | REQ Reference |
|----------------|---------------|
| Total post count matches requested `days` | **REQ-SKILL-1** |
| Category split is 40/20/40 (±1) | **REQ-SKILL-3** |
| No topic repeats within any 30-day window | **REQ-SKILL-9** |
| No duplicate URLs within any 30-day window | **REQ-SKILL-9** |
| Every post has a valid link | **REQ-SKILL-10** |
| Every post has a real screenshot on disk | **REQ-SKILL-11** |
| `#BuiltWithBabylon` only on `community-demo` posts | **REQ-SKILL-7** |
| Emoji usage ≈ 25% of posts | **REQ-SKILL-5** |
| Body text + link URL ≤ 300 graphemes | **REQ-SKILL-8** |
| No `fullText` or `characterCount` fields in JSON | **REQ-SCHEMA-8** |
| Categories interleaved (no long same-category runs) | **REQ-SKILL-14** |
| JSON validates against `posts.schema.json` | **REQ-SKILL-2**, **REQ-SCHEMA-1** |

---

## 4. Phase 2 — Review Web App

A React/TypeScript single-page application hosted on GitHub Pages. The app uses the GitHub API (via the user's OAuth token) to read/write post data in the repo. No backend server — all logic is client-side.

### 4.1 Component Architecture

```
<App>
├── <AuthProvider>                     ← React Context: token, user, team status
│   ├── <LoginScreen>                  ← Mock 1: Sign in with GitHub
│   ├── <AccessDenied>                 ← Mock 2: Non-team-member gate
│   │
│   └── <AuthenticatedLayout>
│       ├── <Navbar>                   ← Brand, Import button, user avatar, sign-out
│       │
│       ├── <Routes> (HashRouter)
│       │   ├── #/import
│       │   │   └── <ImportPanel>      ← Mock 3: Drag-drop / file picker
│       │   │       └── <ImportSummary>← Mock 4: Stats, date range, actions
│       │   │
│       │   ├── #/posts
│       │   │   ├── <FilterBar>        ← Status, category, date range filters
│       │   │   ├── <PostList>         ← Mock 5/6: Chronological post rows
│       │   │   │   └── <PostRow>      ← Checkbox, thumbnail, date, text, badges, action
│       │   │   └── <BatchActionBar>   ← "N selected" + Approve/Delete/Clear buttons
│       │   │
│       │   └── #/posts/:id
│       │       ├── <PostDetail>       ← Mock 7: Full post view
│       │       │   ├── <PostEditor>   ← Editable fields (draft only)
│       │       │   │   ├── Text textarea with <GraphemeCounter>
│       │       │   │   ├── Link URL input + Link type select
│       │       │   │   ├── Date picker
│       │       │   │   ├── Image replacement (file upload)
│       │       │   │   └── Read-only metadata + hashtags
│       │       │   └── <PostPreview>  ← Generic preview card
│       │       │
│       │       └── <FailedPostDetail> ← Mock 8: Per-platform results + action log
│       │           └── <PlatformResultRow> (× 3)
│       │
│       └── <DeleteConfirmModal>       ← Mock 9: Confirmation dialog
```

### Routing Strategy

The app uses **HashRouter** (`react-router-dom`) because GitHub Pages serves a single `index.html` and does not support server-side path rewriting. Hash-based routes (`#/import`, `#/posts`, `#/posts/:id`) work without any server configuration.

| Route | Component | Description |
|-------|-----------|-------------|
| `#/` | Redirect to `#/import` | Default landing |
| `#/import` | `<ImportPanel>` | JSON file upload (Mock 3/4) |
| `#/posts` | `<PostList>` | Post list with filters (Mock 5/6) |
| `#/posts/:id` | `<PostDetail>` | Individual post view (Mock 7/8) |

### 4.2 Authentication Flow

```
┌──────────┐     ┌───────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  Browser  │     │ GitHub Pages  │     │ Cloudflare Worker   │     │ GitHub OAuth │
│  (User)   │     │ (Static App)  │     │ (Token Exchange)    │     │             │
└─────┬─────┘     └──────┬────────┘     └──────────┬──────────┘     └──────┬──────┘
      │                  │                         │                       │
      │  1. Click "Sign in with GitHub"            │                       │
      │─────────────────►│                         │                       │
      │                  │                         │                       │
      │  2. Redirect to GitHub OAuth authorize     │                       │
      │◄─────────────────│                         │                       │
      │  (client_id + redirect_uri + scope)        │                       │
      │                                            │                       │
      │  3. User authorizes app on GitHub          │                       │
      │────────────────────────────────────────────┼──────────────────────►│
      │                                            │                       │
      │  4. GitHub redirects back with ?code=ABC   │                       │
      │◄───────────────────────────────────────────┼───────────────────────│
      │                  │                         │                       │
      │  5. App sends code to Cloudflare Worker    │                       │
      │                  │────────────────────────►│                       │
      │                  │                         │                       │
      │                  │  6. Worker exchanges    │                       │
      │                  │     code for token      │                       │
      │                  │                         │──────────────────────►│
      │                  │                         │◄──────────────────────│
      │                  │                         │   (access_token)      │
      │                  │                         │                       │
      │                  │  7. Return token to app │                       │
      │                  │◄────────────────────────│                       │
      │                  │                         │                       │
      │  8. Store token in sessionStorage          │                       │
      │                  │                         │                       │
      │  9. Verify team membership via GitHub API  │                       │
      │                  │  GET /orgs/BabylonJS/teams/core-team-microsoft/memberships/{user}
      │                  │─────────────────────────┼──────────────────────►│
      │                  │◄────────────────────────┼───────────────────────│
      │                  │                         │                       │
      │  10. Grant or deny access                  │                       │
      │◄─────────────────│                         │                       │
```

**Token storage:** The OAuth token is stored in `sessionStorage` (cleared when the browser tab closes). It is never placed in URL parameters, never committed to the repo, and never logged in production (**REQ-AUTH-6**).

**Team verification:** After receiving the token, the app calls the GitHub API to check membership in `BabylonJS/core-team-microsoft`. Non-members see the Access Denied screen (**REQ-AUTH-4**, **REQ-AUTH-5**).

**Cloudflare Worker responsibilities:** The worker receives the OAuth `code`, combines it with the `client_secret` (stored as a Worker secret), exchanges it with GitHub for an `access_token`, and returns the token to the browser. The worker does not log or persist tokens (**REQ-AUTH-3**).

**Required OAuth scopes:** `repo` (read/write repo contents for commits), `read:org` (verify team membership).

### 4.3 Data Flow & State Management

State management uses **React Context** for auth state and **localStorage** for draft post data. No external state library is needed at this scale.

#### localStorage Schema

```
Key: "babylonsocial:drafts"
Value: JSON string

{
  "importedAt": "2026-07-14T10:00:00Z",
  "posts": [
    {
      "id": "post-001",
      "assignedDate": "2026-04-17",
      "category": "feature-highlight",
      "text": "...",
      "hashtags": [...],
      "conditionalHashtags": [...],
      "link": { "url": "...", "type": "...", "title": "..." },
      "media": { "type": "screenshot", "sourceUrl": "...", "description": "...", "filePath": "..." },
      "metadata": { ... }
    },
    ...
  ]
}
```

#### GitHub API Interactions

| Operation | API Call | Direction |
|-----------|----------|-----------|
| Read scheduled posts | `GET /repos/{owner}/{repo}/contents/scheduled/` | Repo → App |
| Read failed posts | `GET /repos/{owner}/{repo}/contents/failed/` | Repo → App |
| Read individual post JSON | `GET /repos/{owner}/{repo}/contents/scheduled/{file}` | Repo → App |
| Commit approved post | `PUT /repos/{owner}/{repo}/contents/scheduled/{date}.json` | App → Repo |
| Commit screenshot | `PUT /repos/{owner}/{repo}/contents/media/{file}` (via Git Blob API for binary) | App → Repo |
| Delete scheduled post | `DELETE /repos/{owner}/{repo}/contents/scheduled/{file}` | App → Repo |
| Delete failed post | `DELETE /repos/{owner}/{repo}/contents/failed/{file}` | App → Repo |
| Delete screenshot | `DELETE /repos/{owner}/{repo}/contents/media/{file}` | App → Repo |
| Verify team membership | `GET /orgs/BabylonJS/teams/core-team-microsoft/memberships/{user}` | App → GitHub |

#### Import Flow

```
User drops posts.json
        │
        ▼
┌───────────────────┐     ┌────────────────────────┐
│ Parse JSON         │────►│ Validate against        │
│ (JSON.parse)       │     │ posts.schema.json       │
└───────────────────┘     └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ Query GitHub API:       │
                          │ GET scheduled/ dir      │
                          │ Find last scheduled date│
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ Assign dates:           │
                          │ First = lastDate + 1    │
                          │ Sequential, 1/day       │
                          │ Skip occupied dates     │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ Clear existing drafts   │
                          │ Store in localStorage   │
                          │ Show import summary     │
                          └─────────────────────────┘
```

(**REQ-IMPORT-1** through **REQ-IMPORT-9**)

#### Approve Flow

```
User clicks "Approve" on a Draft post
        │
        ▼
┌──────────────────────────┐
│ Validate: body + link    │
│ ≤ 300 graphemes?         │
└──────────┬───────────────┘
           │
     ┌─────┴─────┐
     │NO         │YES
     ▼            ▼
  Show error   ┌──────────────────────────┐
  message      │ Read screenshot file from │
  (REQ-        │ localStorage / disk       │
  APPROVE-3)   └──────────┬───────────────┘
                          │
               ┌──────────▼───────────────┐
               │ Create Git Blob for image │
               │ (base64 → GitHub API)     │
               └──────────┬───────────────┘
                          │
               ┌──────────▼───────────────┐
               │ Commit JSON to            │
               │ scheduled/YYYY-MM-DD.json │
               └──────────┬───────────────┘
                          │
               ┌──────────▼───────────────┐
               │ Remove from localStorage  │
               │ Update status to Scheduled│
               └───────────────────────────┘
```

(**REQ-APPROVE-1** through **REQ-APPROVE-4**)

### 4.4 Post Editing & Validation

**Editable fields (Draft posts only, per REQ-EDIT-1):**
- Post body text (textarea)
- Link URL (text input)
- Link type (select dropdown)
- Scheduled date (date picker)
- Screenshot image (file upload to replace)

**Read-only fields (all statuses, per REQ-EDIT-7, REQ-EDIT-8):**
- Hashtags (system-managed, auto-appended at post-time)
- Metadata tags (topic, feature area, post format, emoji flag)

**Live Grapheme Counter (REQ-EDIT-4, REQ-EDIT-5):**
The editor displays a live counter showing `current / 300 graphemes` where `current` = grapheme count of (body text + link URL). The counter uses the `Intl.Segmenter` API (available in all modern browsers) to accurately count graphemes (important for emoji which may be multiple code points but a single grapheme). The counter turns red when over 300 (**REQ-EDIT-5**) and approval is blocked (**REQ-APPROVE-3**).

**Image Replacement (REQ-EDIT-3):**
The user picks a new PNG file from their local machine via a file input. The file is read as a base64 data URL and stored in the draft's localStorage entry. On approval, the base64 data is sent to the GitHub Git Blob API to commit the image to `media/`.

**Locked Scheduled Posts (REQ-EDIT-2, REQ-DETAIL-6):**
Once a post is approved and committed to `scheduled/`, all fields become read-only in the web app. To make changes, the user must delete the scheduled post and re-approve a corrected version.

### 4.5 Batch Operations

**Batch Approve (REQ-APPROVE-5 through REQ-APPROVE-8):**

```
User selects N draft posts via checkboxes
        │
        ▼
┌──────────────────────────┐
│ N ≤ 15?                  │
└──────────┬───────────────┘
           │
     ┌─────┴─────┐
     │NO         │YES
     ▼            ▼
  Show error   ┌──────────────────────────┐
  "Select 15   │ For i = 1 to N:          │
  or fewer"    │   Show "Committing i/N…" │
  (REQ-        │   Validate grapheme limit│
  APPROVE-6)   │   Commit JSON + PNG      │
               │   On failure → STOP      │
               │   On success → next      │
               └──────────────────────────┘
```

- Posts are committed **sequentially** (one commit per post, not a single bulk commit) to avoid partial-failure complexity (**REQ-APPROVE-7**)
- A progress indicator shows `"Committing 3 of 12…"` (**REQ-APPROVE-7**)
- If any commit fails, the batch stops; successfully committed posts keep Scheduled status; remaining posts stay as Drafts (**REQ-APPROVE-8**)
- The 15-post cap prevents excessive sequential API calls and respects GitHub API rate limits (**REQ-APPROVE-6**)

**GitHub API Rate Limits:**
The GitHub REST API allows 5,000 authenticated requests per hour. Each post approval requires ~2-3 API calls (create blob for image, create/update file for JSON). A 15-post batch therefore uses ~30-45 requests — well within limits. The sequential commit approach also naturally spaces requests, avoiding burst-rate concerns.

---

## 5. Phase 3 — GitHub Actions Auto-Posting

### 5.1 Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                 .github/workflows/post-daily.yml                    │
│                                                                     │
│  Trigger: cron (DST-aware, see below)                               │
│                                                                     │
│  ┌──────────────────────────────────────────────┐                   │
│  │ Step 1: Checkout repo                         │                  │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────┐                   │
│  │ Step 2: Find today's post                     │                  │
│  │   Look for scheduled/YYYY-MM-DD.json          │                  │
│  │   If not found → exit cleanly (REQ-SCHEDULE-4)│                  │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────┐                   │
│  │ Step 3: Read post JSON + load screenshot      │                  │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────┐                   │
│  │ Step 4: Post to all three platforms           │                  │
│  │                                               │                  │
│  │  ┌────────────┐ ┌────────────┐ ┌───────────┐ │                  │
│  │  │ post-to-x  │ │ post-to-li │ │ post-to-bs│ │                  │
│  │  │            │ │            │ │           │ │                  │
│  │  │ 3 retries  │ │ 3 retries  │ │ 3 retries │ │                  │
│  │  │ w/ backoff │ │ w/ backoff │ │ w/ backoff│ │                  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬─────┘ │                  │
│  │        │              │              │        │                  │
│  │        ▼              ▼              ▼        │                  │
│  │     result          result        result      │                  │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────┐                   │
│  │ Step 5: Aggregate results                     │                  │
│  │   All 3 succeeded? ──► Delete post + media    │                  │
│  │   Any failed?       ──► Move to failed/       │                  │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────┐                   │
│  │ Step 6: Commit changes to repo                │                  │
│  │   (deletions or move to failed/)              │                  │
│  └──────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

**DST-Aware Cron Strategy (REQ-SCHEDULE-2):**

The workflow uses dual cron triggers to always fire at 10:00 AM Pacific:

| Cron Expression | UTC Time | Pacific Time | Active Months |
|-----------------|----------|--------------|---------------|
| `0 17 * * *` | 17:00 UTC | 10:00 AM PDT | Mar (2nd Sun) – Nov (1st Sun) |
| `0 18 * * *` | 18:00 UTC | 10:00 AM PST | Nov (1st Sun) – Mar (2nd Sun) |

Both triggers fire every day; the workflow's first step checks the current Pacific time. If it is not within the 09:30–10:30 AM Pacific window, the run exits immediately. This prevents double-posting during the ~2-week overlap around DST transitions.

### 5.2 Platform Posting Modules

Each platform posting module is an independent TypeScript function with a standardized result type:

```
PlatformResult {
  platform: "x" | "linkedin" | "bluesky"
  success: boolean
  postId?: string        // Tweet ID, LinkedIn URN, or Bluesky URI
  error?: string         // Error message if failed
  retryCount: number     // Number of retries attempted (0-3)
}
```

#### X (Twitter) — via `agent-twitter-client`

| Step | Action | Details |
|------|--------|---------|
| 1 | Authenticate | Login with `X_USERNAME`, `X_PASSWORD`, `X_EMAIL` from secrets (**REQ-POST-X-2**) |
| 2 | Upload image | Upload the screenshot PNG (**REQ-SCHEDULE-6**) |
| 3 | Create tweet | Body text + link + all standard hashtags + conditional hashtags (**REQ-POST-X-3**) |
| 4 | Record result | Tweet ID on success, error message on failure (**REQ-POST-X-5**) |

The `agent-twitter-client` library uses X's internal web API (same endpoints as the browser). It does not require a paid API subscription (**REQ-POST-X-1**). X posting degrades gracefully — if it fails, LinkedIn and Bluesky continue unaffected (**REQ-POST-X-4**).

#### LinkedIn — via Marketing API

| Step | Action | Details |
|------|--------|---------|
| 1 | Check token validity | Use `LINKEDIN_ACCESS_TOKEN` from secrets (**REQ-POST-LI-2**) |
| 2 | If expired, refresh | Use `LINKEDIN_REFRESH_TOKEN` → get new access token → update GitHub Secret (**REQ-POST-LI-4**) |
| 3 | Register upload | Call Images API to get upload URL |
| 4 | Upload image binary | POST screenshot to the upload URL (**REQ-SCHEDULE-6**) |
| 5 | Create post | Body text + link + all hashtags, targeting org `urn:li:organization:90520614` (**REQ-POST-LI-3**) |
| 6 | Record result | Post URN on success, error on failure (**REQ-POST-LI-5**) |

#### Bluesky — via `@atproto/api`

| Step | Action | Details |
|------|--------|---------|
| 1 | Create session | Authenticate with `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` (**REQ-POST-BS-2**) |
| 2 | Upload blob | Upload screenshot as blob (**REQ-SCHEDULE-6**) |
| 3 | Create post | Body text + link only — **no hashtags** (**REQ-POST-BS-3**) |
| 4 | Record result | Post URI on success, error on failure (**REQ-POST-BS-4**) |

### 5.3 Retry & Error Handling

```
For each platform:

  Attempt 1 ───► Success? ──YES──► Record success
       │
       NO (wait ~30s)
       │
  Attempt 2 ───► Success? ──YES──► Record success
       │
       NO (wait ~60s)
       │
  Attempt 3 ───► Success? ──YES──► Record success
       │
       NO
       │
  Record failure (error msg + retryCount: 3)
```

- **3 retries with exponential backoff** per platform (~30s, ~60s between retries) (**REQ-RETRY-1**)
- Each platform is attempted **independently** — a failure on X does not prevent LinkedIn or Bluesky attempts (**REQ-RETRY-3**)
- Results are aggregated after all three platforms complete

**Platform Result Aggregation:**

| Outcome | Action | REQ Reference |
|---------|--------|---------------|
| All 3 succeed | Delete post JSON from `scheduled/` + screenshot from `media/` | **REQ-CLEANUP-1** |
| Any platform fails | Move post JSON to `failed/` with per-platform results added; retain screenshot in `media/` | **REQ-CLEANUP-2**, **REQ-RETRY-2** |

The per-platform results are written into the post JSON before moving to `failed/` (**REQ-RETRY-5**). All file operations are committed in the same workflow run (**REQ-CLEANUP-3**, **REQ-SCHEDULE-8**).

**Retrying from the web app (REQ-RETRY-4):**
The web app's "Retry Posting" button moves the failed post's JSON back to `scheduled/` with the same date (if not past) or the next available date. The Actions workflow will pick it up on that date.

### 5.4 LinkedIn Token Refresh

LinkedIn OAuth access tokens expire after 60 days. The posting script handles this automatically:

```
┌───────────────────────────┐
│ Attempt LinkedIn API call │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐     ┌──────────────────────────────┐
│ 401 Unauthorized?         ├─NO─►│ Proceed with posting          │
└───────────┬───────────────┘     └──────────────────────────────┘
            │ YES
            ▼
┌───────────────────────────┐
│ POST to LinkedIn token    │
│ endpoint with             │
│ LINKEDIN_REFRESH_TOKEN    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Receive new access_token  │
│ + new refresh_token       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Update GitHub Secrets via │
│ GitHub API:               │
│  - LINKEDIN_ACCESS_TOKEN  │
│  - LINKEDIN_REFRESH_TOKEN │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Retry LinkedIn posting    │
│ with new token            │
└───────────────────────────┘
```

Updating GitHub Secrets requires a token with `secrets:write` scope. This is accomplished using either a GitHub App token (installed on the repo) or a PAT with the `admin:org` or `repo` scope stored as a separate secret (e.g., `GH_TOKEN_SECRETS_WRITE`) (**REQ-POST-LI-4**).

---

## 6. Data Model

### Post JSON Schema (Phase 1 Output / Phase 2 Import)

Defined in `schemas/posts.schema.json`. Key points:

- Top-level: `generatedAt`, `generatedBy`, `totalPosts`, `config`, `posts[]` (**REQ-SCHEMA-6**)
- Each post: `id`, `category`, `text`, `hashtags`, `conditionalHashtags`, `link`, `media`, `metadata` (**REQ-SCHEMA-2**)
- **No `fullText` field** — full post text is assembled at post-time by the posting scripts (**REQ-SCHEMA-8**)
- **No `characterCount` block** — validation is body+link against 300 graphemes (**REQ-SCHEMA-8**)
- `media.filePath` pattern: `media/post-NNN.png` (**REQ-SCHEMA-5**)
- Enums enforced for `category`, `link.type`, `metadata.postFormat` (**REQ-SCHEMA-3**, **REQ-SCHEMA-4**)

### Scheduled Post File Format

Each approved post is committed as a single JSON file at `scheduled/YYYY-MM-DD.json`:

```
scheduled/2026-04-17.json
{
  "id": "post-012",
  "assignedDate": "2026-04-17",
  "category": "feature-highlight",
  "text": "...",
  "hashtags": [...],
  "conditionalHashtags": [...],
  "link": { ... },
  "media": { ... },
  "metadata": { ... }
}
```

The file name uses the assigned date. One post per day. The corresponding screenshot lives at the path specified in `media.filePath` (e.g., `media/post-012.png`).

### Failed Post File Format

When a post fails, it is moved to `failed/YYYY-MM-DD.json` with platform results added:

```
failed/2026-04-10.json
{
  "id": "post-005",
  "assignedDate": "2026-04-10",
  "category": "feature-highlight",
  "text": "...",
  ... (all original fields) ...
  "platformResults": {
    "x": {
      "success": false,
      "error": "Rate limit exceeded. Try again in 15 minutes.",
      "retryCount": 3
    },
    "linkedin": {
      "success": true,
      "postId": "urn:li:share:7052398176523",
      "retryCount": 0
    },
    "bluesky": {
      "success": true,
      "postId": "at://did:plc:abc123/app.bsky.feed.post/xyz789",
      "retryCount": 0
    }
  }
}
```

(**REQ-RETRY-5**, **REQ-SCHEMA-7**)

### localStorage Draft Schema

See Section 4.3 for the full localStorage schema. Drafts are keyed by `"babylonsocial:drafts"` and contain the array of imported posts with assigned dates. Drafts are transient — they exist only during the review session and are removed on approval or re-import (**REQ-STATUS-2**, **REQ-IMPORT-7**, **REQ-IMPORT-8**).

### No Database

All persistent state is in the GitHub repository:
- `scheduled/` = approved posts awaiting publication (**REQ-STATUS-3**)
- `failed/` = posts that failed on ≥1 platform (**REQ-STATUS-4**)
- `media/` = screenshot images

Transient state is in browser localStorage (drafts only, **REQ-STATUS-2**).

Successfully posted content is **deleted from the repo** — there is no `posted/` directory and no "Posted" status (**REQ-CLEANUP-1**, **REQ-STATUS-1**).

---

## 7. Repo Directory Structure

```
babylonAISocialHelper/
├── .github/
│   └── workflows/
│       └── post-daily.yml              # Phase 3: Daily posting cron workflow
│
├── webapp/                              # Phase 2: React web app (GitHub Pages source)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main.tsx                     # App entry point
│   │   ├── App.tsx                      # Root component + HashRouter
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # Auth state (token, user, team)
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── LoginScreen.tsx          # Mock 1
│   │   │   ├── AccessDenied.tsx         # Mock 2
│   │   │   ├── ImportPanel.tsx          # Mock 3
│   │   │   ├── ImportSummary.tsx        # Mock 4
│   │   │   ├── PostList.tsx             # Mock 5/6
│   │   │   ├── PostRow.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── BatchActionBar.tsx
│   │   │   ├── PostDetail.tsx           # Mock 7
│   │   │   ├── PostEditor.tsx
│   │   │   ├── PostPreview.tsx
│   │   │   ├── GraphemeCounter.tsx
│   │   │   ├── FailedPostDetail.tsx     # Mock 8
│   │   │   ├── PlatformResultRow.tsx
│   │   │   └── DeleteConfirmModal.tsx   # Mock 9
│   │   ├── services/
│   │   │   ├── github-api.ts            # GitHub API wrapper (read/write/delete)
│   │   │   ├── auth.ts                  # OAuth flow + team check
│   │   │   └── storage.ts              # localStorage draft management
│   │   ├── utils/
│   │   │   ├── grapheme-count.ts        # Intl.Segmenter wrapper
│   │   │   ├── date-assign.ts           # Date assignment logic
│   │   │   └── schema-validate.ts       # JSON schema validation
│   │   └── types/
│   │       └── post.ts                  # TypeScript type definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── scripts/                             # Phase 3: Posting scripts (Node.js/TS)
│   ├── post-daily.ts                    # Main orchestrator
│   ├── post-to-x.ts                     # X posting module
│   ├── post-to-linkedin.ts             # LinkedIn posting module
│   ├── post-to-bluesky.ts              # Bluesky posting module
│   ├── utils/
│   │   ├── retry.ts                     # Retry with exponential backoff
│   │   ├── linkedin-token-refresh.ts    # Token refresh + secret update
│   │   └── types.ts                     # PlatformResult type
│   ├── package.json
│   └── tsconfig.json
│
├── scheduled/                           # Approved posts (committed via web app)
│   ├── 2026-04-17.json
│   ├── 2026-04-18.json
│   └── ...
│
├── failed/                              # Failed posts (moved by Actions workflow)
│   └── ...
│
├── media/                               # Screenshot images
│   ├── post-001.png
│   ├── post-002.png
│   └── ...
│
├── schemas/
│   └── posts.schema.json                # JSON Schema (committed)
│
├── specs/
│   └── BabylonSocialHelper/
│       ├── goals.md                     # Project goals (committed)
│       ├── requirements.md              # Requirements (committed)
│       ├── architecture.md              # This document (committed)
│       └── mocks.html                   # UI mocks (committed)
│
├── skills/                              # AI skills (gitignored — local only)
│   └── content-generation/
│       └── SKILL.md
│
├── .gitignore
├── README.md
└── package.json                         # Root package.json (workspace config)
```

### Gitignored vs Committed

| Directory/File | Committed? | Reason |
|---------------|-----------|--------|
| `skills/` | **No** (gitignored) | AI skill files are local dev tooling |
| `webapp/node_modules/` | **No** (gitignored) | Standard npm convention |
| `scripts/node_modules/` | **No** (gitignored) | Standard npm convention |
| `scheduled/`, `failed/`, `media/` | **Yes** | Core data — the repo IS the database |
| `schemas/`, `specs/` | **Yes** | Project documentation and validation |
| `.github/workflows/` | **Yes** | Required for GitHub Actions |
| `webapp/dist/` | **Yes** (deployed to Pages) or built via CI | GitHub Pages source |

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB                                         │
│                                                                             │
│  ┌─────────────────────────┐    ┌──────────────────────────────────┐        │
│  │   GitHub Repository      │    │    GitHub Actions Runner         │       │
│  │                          │    │                                  │       │
│  │  webapp/ (source)        │    │  post-daily.yml                  │       │
│  │  scripts/ (source)       │    │    ├── Checkout repo             │       │
│  │  scheduled/ (data)  ◄────┼────┼────┤  Run posting scripts       │       │
│  │  failed/ (data)          │    │    └── Commit results            │       │
│  │  media/ (images)         │    │                                  │       │
│  │                          │    │  GitHub Secrets:                 │       │
│  └──────────┬───────────────┘    │    X_USERNAME, X_PASSWORD,       │       │
│             │                    │    X_EMAIL, LINKEDIN_ACCESS_     │       │
│             │ GitHub Pages       │    TOKEN, LINKEDIN_REFRESH_      │       │
│             │ deployment         │    TOKEN, LINKEDIN_ORG_ID,       │       │
│             ▼                    │    BLUESKY_HANDLE,               │       │
│  ┌──────────────────────────┐    │    BLUESKY_APP_PASSWORD,         │       │
│  │  GitHub Pages (CDN)      │    │    GH_TOKEN_SECRETS_WRITE        │       │
│  │                          │    └──────────────────────────────────┘       │
│  │  Static files:           │                                               │
│  │    index.html            │                                               │
│  │    assets/*.js           │                                               │
│  │    assets/*.css          │                                               │
│  └──────────┬───────────────┘                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌──────────────────────┐         ┌──────────────────────────────────┐
│  User's Browser       │         │   Cloudflare Workers (free tier) │
│                       │         │                                  │
│  React SPA            │◄───────►│   /api/auth/callback             │
│  (served from Pages)  │  OAuth  │     - Receives OAuth code        │
│                       │  proxy  │     - Exchanges for token         │
└──────────┬────────────┘         │     - Returns token to browser   │
           │                      │     - Stores: CLIENT_SECRET only │
           │ GitHub API           │     - Logs: nothing               │
           ▼                      └──────────────────────────────────┘
┌──────────────────────┐
│  GitHub REST API      │         ┌──────────────────────────────────┐
│                       │         │   Social Media Platforms          │
│  /repos/.../contents  │         │                                  │
│  /orgs/.../teams      │         │  X (Twitter) ◄── agent-twitter   │
│  /repos/.../actions   │         │  LinkedIn    ◄── Marketing API   │
└──────────────────────┘         │  Bluesky     ◄── AT Protocol     │
                                  └──────────────────────────────────┘
```

### Deployment Details

| Component | Platform | URL | Configuration |
|-----------|----------|-----|---------------|
| **Web App** | GitHub Pages | `https://{org}.github.io/babylonAISocialHelper/` | Built from `webapp/dist/`, deployed via Pages action or `gh-pages` branch |
| **OAuth Proxy** | Cloudflare Workers | `https://babylon-social-auth.{account}.workers.dev` | Worker secret: `GITHUB_CLIENT_SECRET`. Environment variable: `GITHUB_CLIENT_ID` |
| **Posting Workflow** | GitHub Actions | N/A (cron-triggered) | All platform credentials as GitHub Secrets |
| **Credentials** | GitHub Secrets | N/A | 9 secrets (see REQ-SCHEDULE-7) + 1 for secret rotation |

---

## 9. Security Considerations

| Area | Risk | Mitigation |
|------|------|------------|
| **OAuth token in browser** | Token could be stolen via XSS | Store in `sessionStorage` (not `localStorage`); Content Security Policy headers on Pages; no inline scripts (**REQ-AUTH-6**) |
| **OAuth token in URL** | Token leakage via referer headers or browser history | The Cloudflare Worker returns the token in the response body, never in URL parameters (**REQ-AUTH-6**) |
| **Client secret exposure** | GitHub OAuth client secret in client-side code | The client secret is stored in the Cloudflare Worker only, never shipped to the browser (**REQ-AUTH-3**) |
| **Platform credentials** | X password, LinkedIn tokens, Bluesky app password | All stored as GitHub Secrets — encrypted at rest, masked in logs, accessible only to Actions workflows (**REQ-SCHEDULE-7**) |
| **Team authorization** | Unauthorized users accessing the app | GitHub team membership check on every auth; non-members see Access Denied (**REQ-AUTH-4**, **REQ-AUTH-5**) |
| **No secrets in client code** | Hardcoded credentials in the React app | The web app contains only the OAuth `client_id` and Cloudflare Worker URL — both are public parameters. All sensitive operations go through authenticated GitHub API calls or the server-side Worker |
| **agent-twitter-client credentials** | X username/password stored as secrets (not OAuth tokens) | This is inherently riskier than OAuth — the password grants full account access. Mitigation: use a dedicated bot account or X's app-specific password if available; monitor for unauthorized logins; the password is never exposed outside GitHub Secrets |
| **LinkedIn token rotation** | Writing to GitHub Secrets from Actions | Requires a separate token (`GH_TOKEN_SECRETS_WRITE`) with limited scope; this token should be a fine-grained PAT scoped only to this repo's secrets |
| **Cloudflare Worker abuse** | Someone could spam the OAuth endpoint | The Worker only exchanges valid GitHub OAuth codes — invalid codes fail silently; rate limiting is built into Cloudflare's free tier |

---

## 10. Alternatives Considered

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| **Web framework** | React + TypeScript + Vite | Vue, Svelte, vanilla JS | React has the largest ecosystem and team familiarity; Vite provides fast builds and excellent GitHub Pages support; TypeScript catches errors at compile time |
| **OAuth proxy** | Cloudflare Workers (free tier) | AWS Lambda, Azure Functions, GitHub Device Flow | Cloudflare Workers are globally distributed, have generous free tier (100K req/day), require no infrastructure setup. Device Flow was considered but provides a worse UX (requires copying codes) |
| **State management** | React Context + localStorage | Redux, Zustand, MobX | The app has a small state surface — auth context and draft posts. External state libraries add complexity without proportional benefit at this scale |
| **Static hosting** | GitHub Pages | Netlify, Vercel, Cloudflare Pages | GitHub Pages is free, integrated with the same repo, and requires zero additional accounts or configuration |
| **Routing** | HashRouter | BrowserRouter with 404.html trick | HashRouter works natively with GitHub Pages without any server-side configuration or SPA redirect hacks |
| **X posting library** | `agent-twitter-client` (free) | X API v2 (paid: $100/mo Basic tier) | The X API has no free posting tier. `agent-twitter-client` uses X's internal web API at $0 cost. The trade-off is fragility (see Risks) |
| **LinkedIn posting** | Marketing API (free) | Third-party services (Buffer, Hootsuite) | Direct API gives full control; Marketing API is free for organic company page posts; no third-party dependency or cost |
| **Post data storage** | GitHub repo files (scheduled/, failed/) | SQLite, Firebase, Supabase | The repo-as-database pattern eliminates external dependencies; Git provides full audit history; GitHub API is already authenticated |
| **Draft storage** | Browser localStorage | IndexedDB, GitHub Gists | localStorage is simple and sufficient for a few dozen draft posts; no need for IndexedDB query capabilities; Gists would add unnecessary API calls |
| **Posting cron approach** | Dual cron triggers (PDT + PST) | Single cron + TZ-aware shell check, third-party cron service | Dual cron is the simplest approach that's purely declarative YAML; the workflow self-gates on current Pacific time to prevent double-posting |

---

## 11. Risks & Mitigations

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | **X endpoint breakage** — `agent-twitter-client` relies on X's internal web API, which X can change without notice | High | Medium | Graceful degradation: X failure does not block LinkedIn/Bluesky (**REQ-POST-X-4**). Fallback: switch to official X API v2 ($100/mo) if the library breaks permanently |
| 2 | **LinkedIn token expiry unhandled** — If both access and refresh tokens expire (>365 days without use) | Medium | Low | Automated refresh on each run (**REQ-POST-LI-4**); manual re-auth is needed only if refresh token itself expires. Monitor failed/ directory for LinkedIn auth errors |
| 3 | **GitHub API rate limits** — Excessive batch approvals or frequent page loads could exhaust 5,000 req/hr | Low | Low | 15-post batch cap (**REQ-APPROVE-6**); sequential commits with natural spacing; cache directory listings in the web app session |
| 4 | **localStorage data loss** — Browser clear, different device, or incognito mode loses all drafts | Medium | Medium | Drafts are transient by design — re-import from the original JSON file. Import summary warns that drafts are browser-local |
| 5 | **DST double-posting** — During DST transitions, both cron triggers fire on the same day | Medium | High (2× per year) | Workflow self-gates: checks current Pacific time and exits if outside the 09:30–10:30 window |
| 6 | **Playwright screenshot failures** — Pages that require interaction, have slow-loading WebGL, or are behind auth walls | Low | Medium | Skill includes fallback: if a page fails, choose an alternative sourceUrl. Wait for canvas render. Flag failures in the summary report |
| 7 | **GitHub OAuth App deauthorization** — User revokes OAuth access | Low | Low | App detects 401 responses and redirects to login screen; session is gracefully terminated |
| 8 | **Cloudflare Worker downtime** | Low | Low | Cloudflare has 99.99% uptime SLA. If the Worker is down, users cannot log in but scheduled posting continues (Actions don't use the Worker) |
| 9 | **Bluesky grapheme limit change** | Medium | Low | The 300-grapheme limit is enforced at validation time (**REQ-SKILL-8**). If Bluesky changes the limit, update the validation constant and re-validate existing posts |
| 10 | **Concurrent approval conflicts** — Two team members approve different posts for the same date | Low | Low | GitHub API commit will fail with a 409 conflict for the second writer. The web app should handle this error and prompt the user to refresh |

---

## 12. Files to Create

### Phase 1 — Content Generation

| File | Purpose |
|------|---------|
| `skills/content-generation/SKILL.md` | ✅ Already exists — AI agent instructions for post generation |
| `schemas/posts.schema.json` | ✅ Already exists — JSON Schema for validating generated posts |

### Phase 2 — Review Web App

| File | Purpose |
|------|---------|
| `webapp/package.json` | Dependencies: react, react-dom, react-router-dom, vite, typescript |
| `webapp/tsconfig.json` | TypeScript configuration |
| `webapp/vite.config.ts` | Vite build config with base path for GitHub Pages |
| `webapp/index.html` | HTML entry point |
| `webapp/src/main.tsx` | React app bootstrap / entry point |
| `webapp/src/App.tsx` | Root component with HashRouter and route definitions |
| `webapp/src/context/AuthContext.tsx` | React Context for OAuth token, user info, team membership |
| `webapp/src/components/Navbar.tsx` | Top nav bar: brand, Import button, user avatar, sign-out |
| `webapp/src/components/LoginScreen.tsx` | GitHub OAuth login page (Mock 1) |
| `webapp/src/components/AccessDenied.tsx` | Access denied page for non-team members (Mock 2) |
| `webapp/src/components/ImportPanel.tsx` | Drag-drop JSON file import (Mock 3) |
| `webapp/src/components/ImportSummary.tsx` | Import stats, date range, action buttons (Mock 4) |
| `webapp/src/components/PostList.tsx` | Post list with checkboxes and chronological ordering (Mock 5/6) |
| `webapp/src/components/PostRow.tsx` | Individual post row in the list |
| `webapp/src/components/FilterBar.tsx` | Status, category, date range filter controls |
| `webapp/src/components/BatchActionBar.tsx` | Batch approve / delete / clear selection bar |
| `webapp/src/components/PostDetail.tsx` | Individual post view, draft editing (Mock 7) |
| `webapp/src/components/PostEditor.tsx` | Editable fields: text, link, date, image |
| `webapp/src/components/PostPreview.tsx` | Generic social media preview card |
| `webapp/src/components/GraphemeCounter.tsx` | Live grapheme counter with red over-limit indicator |
| `webapp/src/components/FailedPostDetail.tsx` | Failed post view with per-platform results (Mock 8) |
| `webapp/src/components/PlatformResultRow.tsx` | Single platform result display (success/fail + error) |
| `webapp/src/components/DeleteConfirmModal.tsx` | Confirmation modal for post deletion (Mock 9) |
| `webapp/src/services/github-api.ts` | GitHub API wrapper: read contents, commit files, delete files |
| `webapp/src/services/auth.ts` | OAuth flow: redirect to GitHub, exchange code via Worker, team check |
| `webapp/src/services/storage.ts` | localStorage management for drafts |
| `webapp/src/utils/grapheme-count.ts` | `Intl.Segmenter`-based grapheme counting utility |
| `webapp/src/utils/date-assign.ts` | Date assignment logic: find last scheduled, assign sequential |
| `webapp/src/utils/schema-validate.ts` | JSON Schema validation (ajv or similar) |
| `webapp/src/types/post.ts` | TypeScript interfaces for Post, PlatformResult, etc. |

### Phase 2 — OAuth Proxy

| File | Purpose |
|------|---------|
| `oauth-worker/wrangler.toml` | Cloudflare Worker configuration |
| `oauth-worker/src/index.ts` | Worker: receives OAuth code, exchanges for token, returns to browser |
| `oauth-worker/package.json` | Dependencies for the Worker |

### Phase 3 — Posting Scripts & Workflow

| File | Purpose |
|------|---------|
| `.github/workflows/post-daily.yml` | GitHub Actions workflow: dual cron, post orchestration |
| `scripts/package.json` | Dependencies: agent-twitter-client, @atproto/api, @octokit/rest |
| `scripts/tsconfig.json` | TypeScript configuration for scripts |
| `scripts/post-daily.ts` | Main orchestrator: find post, call modules, aggregate results, cleanup |
| `scripts/post-to-x.ts` | X posting: login → upload image → create tweet |
| `scripts/post-to-linkedin.ts` | LinkedIn posting: token check → upload → create post |
| `scripts/post-to-bluesky.ts` | Bluesky posting: create session → upload blob → create post |
| `scripts/utils/retry.ts` | Retry with exponential backoff utility |
| `scripts/utils/linkedin-token-refresh.ts` | LinkedIn token refresh + GitHub Secret update |
| `scripts/utils/types.ts` | Shared TypeScript types (PlatformResult, PostData, etc.) |

### Repo Root

| File | Purpose |
|------|---------|
| `.gitignore` | Ignore: node_modules, skills/, .env, dist/ (if built locally) |
| `README.md` | Project overview and setup instructions |
| `package.json` | Root workspace config (if using npm workspaces for webapp/ + scripts/) |

---

## 13. Testing Strategy Overview

### Phase 1 — Content Generation Skill

| Test Type | What to Test |
|-----------|-------------|
| **Schema validation** | Run `ajv` or equivalent against generated `posts.json` using `posts.schema.json` — all posts must pass |
| **Screenshot existence** | Verify that every `media.filePath` referenced in the JSON exists on disk as a non-empty PNG |
| **Content mix** | Assert category distribution is 40/20/40 (±1) |
| **De-duplication** | Assert no `metadata.topic` repeats within any 30-day window |
| **Grapheme limit** | Assert every post's body text + link URL ≤ 300 graphemes |
| **Hashtag rules** | Assert all posts have 8 standard hashtags; only `community-demo` posts have `#BuiltWithBabylon` |
| **No fullText field** | Assert no post contains `fullText` or `characterCount` fields |

### Phase 2 — Review Web App

| Test Type | What to Test |
|-----------|-------------|
| **Component tests** (Vitest + Testing Library) | Render each component with mock data; verify correct display of badges, buttons, counters |
| **GraphemeCounter unit tests** | Test with ASCII, emoji (multi-codepoint), and edge cases to verify accurate counting |
| **Import logic unit tests** | Test date assignment with various existing scheduled dates, gap filling, edge cases |
| **Schema validation tests** | Test with valid and invalid JSON payloads |
| **Auth flow integration test** | Mock the Cloudflare Worker and GitHub API; verify token storage and team check |
| **E2E tests** (Playwright) | Full user flows: login → import → review → edit → approve → verify in post list |

### Phase 3 — Posting Scripts

| Test Type | What to Test |
|-----------|-------------|
| **Unit tests per module** | Mock platform APIs; verify each module constructs correct API payloads, handles errors, returns `PlatformResult` |
| **Retry logic tests** | Verify exponential backoff timing, max retry cap, and correct error propagation |
| **LinkedIn token refresh tests** | Mock expired token response → verify refresh flow → verify secret update API call |
| **Dry-run mode** | The orchestrator should support a `--dry-run` flag that does everything except actually calling platform APIs — validates file discovery, JSON parsing, and text assembly without posting |
| **Integration tests** | Run against real platform sandbox/test accounts (where available) to verify end-to-end posting |
