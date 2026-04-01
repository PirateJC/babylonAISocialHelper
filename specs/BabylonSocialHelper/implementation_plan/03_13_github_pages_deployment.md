# Task 3.13: GitHub Pages Deployment Configuration

## Goal
Configure the Vite build for GitHub Pages deployment and create a GitHub Actions workflow that builds and deploys the web app whenever changes are pushed to the main branch.

## Requirements addressed
REQ-AUTH-1 (app must be accessible), REQ-AUTH-3 (served from GitHub Pages)

## Background
The Babylon.js Social Media Helper's review web app is a static SPA hosted on GitHub Pages. GitHub Pages serves static files from a configured source (either a branch or a GitHub Actions artifact). Since the app is built with Vite, it needs a build step that produces a `dist/` directory with the compiled HTML, JS, and CSS files.

There are two deployment strategies:
1. **Branch-based:** Push built files to a `gh-pages` branch.
2. **Actions-based:** Use a GitHub Actions workflow to build and deploy directly to Pages.

The Actions-based approach is preferred because it keeps the build artifacts out of the repo's main branch history.

This task depends on:
- Task 3.1 (web app scaffold — Vite config, package.json)
- All other Phase 3 tasks should be substantially complete before deploying.

## Files to modify/create

- `webapp/vite.config.ts` — Verify/update base path and build configuration
- `.github/workflows/deploy-webapp.yml` — GitHub Actions workflow for building and deploying to Pages
- `webapp/public/404.html` — Optional fallback for HashRouter (not strictly needed but good practice)

## Implementation details

### 1. Verify `webapp/vite.config.ts`

Ensure the Vite configuration is correct for GitHub Pages:

- **`base`:** Set to `"/babylonAISocialHelper/"` (matching the repo name). This ensures all asset URLs are prefixed correctly when served from `https://{org}.github.io/babylonAISocialHelper/`.
- **`build.outDir`:** Default is `dist` (no change needed).
- **`build.emptyOutDir`:** `true` (clear previous build).

### 2. Create `.github/workflows/deploy-webapp.yml`

A GitHub Actions workflow that builds the web app and deploys to GitHub Pages:

```yaml
name: Deploy Web App to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'webapp/**'
      - '.github/workflows/deploy-webapp.yml'
  workflow_dispatch:  # Allow manual trigger

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: webapp/package-lock.json

      - name: Install dependencies
        working-directory: webapp
        run: npm ci

      - name: Build
        working-directory: webapp
        run: npm run build
        env:
          VITE_GITHUB_CLIENT_ID: ${{ vars.GITHUB_CLIENT_ID }}
          VITE_OAUTH_WORKER_URL: ${{ vars.OAUTH_WORKER_URL }}
          VITE_REPO_OWNER: ${{ vars.REPO_OWNER }}
          VITE_REPO_NAME: ${{ vars.REPO_NAME }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: webapp/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Key points:**
- The workflow only triggers on changes to `webapp/` files (to avoid redeploying when posting scripts change).
- Build-time environment variables (`VITE_*`) are passed from GitHub repository variables (Settings → Variables → Actions). These are NOT secrets — they're public configuration (client ID, Worker URL, repo owner/name).
- The `actions/upload-pages-artifact` and `actions/deploy-pages` actions handle the deployment to GitHub Pages.

### 3. Configure GitHub Pages in repo settings

Document the steps to enable GitHub Pages:
1. Go to the repo's Settings → Pages.
2. Under "Build and deployment", select "GitHub Actions" as the source.
3. No need to select a branch — the workflow handles everything.

### 4. Set repository variables

Document the required repository variables (Settings → Variables → Actions):

| Variable | Value | Description |
|----------|-------|-------------|
| `GITHUB_CLIENT_ID` | The OAuth App's Client ID | Used by the web app to initiate OAuth |
| `OAUTH_WORKER_URL` | `https://babylon-social-auth.{account}.workers.dev` | Cloudflare Worker URL for token exchange |
| `REPO_OWNER` | `BabylonJS` (or the org name) | Used by the web app for GitHub API calls |
| `REPO_NAME` | `babylonAISocialHelper` | Used by the web app for GitHub API calls |

### 5. Create `webapp/public/404.html` (optional)

For HashRouter, this isn't strictly necessary because all routes use `#` (GitHub Pages always serves `index.html` for the root path). However, creating a simple 404 page that redirects to `index.html` is good practice:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    // Redirect to index.html with the current path as a hash route
    window.location.href = window.location.origin + '/babylonAISocialHelper/';
  </script>
</head>
<body>
  Redirecting...
</body>
</html>
```

### 6. Build-time configuration

The web app uses environment variables (prefixed with `VITE_`) for configuration:
- `VITE_GITHUB_CLIENT_ID` — GitHub OAuth App Client ID
- `VITE_OAUTH_WORKER_URL` — Cloudflare Worker URL
- `VITE_REPO_OWNER` — GitHub repo owner
- `VITE_REPO_NAME` — GitHub repo name

These are accessed in the code via `import.meta.env.VITE_GITHUB_CLIENT_ID`. Vite replaces these at build time.

For local development, create a `webapp/.env.local` file (gitignored) with development values:
```
VITE_GITHUB_CLIENT_ID=Iv1_abc123
VITE_OAUTH_WORKER_URL=http://localhost:8787
VITE_REPO_OWNER=your-username
VITE_REPO_NAME=babylonAISocialHelper
```

## Testing suggestions
- Run `npm run build -w webapp` locally and verify the `dist/` directory contains `index.html` and asset files.
- Serve the build locally with `npm run preview -w webapp` and verify the app works at the correct base path.
- Push changes to the main branch and verify the GitHub Actions workflow triggers, builds, and deploys.
- Access the deployed URL (`https://{org}.github.io/babylonAISocialHelper/`) and verify the app loads.
- Verify that direct navigation to `https://{org}.github.io/babylonAISocialHelper/#/posts` works (HashRouter should handle it).
- Verify environment variables are correctly injected at build time (check that the OAuth Client ID is not empty in the deployed app).

## Gotchas
- **Base path trailing slash:** The `base` in Vite config should end with `/`. Without it, asset paths may break.
- **GitHub Pages deployment source:** Must be set to "GitHub Actions" in repo settings. If it's set to a branch (e.g., `gh-pages`), the Actions-based deployment won't work.
- **Environment variables at build time:** Vite's `import.meta.env` values are replaced at build time. If a variable is not set during the build, it will be `undefined` in the deployed app. Always verify that the GitHub repository variables are configured.
- **Caching:** GitHub Pages and browsers cache static assets. After a deployment, users may see stale content. Vite's hashed filenames (`assets/index-[hash].js`) mitigate this for JS/CSS, but `index.html` itself may be cached. Consider adding cache-control headers if possible (GitHub Pages has limited control over headers).
- **First deployment:** The first deployment may take a few minutes. Subsequent deployments are faster.
- **Permissions:** The workflow needs `pages: write` and `id-token: write` permissions to deploy to GitHub Pages.

## Verification checklist
- [ ] `webapp/vite.config.ts` has correct `base` path for GitHub Pages
- [ ] `.github/workflows/deploy-webapp.yml` exists and is valid YAML
- [ ] Workflow triggers on pushes to main branch (webapp/ paths)
- [ ] Workflow builds the app and deploys to GitHub Pages
- [ ] Build-time environment variables are passed correctly
- [ ] GitHub Pages is configured to use "GitHub Actions" as the deployment source
- [ ] Repository variables are documented
- [ ] Deployed app loads at the correct URL
- [ ] All routes work in the deployed app (HashRouter)
- [ ] `.env.local` template is documented for local development
