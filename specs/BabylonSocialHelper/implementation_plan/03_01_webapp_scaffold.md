# Task 3.1: Web App Scaffold

## Goal
Create the React + TypeScript + Vite web application shell with routing, basic layout components, and the authenticated/unauthenticated route structure that all subsequent web app tasks build upon.

## Requirements addressed
REQ-AUTH-1 (unauthenticated users see only login), REQ-AUTH-7 (sign-out in navbar), REQ-LIST-10 (Import button in navbar)

## Background
The Babylon.js Social Media Helper's review web app is a React single-page application hosted on GitHub Pages. It uses HashRouter because GitHub Pages serves a single `index.html` and does not support server-side path rewriting.

The app has three route states:
1. **Unauthenticated:** Only the login screen is shown.
2. **Authenticated but not a team member:** The Access Denied screen is shown.
3. **Authenticated and authorized:** The full app with navbar, import, post list, and post detail views.

This task creates the routing structure, placeholder components for all screens, the AuthContext provider, and the navbar. It does NOT implement actual OAuth logic (that's Task 3.3) — it uses a mock auth state that can be toggled for development.

This task depends on Task 1.1 (repo scaffolding — the webapp/ directory, package.json, Vite config, etc.).

The relevant files from Task 1.1:
```
webapp/
├── package.json        # React, react-router-dom, Vite, TypeScript
├── tsconfig.json
├── vite.config.ts      # base: "/babylonAISocialHelper/"
├── index.html
└── src/
    └── main.tsx        # Placeholder entry point
```

## Files to modify/create

- `webapp/src/main.tsx` — Updated to render the App component with AuthProvider
- `webapp/src/App.tsx` — Root component with HashRouter and route definitions
- `webapp/src/context/AuthContext.tsx` — React Context for auth state (token, user, team status)
- `webapp/src/components/Navbar.tsx` — Top nav: brand, Import button, user avatar, sign-out
- `webapp/src/components/LoginScreen.tsx` — Placeholder login screen (Mock 1)
- `webapp/src/components/AccessDenied.tsx` — Placeholder access denied screen (Mock 2)
- `webapp/src/components/ImportPanel.tsx` — Placeholder import panel (Mock 3)
- `webapp/src/components/PostList.tsx` — Placeholder post list (Mock 5)
- `webapp/src/components/PostDetail.tsx` — Placeholder post detail (Mock 7)
- `webapp/src/types/post.ts` — TypeScript interfaces for Post data

## Implementation details

### 1. Create `webapp/src/types/post.ts`

Define TypeScript interfaces that match the JSON schema and are used throughout the web app:

**`Post`** — Represents a single post (either Draft, Scheduled, or Failed):
- `id`: string
- `assignedDate`: string (YYYY-MM-DD)
- `category`: `"feature-highlight" | "community-demo" | "docs-tutorial"`
- `text`: string
- `hashtags`: string[]
- `conditionalHashtags`: string[]
- `link`: `{ url: string; type: LinkType; title: string }`
- `media`: `{ type: "screenshot"; sourceUrl: string; description: string; filePath: string }`
- `metadata`: `{ topic: string; babylonFeatureArea: string; contentSource: string; usesEmoji: boolean; postFormat: PostFormat; dayIndex: number }`
- `status`: `"draft" | "scheduled" | "failed"` (derived at runtime, not stored in JSON)
- `platformResults?`: per-platform results (only on failed posts)
- `localImageData?`: string (base64 data URL — for draft posts with replaced images stored in localStorage)

**`LinkType`**: `"playground" | "demo" | "docs" | "forum" | "blog" | "community-project" | "youtube"`

**`PostFormat`**: `"feature-statement" | "question" | "check-out" | "demo-showcase" | "community-pride" | "call-to-action"`

**`PlatformResult`**: `{ platform: string; success: boolean; postId?: string; error?: string; retryCount: number }`

**`PostsImport`**: Top-level structure of the imported JSON file — `generatedAt`, `generatedBy`, `totalPosts`, `config`, `posts[]`

### 2. Create `webapp/src/context/AuthContext.tsx`

Create a React Context that provides:
- `token`: string | null (GitHub OAuth token)
- `user`: `{ login: string; avatarUrl: string; name: string } | null`
- `isTeamMember`: boolean | null (null = not yet checked)
- `isLoading`: boolean (true while verifying auth)
- `login()`: function to initiate OAuth flow (placeholder — implemented in Task 3.3)
- `logout()`: function to clear token and redirect to login

The AuthProvider component should:
- Check `sessionStorage` for an existing token on mount.
- If a token exists, set `isLoading: true` and attempt to fetch user info and verify team membership (placeholder — for now, just check if the token exists).
- Provide a `logout()` function that clears `sessionStorage` and resets all auth state.

For development purposes, include a way to mock the auth state (e.g., a `DEV_AUTH_BYPASS` constant that auto-sets a mock user and team membership when running in dev mode).

### 3. Create `webapp/src/App.tsx`

The root component that wraps everything in `AuthProvider` and `HashRouter`:

```
<AuthProvider>
  <HashRouter>
    {/* If not authenticated, show LoginScreen */}
    {/* If authenticated but not team member, show AccessDenied */}
    {/* If authenticated and authorized, show AuthenticatedLayout */}
  </HashRouter>
</AuthProvider>
```

**AuthenticatedLayout** includes:
- `<Navbar>` at the top
- `<Routes>` with:
  - `path="/"` → Redirect to `/import`
  - `path="/import"` → `<ImportPanel>`
  - `path="/posts"` → `<PostList>`
  - `path="/posts/:id"` → `<PostDetail>`

### 4. Create `webapp/src/components/Navbar.tsx`

A top navigation bar containing:
- **Brand/logo area:** "Babylon.js Social Helper" text/logo on the left
- **Import Posts button:** Links to `#/import`
- **User area (right side):** User avatar (small circular image), display name, and a "Sign Out" button that calls `logout()` from AuthContext

### 5. Create placeholder components

Each of these should be a minimal functional component that renders:
- The component name as a heading
- Any relevant placeholder text
- Navigation links to other screens (for manual testing of routing)

**`LoginScreen.tsx`:** "Sign in with GitHub" button (non-functional), note about team membership requirement.

**`AccessDenied.tsx`:** "Access Denied" heading, message about required team, "Sign Out" button.

**`ImportPanel.tsx`:** "Import Posts" heading, placeholder text about drag-drop.

**`PostList.tsx`:** "Post List" heading, placeholder text.

**`PostDetail.tsx`:** "Post Detail" heading, reads `:id` from URL params and displays it.

### 6. Update `webapp/src/main.tsx`

Import and render `<App />` instead of the placeholder content.

## Testing suggestions
- Run `npm run dev -w webapp` and verify the app loads at `http://localhost:5173/babylonAISocialHelper/`.
- With mock auth bypassed (dev mode), verify:
  - `#/import` shows the ImportPanel placeholder
  - `#/posts` shows the PostList placeholder
  - `#/posts/test-123` shows the PostDetail placeholder with "test-123" displayed
  - Navbar shows user info and Import Posts button
  - Sign Out clears auth and shows LoginScreen
- Without auth, verify only the LoginScreen is visible.
- Verify all routes work with HashRouter (no 404s when navigating directly to `#/posts`).
- Run `npm run build -w webapp` and verify the production build succeeds.

## Gotchas
- HashRouter prefixes all routes with `#`. Links must use `to="/import"` (not `to="#/import"`) — react-router-dom handles the hash prefix automatically.
- The Vite `base` path (`/babylonAISocialHelper/`) must be set correctly or assets won't load on GitHub Pages. In development, Vite serves from the root, so links may behave differently. Test with `npm run preview` to verify the production build serves correctly with the base path.
- The `AuthContext` will be replaced with real OAuth logic in Task 3.3. Design the interface so the consumer components don't need to change when the implementation switches from mock to real.
- TypeScript strict mode may flag `document.getElementById("root")` as potentially null. Use the non-null assertion or a guard: `document.getElementById("root")!`.

## Verification checklist
- [ ] `webapp/src/App.tsx` exists with HashRouter and route definitions
- [ ] `webapp/src/context/AuthContext.tsx` exports AuthProvider and useAuth hook
- [ ] `webapp/src/components/Navbar.tsx` renders brand, Import button, user info, Sign Out
- [ ] `webapp/src/components/LoginScreen.tsx` renders placeholder login UI
- [ ] `webapp/src/components/AccessDenied.tsx` renders placeholder access denied UI
- [ ] `webapp/src/components/ImportPanel.tsx` renders placeholder import UI
- [ ] `webapp/src/components/PostList.tsx` renders placeholder list UI
- [ ] `webapp/src/components/PostDetail.tsx` renders placeholder detail UI and reads :id param
- [ ] `webapp/src/types/post.ts` exports Post, PostsImport, PlatformResult, and related types
- [ ] Routing works: /, /import, /posts, /posts/:id all render correct components
- [ ] Sign Out clears auth state and shows login screen
- [ ] `npm run dev -w webapp` starts successfully
- [ ] `npm run build -w webapp` succeeds
