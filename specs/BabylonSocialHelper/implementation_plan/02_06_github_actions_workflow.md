# Task 2.6: GitHub Actions Workflow

## Goal
Create the GitHub Actions workflow file that triggers daily at 10:00 AM Pacific (DST-aware), checks out the repo, installs dependencies, and runs the posting orchestrator script.

## Requirements addressed
REQ-SCHEDULE-1, REQ-SCHEDULE-2, REQ-SCHEDULE-7, REQ-SCHEDULE-8

## Background
The Babylon.js Social Media Helper uses a GitHub Actions cron workflow to post one social media post per day at 10:00 AM Pacific Time across X, LinkedIn, and Bluesky. The workflow file lives at `.github/workflows/post-daily.yml`.

**DST-aware scheduling:** Pacific Time switches between PST (UTC-8, Nov–Mar) and PDT (UTC-7, Mar–Nov). To always post at 10:00 AM Pacific, the workflow uses dual cron triggers:
- `0 17 * * *` (17:00 UTC = 10:00 AM PDT during summer)
- `0 18 * * *` (18:00 UTC = 10:00 AM PST during winter)

Both triggers fire every day. The posting orchestrator (Task 2.5) includes a self-gating check: it reads the current Pacific time and exits immediately if it's outside the 09:30–10:30 AM window. This prevents double-posting during the ~2-week overlap around DST transitions.

This task depends on all prior Phase 2 tasks (2.1–2.5) for the posting scripts.

## Files to modify/create

- `.github/workflows/post-daily.yml` — The daily posting workflow

## Implementation details

### 1. Create `.github/workflows/post-daily.yml`

**Workflow name:** `Daily Social Media Post`

**Triggers:**
```yaml
on:
  schedule:
    - cron: '0 17 * * *'   # 17:00 UTC = 10:00 AM PDT (summer)
    - cron: '0 18 * * *'   # 18:00 UTC = 10:00 AM PST (winter)
  workflow_dispatch:        # Allow manual triggering from GitHub UI
    inputs:
      date:
        description: 'Override date (YYYY-MM-DD) for manual posting'
        required: false
        type: string
      dry_run:
        description: 'Dry run (skip actual posting)'
        required: false
        type: boolean
        default: false
```

The `workflow_dispatch` trigger allows manual runs from the GitHub Actions UI, useful for testing and retrying failed posts.

**Permissions:**
```yaml
permissions:
  contents: write        # Read/write repo contents (for git push)
```

**Jobs:**

Define a single job `post`:

```yaml
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
```

**Step 1: Checkout the repository**
```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GH_TOKEN_SECRETS_WRITE || github.token }}
    fetch-depth: 1
```
Use the `GH_TOKEN_SECRETS_WRITE` token if available (needed for LinkedIn token refresh to update secrets). Fall back to the default `github.token` otherwise. The `github.token` is sufficient for reading/writing repo contents and pushing commits.

**Step 2: Set up Node.js**
```yaml
- name: Set up Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: scripts/package-lock.json
```

**Step 3: Install dependencies**
```yaml
- name: Install dependencies
  working-directory: scripts
  run: npm ci
```

**Step 4: Configure git for commits**
```yaml
- name: Configure git
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
```

**Step 5: Run the posting orchestrator**
```yaml
- name: Post to social media
  working-directory: scripts
  env:
    X_USERNAME: ${{ secrets.X_USERNAME }}
    X_PASSWORD: ${{ secrets.X_PASSWORD }}
    X_EMAIL: ${{ secrets.X_EMAIL }}
    LINKEDIN_ACCESS_TOKEN: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}
    LINKEDIN_REFRESH_TOKEN: ${{ secrets.LINKEDIN_REFRESH_TOKEN }}
    LINKEDIN_CLIENT_ID: ${{ secrets.LINKEDIN_CLIENT_ID }}
    LINKEDIN_CLIENT_SECRET: ${{ secrets.LINKEDIN_CLIENT_SECRET }}
    LINKEDIN_ORGANIZATION_ID: ${{ secrets.LINKEDIN_ORGANIZATION_ID }}
    BLUESKY_HANDLE: ${{ secrets.BLUESKY_HANDLE }}
    BLUESKY_APP_PASSWORD: ${{ secrets.BLUESKY_APP_PASSWORD }}
    GH_TOKEN_SECRETS_WRITE: ${{ secrets.GH_TOKEN_SECRETS_WRITE }}
    GITHUB_REPOSITORY: ${{ github.repository }}
  run: |
    ARGS=""
    if [ "${{ inputs.dry_run }}" == "true" ]; then
      ARGS="$ARGS --dry-run"
    fi
    if [ -n "${{ inputs.date }}" ]; then
      ARGS="$ARGS --date ${{ inputs.date }}"
    fi
    npx tsx post-daily.ts $ARGS
```

### 2. Secrets documentation

Include a comment block at the top of the workflow file listing all required secrets:

```yaml
# Required GitHub Secrets:
# - X_USERNAME:              X (Twitter) account username
# - X_PASSWORD:              X (Twitter) account password
# - X_EMAIL:                 X (Twitter) account email (for 2FA)
# - LINKEDIN_ACCESS_TOKEN:   LinkedIn OAuth 2.0 access token
# - LINKEDIN_REFRESH_TOKEN:  LinkedIn OAuth 2.0 refresh token
# - LINKEDIN_CLIENT_ID:      LinkedIn app client ID (for token refresh)
# - LINKEDIN_CLIENT_SECRET:  LinkedIn app client secret (for token refresh)
# - LINKEDIN_ORGANIZATION_ID: LinkedIn company page org ID (90520614)
# - BLUESKY_HANDLE:          Bluesky handle (babylonjs.bsky.social)
# - BLUESKY_APP_PASSWORD:    Bluesky app password
# - GH_TOKEN_SECRETS_WRITE:  GitHub PAT with repo secrets write permission
```

### 3. Concurrency control

Add a concurrency group to prevent multiple posting runs from overlapping:

```yaml
concurrency:
  group: daily-posting
  cancel-in-progress: false
```

`cancel-in-progress: false` ensures that if both cron triggers fire close together, the second one waits for the first to complete rather than canceling it. The orchestrator's self-gating logic will cause the second run to exit cleanly.

## Testing suggestions
- Trigger the workflow manually via `workflow_dispatch` with `dry_run: true`. Verify it checks out the repo, installs dependencies, and runs the orchestrator in dry-run mode.
- Trigger with `dry_run: true` and `date: 2099-12-31` (a date with no scheduled post). Verify it exits cleanly.
- Verify the workflow YAML is valid by checking it in the GitHub Actions UI (invalid YAML is flagged immediately).
- Verify that all secrets are listed correctly in the `env` block — no secrets should be referenced but not defined.
- Check that the concurrency group prevents overlapping runs.

## Gotchas
- **Secret masking:** GitHub Actions automatically masks secret values in logs. However, the orchestrator should still avoid logging credentials explicitly as a defense-in-depth measure.
- **Checkout token:** The default `github.token` allows pushing commits to the repo but cannot update repository secrets. For LinkedIn token refresh (Task 2.3), the `GH_TOKEN_SECRETS_WRITE` PAT is needed. If this token is not configured, LinkedIn token refresh will fail silently (the posting module handles this gracefully).
- **Working directory:** The posting scripts are in `scripts/`, so `working-directory: scripts` must be set for the install and run steps. However, the orchestrator accesses files in `scheduled/` and `media/` which are at the repo root. The script should resolve paths relative to the repo root, not the scripts directory. Consider using `process.cwd()` or `path.resolve(__dirname, '..')` in the orchestrator.
- **npm ci vs npm install:** Use `npm ci` in CI to get a reproducible, fast install from the lockfile. This requires a `package-lock.json` in `scripts/`.
- **Cron timing:** GitHub Actions cron is not guaranteed to be precise — runs may be delayed by a few minutes during high-demand periods. The 09:30–10:30 AM Pacific window in the orchestrator's self-gating is intentionally wide to accommodate this.
- **Dual cron overlap:** During DST transition weeks, both 17:00 UTC and 18:00 UTC fall within the 09:30–10:30 window. The concurrency group ensures only one run proceeds; the self-gating check in the orchestrator provides a second safety layer.

## Verification checklist
- [ ] `.github/workflows/post-daily.yml` exists
- [ ] Workflow has two cron triggers: `0 17 * * *` and `0 18 * * *`
- [ ] Workflow has `workflow_dispatch` trigger with `date` and `dry_run` inputs
- [ ] Workflow uses `actions/checkout@v4` with write-capable token
- [ ] Workflow sets up Node.js 20
- [ ] Workflow installs dependencies with `npm ci` in scripts/ directory
- [ ] Workflow configures git user for commits
- [ ] All platform secrets are passed via `env` block
- [ ] Concurrency group prevents overlapping runs
- [ ] Workflow YAML is syntactically valid
- [ ] Manual trigger with dry_run works from GitHub Actions UI
