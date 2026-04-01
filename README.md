# Babylon.js Social Media Helper

An end-to-end system for generating, reviewing, and publishing daily social media posts for Babylon.js across **X (Twitter)**, **LinkedIn**, and **Bluesky**.

## Architecture

| Phase | Component | Tech Stack |
|-------|-----------|------------|
| 1 — Content Generation | AI skill + Playwright | Copilot skill, Playwright for screenshots |
| 2 — Posting Pipeline | GitHub Actions | TypeScript, Node.js, agent-twitter-client, @atproto/api, LinkedIn Marketing API |
| 3 — Review Web App | Static SPA on GitHub Pages | React, TypeScript, Vite, Cloudflare Workers (OAuth proxy) |

## Setup

```bash
# Install all workspace dependencies
npm install

# Start the web app dev server
npm run dev -w webapp

# Build the web app for production
npm run build -w webapp

# TypeScript check the posting scripts
npx tsc --noEmit -p scripts/tsconfig.json
```

## Project Structure

```
├── webapp/          # React review web app (GitHub Pages)
├── scripts/         # Node.js posting scripts (GitHub Actions)
├── oauth-worker/    # Cloudflare Worker for GitHub OAuth
├── scheduled/       # Approved posts awaiting publication
├── failed/          # Posts that failed to publish
├── media/           # Screenshot images for posts
├── schemas/         # JSON schemas
├── specs/           # Project specifications
│   └── BabylonSocialHelper/
│       ├── goals.md
│       ├── requirements.md
│       ├── architecture.md
│       ├── mocks.html
│       └── implementation_plan/
└── skills/          # AI skills (gitignored)
```

## Documentation

- [Goals](specs/BabylonSocialHelper/goals.md)
- [Requirements](specs/BabylonSocialHelper/requirements.md)
- [Architecture](specs/BabylonSocialHelper/architecture.md)
- [UI Mocks](specs/BabylonSocialHelper/mocks.html)
