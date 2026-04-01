# Task 1.1: Repository Scaffolding

## Goal
Initialize the repository with the foundational project structure, package management, TypeScript configuration, and directory conventions that all subsequent tasks depend on.

## Requirements addressed
REQ-SCHEDULE-1, REQ-SCHEMA-1 (foundational setup enabling all downstream requirements)

## Background
The BabylonSocialHelper is a greenfield project. There is no existing codebase — only spec documents, a SKILL.md file, and a posts.schema.json file in the repo. This task creates the directory structure, package.json files, TypeScript configs, and .gitignore that all future tasks build upon.

The repo hosts three distinct codebases that share a root workspace:
1. **`webapp/`** — A React + TypeScript + Vite static web app (Phase 3 of implementation) served via GitHub Pages.
2. **`scripts/`** — Node.js/TypeScript posting scripts executed by GitHub Actions (Phase 2 of implementation).
3. **`oauth-worker/`** — A Cloudflare Worker that proxies GitHub OAuth token exchange.

Additionally, the repo contains data directories (`scheduled/`, `failed/`, `media/`) that act as the system's "database" — all persistent state is stored as files in these directories.

## Files to modify/create

- `package.json` (root) — npm workspace configuration pointing to `webapp/`, `scripts/`, and `oauth-worker/`
- `webapp/package.json` — React, react-dom, react-router-dom, Vite, TypeScript, ajv (JSON Schema validation)
- `webapp/tsconfig.json` — TypeScript strict mode, JSX support, ES2022+ target for Intl.Segmenter
- `webapp/vite.config.ts` — Vite config with base path set for GitHub Pages deployment
- `webapp/index.html` — Minimal HTML entry point with a `<div id="root">`
- `webapp/src/main.tsx` — Placeholder React entry point that renders a "Hello World" component
- `scripts/package.json` — Dependencies: agent-twitter-client, @atproto/api, @octokit/rest, typescript, tsx
- `scripts/tsconfig.json` — TypeScript config targeting Node.js (ES2022, CommonJS or ESM modules)
- `oauth-worker/package.json` — Dependencies: wrangler (Cloudflare Workers CLI)
- `oauth-worker/wrangler.toml` — Cloudflare Worker configuration stub
- `oauth-worker/src/index.ts` — Placeholder Worker entry point
- `scheduled/.gitkeep` — Empty file to ensure the directory is tracked by git
- `failed/.gitkeep` — Empty file to ensure the directory is tracked by git
- `media/.gitkeep` — Empty file to ensure the directory is tracked by git
- `.gitignore` — Ignore node_modules/, dist/, skills/, .env, *.local
- `README.md` — Project overview with setup instructions

## Implementation details

1. **Root `package.json`:** Create a root package.json with `"private": true` and `"workspaces": ["webapp", "scripts", "oauth-worker"]`. This enables npm workspaces so all three sub-projects can share dependencies and be managed from the root. Set the Node.js engine to `>=18` (required for Intl.Segmenter and native fetch).

2. **`webapp/` setup:**
   - Create `webapp/package.json` with dependencies: `react`, `react-dom`, `react-router-dom`. Dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `ajv` (for JSON Schema validation). Add scripts: `"dev": "vite"`, `"build": "tsc && vite build"`, `"preview": "vite preview"`.
   - Create `webapp/tsconfig.json` with `strict: true`, `target: "ES2022"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `include: ["src"]`.
   - Create `webapp/vite.config.ts` importing `@vitejs/plugin-react` and setting `base: "/babylonAISocialHelper/"` (the GitHub Pages subpath for this repo).
   - Create `webapp/index.html` with a standard HTML5 boilerplate, a `<div id="root"></div>`, and a `<script type="module" src="/src/main.tsx"></script>`.
   - Create `webapp/src/main.tsx` with a minimal React render that mounts a `<div>BabylonSocialHelper</div>` to confirm the build pipeline works.

3. **`scripts/` setup:**
   - Create `scripts/package.json` with `"type": "module"` and dependencies: `agent-twitter-client`, `@atproto/api`, `@octokit/rest`. Dev dependencies: `typescript`, `tsx`, `@types/node`. Add scripts: `"build": "tsc"`, `"start": "tsx post-daily.ts"`.
   - Create `scripts/tsconfig.json` with `target: "ES2022"`, `module: "ES2022"`, `moduleResolution: "bundler"`, `outDir: "dist"`, `strict: true`.

4. **`oauth-worker/` setup:**
   - Create `oauth-worker/package.json` with dev dependency: `wrangler`. Add scripts: `"dev": "wrangler dev"`, `"deploy": "wrangler deploy"`.
   - Create `oauth-worker/wrangler.toml` with `name = "babylon-social-auth"`, `main = "src/index.ts"`, `compatibility_date` set to the current date.
   - Create `oauth-worker/src/index.ts` with a placeholder handler that returns `{ status: "ok" }`.

5. **Data directories:**
   - Create `scheduled/.gitkeep`, `failed/.gitkeep`, and `media/.gitkeep` as empty files. These ensure git tracks the directories even when empty.

6. **`.gitignore`:**
   - Add: `node_modules/`, `dist/`, `skills/`, `.env`, `*.local`, `.wrangler/`, `output/` (Phase 1 skill output directory).

7. **`README.md`:**
   - Write a brief project overview referencing the three phases, the tech stack, and links to the spec documents in `specs/BabylonSocialHelper/`.
   - Include setup instructions: `npm install` from root, `npm run dev -w webapp` to start the dev server, `npm run build -w webapp` to build.

8. **Run `npm install`** from the repository root to install all workspace dependencies and verify the workspace configuration works.

## Testing suggestions
- Run `npm install` from the repo root and verify it completes without errors.
- Run `npm run dev -w webapp` and confirm Vite starts and serves the placeholder page at `http://localhost:5173/babylonAISocialHelper/`.
- Run `npm run build -w webapp` and verify the build produces files in `webapp/dist/`.
- Run `npx tsc --noEmit -p scripts/tsconfig.json` and verify TypeScript compilation succeeds (with the placeholder files).
- Verify `scheduled/`, `failed/`, and `media/` directories exist with `.gitkeep` files.
- Verify `git status` shows all new files as untracked (not ignored).

## Gotchas
- The Vite `base` path must match the GitHub Pages deployment path. For a repo at `github.com/{org}/babylonAISocialHelper`, the base is `/babylonAISocialHelper/`. Getting this wrong causes broken asset paths on deployment.
- npm workspaces require the root `package.json` to have `"private": true`.
- The `webapp/tsconfig.json` must target ES2022 or later to support `Intl.Segmenter` (used for grapheme counting in the editor).
- `agent-twitter-client` may have specific Node.js version requirements — check its documentation during install. If it requires a different setup (e.g., CommonJS), adjust the scripts/ tsconfig accordingly.
- The `oauth-worker/` uses Cloudflare's Wrangler build system, which has its own TypeScript handling. Do not add a separate tsconfig for the Worker unless Wrangler requires it.

## Verification checklist
- [ ] Root `package.json` exists with workspaces array
- [ ] `npm install` succeeds from root without errors
- [ ] `webapp/` contains package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx
- [ ] `scripts/` contains package.json, tsconfig.json
- [ ] `oauth-worker/` contains package.json, wrangler.toml, src/index.ts
- [ ] `scheduled/.gitkeep`, `failed/.gitkeep`, `media/.gitkeep` exist
- [ ] `.gitignore` includes node_modules/, dist/, skills/, .env
- [ ] `README.md` exists with project overview
- [ ] `npm run dev -w webapp` starts Vite dev server
- [ ] `npm run build -w webapp` produces dist/ output
