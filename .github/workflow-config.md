# Workflow Configuration

## Feature docs directory

Feature or specification documents live at:

```
specs/
```

Each feature at `specs/<feature-name>/` contains:
- `goals.md`
- `requirements.md`
- `architecture.md`
- `task-board.md`
- `mocks.html`
- `mocks.context.md`
- `implementation_plan/`

## Quality commands

- **Format**: `Not applicable`
- **Check (lint / typecheck)**: `npm run lint -w webapp && npx tsc --noEmit -p scripts/tsconfig.json`
- **Unit tests**: `Not applicable`

## Product identity and UI guidance

- **Product or repo name**: `BabylonSocialHelper`
- **What it ships or publishes**: AI-generated social media posts for Babylon.js across X, LinkedIn, and Bluesky
- **Key user-facing surfaces**: Review web app (React SPA on GitHub Pages)
- **UI, brand, or design-system guidance for mocks**: Uses official Babylon.js brand assets from BabylonJS/Brand-Toolkit
- **Important reference files or directories to read first**: `specs/BabylonSocialHelper/goals.md`, `specs/BabylonSocialHelper/architecture.md`

## Manual testing

- **Instructions file**: `Not applicable`
- **How to launch the product locally**: `npm run dev -w webapp`
- **Service health checks, ports, URLs, or entry points**: `http://localhost:5173/babylonAISocialHelper/`
- **Rules for reusing existing running processes**: `Not applicable`

## Test conventions

### Unit tests

- **Location convention**: `Not applicable` (to be established)
- **Naming convention**: `Not applicable`
- **Runner or config**: `Not applicable`

### Integration tests

- **When to prefer integration tests over unit tests**: `Not applicable`
- **Location convention**: `Not applicable`
- **Naming convention**: `Not applicable`
- **How to run a focused test**: `Not applicable`

### Visual or screenshot tests

- **When visual tests are required**: `Not applicable`
- **Source-of-truth instructions**: `Not applicable`
- **Key config, fixture, and reference image paths**: `Not applicable`
- **Commands**: `Not applicable`
- **Supported browsers, engines, or environments**: `Not applicable`

## Database migrations

`Not applicable`

## Bug fixing

- **Issue tracker or repository to read from**: `Not applicable`
- **Expected bug report sections or repro information**: `Not applicable`
- **Detailed bug-fix instructions**: `Not applicable`

## Related skills

- **Manual testing / screenshots**: `Not available`
- **Visual testing**: `Not available`
- **Write integration test**: `Not available`
- **Debug integration test**: `Not available`
- **Other repo-specific helper skills**: `content-generation` (skills/content-generation/SKILL.md)

## Additional references

- **Product inventory or architecture overview**: `specs/BabylonSocialHelper/architecture.md`
- **Launch, task, or dev-server config**: `webapp/vite.config.ts`
- **Other instructions agents should read first**: `specs/BabylonSocialHelper/goals.md`
