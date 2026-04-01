# Babylon.js Social Media Helper — Project Goals

## Overview

An end-to-end system for generating and scheduling daily social media posts for Babylon.js across three platforms: **X (Twitter)**, **LinkedIn**, and **Bluesky**. The system produces a user-specified number of days of content at a time, matching the established Babylon.js social media voice, and provides a web-based interface for reviewing and approving posts. Approved posts are automatically published daily via GitHub Actions.

---

## Social Media Accounts

| Platform | Account URL |
|----------|-------------|
| X (Twitter) | https://x.com/babylonjs |
| LinkedIn | https://www.linkedin.com/company/90520614/admin/dashboard/ |
| Bluesky | https://bsky.app/profile/babylonjs.bsky.social |

---

## The Babylon.js Voice

Based on analysis of the past 90 days of posts (Dec 2025–Mar 2026) across X and Bluesky, the Babylon.js social voice has the following characteristics:

### Tone & Style
- **Enthusiastic and excited** — generous use of exclamation marks (often 2–3), capital letters for emphasis ("SUPER", "SOOO", "WAY easier")
- **Accessible and inclusive** — avoids overly technical jargon; frames features in terms of what they enable rather than how they work internally
- **Conversational and direct** — speaks directly to the audience ("Did you know…", "You asked for it, you got it!", "We cannot wait to see what you create")
- **Community-centric** — positions Babylon.js as belonging to everyone ("It belongs to all of us", "open source")
- **Short and punchy** — one to two sentences maximum for the body text
- **Action-oriented** — invites the reader to try, check out, or explore something

### Emoji Usage
- Used in approximately **1 in every 4 posts**
- Common emojis: 😍, 🤯
- Never more than 2–3 emoji per post
- Used to amplify excitement, not to replace words

### Post Formats (aim for a mix)
1. **Feature statement** — `"Babylon.js 9.0 brings Clustered Lighting. A SUPER efficient way to add many lights to your scenes! 🤯🤯🤯"`
2. **"Did you know…" / Question** — `"Did you know that you can attach behaviors to meshes in Babylon?"` + doc link
3. **"Check out…"** — `"Check out the different types of cameras available to you in Babylon.js!"` + doc link
4. **Demo showcase** — `"Have you seen this awesome [feature] demo?"` + demo link
5. **Community/open-source pride** — `"The Babylon platform is (and will always be) open source. It belongs to all of us. So why not join us in making it better!"`
6. **Call-to-action** — Linking to docs, playground, or contribution guide

### Release-Period Patterns (for reference, not the primary content type)
- Countdown cadence with `#Babylon9Release` hashtag
- One feature teased per day leading up to release
- Superlatives and excitement: "SUPER efficient," "SOOO sweet," "buttery smooth"

### Posting Cadence
- **1 post per day, 7 days a week**
- **10:00 AM PST** every day

---

## Content Strategy

### Content Mix (per batch of posts)
| Category | Percentage | Description |
|----------|-----------|-------------|
| Feature Highlights | 40% | Specific Babylon.js engine features, capabilities, and what they enable |
| Community Demos | 20% | Forum posts, community projects, websites, and games built with Babylon.js |
| Docs & Tutorials | 40% | Documentation pages, guided learning, tutorials, playground examples |

### Content Sources
The AI agent must pull content from these sources:

| Source | URL | Content Type |
|--------|-----|-------------|
| Documentation | https://doc.babylonjs.com | Features, tutorials, guides |
| Playground | https://playground.babylonjs.com | Interactive code examples |
| Forum | https://forum.babylonjs.com | Community projects, Q&A, showcase posts |
| API Reference | https://doc.babylonjs.com/typedoc/modules/BABYLON | API classes and methods |
| Feature Demos | https://www.babylonjs.com/featureDemos/ | Official interactive demos |
| Blog | https://medium.com/@babylonjs | Release announcements, deep dives |
| Community Demos | https://www.babylonjs.com/community | Curated community projects |
| YouTube | Babylon.js YouTube channel | Tutorials, release videos |
| GitHub | https://github.com/BabylonJS/Babylon.js | Releases, changelogs |

### Hashtags

**Standard hashtags (every post):**
```
#3D #WebDev #gamedev #indiedev #WebDevelopment #webgl #gamedevelopment #IndieDevs
```

**Conditional hashtag:**
- `#BuiltWithBabylon` — added **only** when the post showcases a community demo, website, or game built with Babylon.js. Does **not** apply to Babylon.js engine features or documentation content.

### De-duplication Rules
- A specific topic/feature (e.g., "Node Material Editor") must **not appear more than once per month** (30-day window)
- The same topic **may** repeat across different months
- A given documentation page or playground URL should not be linked more than once per month

### Media Requirements
- Every post **must** include a **screenshot** of a real experience, demo, or playground
- **Screenshots are captured automatically via Playwright** during content generation (Phase 1 skill). The AI agent navigates to each `media.sourceUrl`, waits for the page/canvas to render, and captures a screenshot.
- **No AI-generated images**
- **No stock photos**
- **No screenshots of walls of text** — must be visually inviting
- Screenshots should be taken from: playground examples, documentation page demos/visuals, community project live sites, feature demo pages
- Videos are out of scope for Phase 1 (future enhancement)

### Link Requirements
Each post must include exactly one link:
1. **Preferred:** A link to a live interactive experience (playground demo, feature demo, or community project URL)
2. **Fallback:** A link to the relevant documentation page (if no live experience exists)

### Post Identity
- Posts are **identical across all three platforms** (X, LinkedIn, Bluesky). The same text, image, link, and hashtags are used everywhere.
- No platform-specific tailoring is required.

---

## Platform Constraints

| Platform | Character Limit | Notes |
|----------|----------------|-------|
| X (Twitter) | 280 chars (standard) / 4,000 (Premium) | URLs count as 23 chars; verify account tier |
| Bluesky | 300 graphemes | Links count toward limit; hashtags are not conventionally used |
| LinkedIn | 3,000 chars | Most permissive |

- **Body text + link** must fit within **300 graphemes** (Bluesky limit — the most restrictive constraint)
- **Hashtags are metadata** — stored in the JSON but appended **per-platform at post-time**:
  - **X**: Append all standard hashtags (+ conditional) — plenty of room
  - **LinkedIn**: Append all standard hashtags (+ conditional)
  - **Bluesky**: **Skip hashtags entirely** — Bluesky doesn't use them conventionally
- The `fullText` field is **not stored in the JSON** — it is assembled at post-time by the posting scripts (body + platform-appropriate hashtags)
- Posts observed on the actual accounts regularly exceed 280 chars (likely X Premium); verify account tier during implementation

---

## Phase 1 — AI Content Generation Skill

### Goal
Create a detailed `SKILL.md` file that instructs an AI agent to generate a configurable number of days' worth of social media posts and output them as a structured JSON file.

### Inputs
- **Number of days** of posts to generate (must be specified by the user — no default)

### JSON Output Schema
A single JSON file containing all posts:

```json
{
  "generatedAt": "2026-03-30T10:00:00Z",
  "generatedBy": "Babylon.js Social Media Agent",
  "totalPosts": 90,
  "posts": [
    {
      "id": "post-001",
      "category": "feature-highlight | community-demo | docs-tutorial",
      "text": "The short post body text matching the Babylon.js voice",
      "hashtags": ["#3D", "#WebDev", "#gamedev", "#indiedev", "#WebDevelopment", "#webgl", "#gamedevelopment", "#IndieDevs"],
      "conditionalHashtags": ["#BuiltWithBabylon"],
      "link": {
        "url": "https://playground.babylonjs.com/#ABC123",
        "type": "playground | demo | docs | forum | blog | community-project | youtube",
        "title": "Human-readable description of the linked content"
      },
      "media": {
        "type": "screenshot",
        "sourceUrl": "URL of the page/demo the screenshot was taken from",
        "description": "Alt-text description of the screenshot for accessibility",
        "filePath": "media/post-001.png"
      },
      "metadata": {
        "topic": "Node Material Editor",
        "babylonFeatureArea": "Materials",
        "contentSource": "https://doc.babylonjs.com/features/featuresDeepDive/materials/node_material",
        "usesEmoji": true,
        "postFormat": "feature-statement | question | check-out | demo-showcase | community-pride | call-to-action"
      }
    }
  ]
}
```

### Skill Constraints
- Must enforce the content mix percentages (40% features / 20% community / 40% docs)
- Must enforce the 1-per-month duplicate topic rule using the `metadata.topic` field
- Must apply emoji to approximately 25% of posts
- Must use a mix of post formats (statement, question, check-out, demo-showcase, community-pride, CTA)
- Must include `#BuiltWithBabylon` only on community demo posts
- Must include a screenshot source for every post
- Must include a link to a live experience or docs page for every post
- Must produce valid JSON parsable by Phase 2

---

## Phase 2 — Review Web App

### Goal
A static web application hosted on **GitHub Pages** that lets the Babylon.js core team review, edit, and approve AI-generated posts. The app does **not** post to social media directly — it commits approved posts to the GitHub repo, where GitHub Actions handles the actual publishing.

### Tech Stack
- No preference on framework (React, Vue, Svelte, vanilla — whatever works best)
- **Must be a static web app** — no backend/server component
- Hosted on **GitHub Pages** from the same repo
- Uses the **GitHub API** (via the user's OAuth token) to read/write post data in the repo

### Authentication & Authorization
- Users must **log in via GitHub OAuth** (using a GitHub OAuth App)
- After login, the app verifies that the authenticated user is a member of: **https://github.com/orgs/BabylonJS/teams/core-team-microsoft**
- Unauthorized users are shown an access-denied page
- No anonymous access
- GitHub OAuth requires a small serverless function for token exchange (GitHub Pages Function, or a lightweight proxy) — **or** use GitHub's Device Flow to avoid a server-side component entirely

### Core Features

#### 1. Post Ingestion
- Upload/import the Phase 1 JSON file
- Automatically assign post dates:
  - Look at the `scheduled/` directory in the repo to find the last scheduled date
  - Set the first new post's date to the **next available day** after that
  - Subsequent posts are assigned sequentially: 1 post per day, 7 days a week
  - All posts scheduled for **10:00 AM PST**
- If a post's assigned date already has a post file in `scheduled/`, the system **automatically skips** to the next available day
- Assigned dates are shown to the user

#### 2. Post List View
- Display all posts (from `scheduled/` and `posted/` directories) in chronological order
- Each post shows:
  - Scheduled date
  - Post text preview (truncated)
  - Screenshot thumbnail
  - Category badge (Feature / Community Demo / Docs)
  - Link URL
  - Post status indicator
- **Checkbox selection** on each post for batch operations
- **Select All** checkbox at the top of the list
- Filtering by: status, category, date range

#### 3. Individual Post View / Preview
- Full post text displayed
- Screenshot preview
- Link preview (clickable)
- **Generic post preview** — shows the post as it will appear (body text, image, link). Platform-specific preview layouts are a future enhancement.
- Single unified post entry (not 3 separate entries per platform)

#### 4. Post Editing
- Users can edit any post **at the post level** (not per-platform):
  - Edit post text
  - Change/replace the image
  - Change the link URL
  - Change the scheduled date
- Edits are committed back to the repo via the GitHub API
- **Delete** — remove a post from the schedule (with confirmation dialog)

#### 5. Approving Posts — Individual
- Each post has an **"Approve"** button
- Clicking it commits the post JSON + screenshot to the `scheduled/` directory in the repo, dated for its assigned day
- The GitHub Actions cron job will pick it up and post it on the scheduled date

#### 6. Approving Posts — Batch
- Select multiple posts via checkboxes (or Select All)
- A batch action bar appears with:
  - **"Approve Selected"** — commits all selected posts to `scheduled/`
  - **"Delete Selected"** — removes selected posts (with confirmation)

#### 7. Post Status Tracking
Each post has a visible status indicator:

| Status | Meaning |
|--------|---------|
| **Draft** | Imported but not yet approved (lives in browser localStorage only) |
| **Scheduled** | Approved and committed to `scheduled/` — awaiting the GitHub Action |
| **Failed** | GitHub Action failed to post on one or more platforms after retries (moved to `failed/`) |

Note: There is no "Posted" status in the repo — successfully posted content is **deleted** from the repo to keep it lean. The `failed/` directory contains posts that need manual attention, with per-platform error details in the JSON.

### UI/UX Requirements
- Clean, minimal interface
- Platform preview should provide a **generic preview** of the post (text, image, link). Platform-specific preview layouts (approximating X, LinkedIn, Bluesky) are a future enhancement.
- Responsive layout (primarily desktop use)
- Dark mode support (nice to have, not required)

### Hosting
- **GitHub Pages** — served from the same repo that contains the posts and GitHub Actions

---

## Phase 3 — GitHub Actions Auto-Posting

### Goal
A GitHub Actions workflow that runs daily on a cron schedule, picks up the next approved post from the `scheduled/` directory, and publishes it to all three platforms.

### Posting Mechanism

#### X (Twitter)
- **Library:** `agent-twitter-client` (goat-x) — uses X's internal web API
- **Auth:** X username + password stored as GitHub Secrets
- **No paid API required** — uses the same endpoints as the X web app
- Supports posting tweets with images

#### LinkedIn
- **API:** LinkedIn Marketing API (Posts API + Images API)
- **Auth:** OAuth 2.0 access token + refresh token stored as GitHub Secrets
- **Cost:** Free — no paid tier required for organic company page posting
- **Required scope:** `w_organization_social`
- **Setup:** Create a LinkedIn Developer App, link it to the Babylon.js company page, generate an access token
- **Token refresh:** The posting script automatically refreshes expired tokens using the stored refresh token and updates the GitHub Secret via the GitHub API. Requires a GitHub token with `secrets` write permission (or a GitHub App token).

#### Bluesky
- **Library:** `@atproto/api`
- **Auth:** Handle + app password stored as GitHub Secrets
- **Cost:** Free
- **Setup:** Generate an app password at https://bsky.app/settings/app-passwords

### Workflow Details

1. **Cron schedule:** Runs daily — **timezone-aware for Pacific Time**:
   - **Winter (Nov–Mar):** `18:00 UTC` = 10:00 AM PST
   - **Summer (Mar–Nov):** `17:00 UTC` = 10:00 AM PDT
   - Implementation: use two cron triggers or a timezone-aware approach to always post at 10:00 AM Pacific
2. **Find today's post:** Look in `scheduled/` for a post file dated today (e.g., `scheduled/2026-04-15.json`)
3. **If no post for today:** Exit cleanly with no error
4. **Post to all 3 platforms:** Run posting in parallel
   - Upload image first, then create text post with image attached
   - For each platform, record success/failure in the post JSON
5. **Clean up on success:** Delete the post JSON and its screenshot from the repo (no `posted/` directory — repo stays lean)
6. **Move on failure:** Move the post file to `failed/` with per-platform error details
7. **Commit results:** Commit the deletion or move and push

### Credential Storage

All credentials are stored as **GitHub Secrets** (encrypted, never exposed in logs):

| Secret | Description |
|--------|-------------|
| `X_USERNAME` | X (Twitter) account username |
| `X_PASSWORD` | X (Twitter) account password |
| `X_EMAIL` | X (Twitter) account email (for 2FA challenges) |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth 2.0 access token |
| `LINKEDIN_REFRESH_TOKEN` | LinkedIn OAuth 2.0 refresh token (for auto-renewal) |
| `LINKEDIN_ORGANIZATION_ID` | LinkedIn company page org ID (`90520614`) |
| `BLUESKY_HANDLE` | Bluesky handle (`babylonjs.bsky.social`) |
| `BLUESKY_APP_PASSWORD` | Bluesky app password |

### Repo Directory Structure

```
├── .github/
│   └── workflows/
│       └── post-daily.yml          # Cron workflow: post to all platforms
├── scheduled/                       # Approved posts awaiting publication
│   ├── 2026-04-15.json             # Post data for April 15
│   ├── 2026-04-16.json             # Post data for April 16
│   └── ...
├── failed/                          # Failed posts (for retry/investigation)
│   └── ...
├── media/                           # Screenshot images referenced by scheduled posts
│   ├── post-001.png
│   ├── post-002.png
│   └── ...
├── scripts/                         # Node.js posting scripts used by the Action
│   ├── post-to-x.ts
│   ├── post-to-linkedin.ts
│   ├── post-to-bluesky.ts
│   └── post-daily.ts               # Main orchestrator
├── webapp/                          # Phase 2 static web app (GitHub Pages source)
│   └── ...
├── schemas/                         # JSON schemas
│   └── posts.schema.json
├── specs/                           # Project specs
│   └── BabylonSocialHelper/
│       └── goals.md
└── skills/                          # AI skills (gitignored — local only)
    └── content-generation/
        └── SKILL.md
```

### Error Handling
- If posting fails on one platform, retry up to **3 times with exponential backoff** before marking that platform as failed
- If **any platform fails** after retries, the post is moved to `failed/` with per-platform status recorded in the JSON
- If **all platforms succeed**, the post JSON and its screenshot are **deleted from the repo** (no `posted/` directory needed — the repo stays lean)
- The GitHub Actions run log provides full debugging info
- No automated notifications on failure — the team checks the Action logs and `failed/` directory manually

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                     Phase 1                         │
│                                                     │
│  AI Agent + SKILL.md                                │
│    ├── Crawls: docs, forum, playground, demos, blog │
│    ├── Generates: N posts in Babylon.js voice       │
│    ├── Screenshots: visually inviting experiences   │
│    ├── Enforces: content mix, de-dup, emoji rules   │
│    └── Outputs: posts.json + media/*.png            │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │ posts.json
                       ▼
┌─────────────────────────────────────────────────────┐
│                     Phase 2                         │
│                                                     │
│  Static Web App (GitHub Pages)                      │
│    ├── GitHub OAuth login (team membership check)   │
│    ├── Import posts.json                            │
│    ├── Auto-assign dates                            │
│    ├── Generic post preview                         │
│    ├── Edit / delete posts                          │
│    ├── Approve → commits to scheduled/ in repo      │
│    ├── Track status via repo directory structure     │
│    └── Filter by status, category, date range       │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │ scheduled/*.json + media/*.png
                       ▼
┌─────────────────────────────────────────────────────┐
│                     Phase 3                         │
│                                                     │
│  GitHub Actions (daily cron — DST-aware Pacific)  │
│    ├── Finds today's post in scheduled/             │
│    ├── Posts to X via agent-twitter-client           │
│    ├── Posts to LinkedIn via Marketing API           │
│    ├── Posts to Bluesky via @atproto/api             │
│    ├── Retries up to 3× with backoff on failure     │
│    ├── Deletes post + screenshot on success          │
│    ├── Moves to failed/ on failure                   │
│    └── Commits changes back to repo                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Sequence

### Phase 1 — Content Generation Skill
1. Research and catalog Babylon.js content sources (docs pages, playground examples, forum demos, community projects, blog posts, YouTube videos)
2. Define the `SKILL.md` with detailed instructions, voice guidelines, content mix rules, and output schema
3. Test the skill by generating a 7-day sample batch
4. Validate output against schema and content rules
5. Generate full batch

### Phase 2 — Review Web App
1. Scaffold the web app project
2. Implement GitHub OAuth login + BabylonJS team membership check
3. Build the JSON import and post list view with filtering
4. Build the individual post view with platform preview dropdown
5. Implement inline editing and delete functionality
6. Implement "Approve" action that commits posts to `scheduled/` via GitHub API
7. Implement batch approve and batch delete
8. Implement post status tracking by reading `scheduled/`, `posted/`, and `failed/` directories
9. Deploy to GitHub Pages

### Phase 3 — GitHub Actions Auto-Posting
1. Create the Node.js posting scripts for each platform
2. Implement X posting via `agent-twitter-client`
3. Implement LinkedIn posting via the Marketing API
4. Implement Bluesky posting via `@atproto/api`
5. Create the orchestrator script that reads `scheduled/`, posts, and moves files
6. Create the GitHub Actions workflow with daily cron
7. Set up GitHub Secrets for all platform credentials
8. End-to-end testing across all three platforms

---

## Scope Boundaries

### In Scope
- AI content generation skill/prompt (Phase 1)
- JSON output format for post data
- Static web app for review, editing, and approval (Phase 2)
- GitHub OAuth with BabylonJS team-based authorization
- GitHub Pages hosting for the web app
- GitHub Actions daily cron for automated posting (Phase 3)
- Posting to X via `agent-twitter-client` (no paid API)
- Posting to LinkedIn via free Marketing API
- Posting to Bluesky via `@atproto/api`
- All credentials stored as GitHub Secrets
- Post status tracking via repo directory structure (scheduled / failed)
- Batch approve and batch delete
- Generic post preview (platform-specific previews deferred)
- Automated screenshot capture via Playwright for post images
- Post filtering by status, category, date range
- Post deletion with confirmation
- Automatic retry (3× with backoff) on posting failures
- LinkedIn token auto-refresh via refresh token
- Auto-cleanup of successfully posted content from repo

### Out of Scope
- Video content (future enhancement)
- Per-platform post customization (all posts use the same body text; hashtags are appended per-platform at post-time)
- Platform-specific preview layouts in the web app (future enhancement)
- Analytics / engagement tracking
- Comment monitoring or community management
- Any paid API subscriptions or third-party scheduling services
- Dark mode (nice to have, not required)
- Automated failure notifications (check Action logs manually)
- Pause/resume capability for scheduled posts

### Cost
- **$0** — all components are free:
  - GitHub Pages (free for public/private repos)
  - GitHub Actions (2,000 free minutes/month; ~1 min/day = ~30 min/month)
  - LinkedIn API (free for organic company page posting)
  - Bluesky API (free)
  - X posting via `agent-twitter-client` (free, uses web API)

### Risks
- **X (`agent-twitter-client`):** Uses X's internal web API, not the official paid API. X could change endpoints or block automated access. This is the most fragile part of the system. **Mitigation:** graceful degradation — if X posting fails, LinkedIn and Bluesky continue unaffected. The library is actively maintained; if it breaks, the official X API (pay-per-use) is a documented fallback option.
- **LinkedIn token expiry:** LinkedIn OAuth tokens expire after 60 days. **Mitigation:** automated refresh via refresh token stored in GitHub Secrets; the posting script auto-refreshes and updates the secret.

---

## Open Questions / Items to Resolve During Implementation

1. **X account tier** — Verify whether @babylonjs has X Premium (affects character limit: 280 vs 4,000). Current posts exceed 280 chars, suggesting Premium.
2. **LinkedIn API access** — Marketing API access requires review/approval from LinkedIn. This may take days/weeks. Start the application process early.
3. **Bluesky character limit** — Verify the current Bluesky post character limit (was 300 graphemes, may have changed).

---

## Key Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Posts identical across all platforms | Simplicity; avoids 3x content management overhead |
| 2 | JSON output format (not Markdown) | Machine-readable for Phase 2 ingestion; human review happens in web app |
| 3 | Images only (no video) for Phase 1 | Reduces complexity; video can be added later |
| 4 | GitHub OAuth with team check | Restricts access to authorized BabylonJS core team members |
| 5 | No backend server | Static web app with client-side or serverless API calls |
| 6 | 10:00 AM Pacific daily posting (DST-aware) | Matches existing posting cadence; adjusts cron for DST |
| 7 | Date auto-assignment from last scheduled post | Ensures continuity; no manual date management needed |
| 8 | Topic de-duplication per calendar month | Keeps content fresh without being overly restrictive |
| 9 | Post-level editing only (not per-platform) | Consistent experience across platforms; simpler UX |
| 10 | Direct API scheduling via GitHub Actions (no third-party service) | Full control; no external service dependency or cost |
| 11 | Content mix enforced (40/20/40) | Balanced variety between features, community, and docs |
| 12 | `#BuiltWithBabylon` only on community posts | Keeps hashtag meaningful and targeted |
| 13 | Hashtags are metadata — appended per-platform at post-time | Body+link must fit 300 graphemes (Bluesky limit); X/LinkedIn get hashtags, Bluesky doesn't |
| 14 | Screenshots captured automatically via Playwright | Fully automated Phase 1; no manual screenshot step |
| 15 | Partial failures move to `failed/` | Simplifies directory structure; any failure = needs manual attention |
| 16 | Successful posts are deleted from the repo | Keeps repo lean; no `posted/` directory needed |
| 17 | LinkedIn token auto-refresh via refresh token | Prevents 60-day token expiry from silently breaking posting |
| 18 | `agent-twitter-client` for X posting (no paid API) | X API has no free tier — pay-per-use only; scraping library is $0 |
| 19 | Retry 3× with backoff before marking as failed | Handles transient network/API errors gracefully |
| 20 | Generic post preview only (platform-specific previews deferred) | Reduces Phase 2 scope; platform previews added later |
| 21 | Drafts in browser localStorage only (not committed to repo) | Simplicity; drafts are transient during review sessions |
| 22 | No failure notifications (check Action logs manually) | Simplicity for Phase 1; can add GitHub Issue alerts later |
| 23 | No pause capability (delete/reschedule manually) | Simplicity; edge case that doesn't justify added complexity |
