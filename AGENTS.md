<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# PlayMarkets — Agent & Contributor Guidelines

This document is the single source of truth for rules, conventions, and architecture decisions in this codebase. Read it before writing or changing any code.

---

## Package manager

**Always use `bun`. Never use `npm install` or `yarn add`.**

```bash
bun add <pkg>          # runtime dependency
bun add -d <pkg>       # dev dependency
bun run dev            # dev server
bun run build          # production build
bun run start          # production server
bun run lint           # ESLint
```

`bun.lock` is the lockfile for this repo — commit it. `package-lock.json` is gitignored; do not create it.

---

## Next.js 16 specifics

### Async dynamic params
Route segments receive params as a **Promise** in Next.js 16. Always unwrap with `use()`:

```tsx
// Page component
export default function MatchPage(props: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(props.params);
  ...
}

// API route handler
export async function GET(_req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  ...
}
```

Do **not** import `RouteContext` from `next/server` — it is not exported. Use inline types.

### Route handlers
All route handlers that read from storage must opt out of caching:

```ts
export const dynamic = 'force-dynamic';
```

Always set `Cache-Control: no-store` on responses that include live or user-specific data.

### Client vs server components
- Pages that use `useState`, `useEffect`, or browser APIs must have `'use client'` at the top.
- API routes (`app/api/**/route.ts`) are always server-side — never import client-only code into them.

---

## Styling

Tailwind CSS 4 is in use. Key rules:

- Do **not** use `@apply` in component files — use utility classes directly.
- Do **not** add arbitrary inline `style={{}}` for colours that already exist as Tailwind utilities.
- Use the project's colour palette (see below) — do not introduce new brand colours.
- Animations: use Tailwind's `animate-pulse`, `animate-ping`, `animate-spin`; do not pull in external animation libraries.

### Colour palette

| Token | Hex | Usage |
|---|---|---|
| Deep navy | `#070d1a` | Page/body background |
| India Blue | `#003791` | Primary brand, gradient start |
| Saffron | `#FF7722` | CTAs, accent, "Play" wordmark |
| Teal | `#00D4B4` | Positive outcomes, correct picks |
| Card bg | `#0e1628` | Card and panel surfaces |
| Border | `#1e2d45` | Card borders, dividers |
| Border active | `#2d3d55` | Hover/active borders |

Standard gradient: `linear-gradient(135deg, #003791 0%, #FF7722 100%)`

---

## Type conventions

All shared types live in `src/types/index.ts`. Do not scatter types across component files.

Key exported constants (import from `@/types`):
- `STARTING_BALANCE = 200` — default balance for new users
- `PREDICTION_STAKE = 10` — pts deducted per prediction on submit

When adding a new type, add it to `index.ts` only. Do not redeclare types locally.

---

## Storage architecture

Two parallel store hierarchies, both switched by `STORAGE_BACKEND` env var (`memory` | `json` | `sqlite`):

```
getStore()      → PredictionStore   (src/lib/storage/index.ts)
getUserStore()  → UserStore         (src/lib/storage/index.ts)
```

Both use a **`globalThis` singleton** pattern to survive Next.js HMR:

```ts
const g = globalThis as typeof globalThis & { __pmStore?: PredictionStore };
if (!g.__pmStore) g.__pmStore = new InMemoryPredictionStore();
export const store = g.__pmStore;
```

Follow this exact pattern for any new store — never construct a store directly in a route handler.

When adding a new storage backend: implement the interface, add a case to the factory in `index.ts`, and test with all three backends.

---

## Scoring engine

The scoring logic is in `src/lib/scoring.ts` as **pure functions** — no side effects, no imports from storage.

```ts
calcPoints(prediction, match): number
computeLeaderboard(predictions, matches, userBalanceMap): ScoringResult
computeMatchLeaderboard(predictions, match): MatchLeaderboardEntry[]
```

**Rules that must stay true:**
- Score bonuses (+5 per team) are independent of the winner call — never gate them.
- Early Bird multiplier applies only to **positive** point totals — never amplifies losses.
- Tied / abandoned matches → return `0` (void), not negative points.
- Format tolerances: T10=±10, T20=±15, ODI=±25, TEST=±40. These are in `SCORE_TOLERANCES`.
- Stake timing: deduct `PREDICTION_STAKE` on **submit** (API → updateUser), return it at **scoring time** alongside net points. Net effect is identical to just applying calcPoints, but the user sees the balance drop immediately.

Do not add side effects (DB writes, fetch calls) inside scoring functions. The leaderboard API route calls scoring, then persists the result.

---

## API route conventions

### Predictions (`/api/predictions`)
- `POST`: creates or updates a prediction. On **new** prediction only, deduct `PREDICTION_STAKE` from the user's balance. Return `{ prediction, balance }`.
- Locked statuses (`COMPLETED`, `ABANDONED`, `CANCELLED`) must reject new predictions with `400`.
- Auto-creates the user (with `STARTING_BALANCE`) if they don't exist in `UserStore` — prevents foreign-key failures.

### Leaderboard (`/api/leaderboard`)
- Calls `computeLeaderboard`, then persists `userBalanceUpdates` and marks predictions as scored.
- Returns cached results between runs — only re-scores `newlyScored` entries.

### Match leaderboard (`/api/leaderboard/[matchId]`)
- Calls `computeMatchLeaderboard` — read-only, no side effects.

---

## Match status model

```
UPCOMING → TOSS → LIVE → INNINGS_BREAK → LIVE → COMPLETED
                        ↕ DRINKS / LUNCH / TEA / STUMPS / RAIN_DELAY
          → POSTPONED / CANCELLED / ABANDONED
```

Predictions are allowed on any status **except** `COMPLETED`, `ABANDONED`, `CANCELLED`. The constant `LOCKED = ['COMPLETED', 'ABANDONED', 'CANCELLED']` is used throughout — always check against this list, never hardcode individual statuses.

---

## Component conventions

### Navigation
Use `<a href="...">` (plain HTML anchor) for navigation between pages — do not use Next.js `<Link>` unless you have a specific prefetch requirement. This keeps the codebase consistent.

### SVG icons / logo
`src/components/Logo.tsx` exports `<LogoIcon size={n} />` and `<Logo />`. The icon uses `useId()` from React for unique gradient IDs — always follow this pattern if you add SVG components with `<defs>`.

### User context
`useUser()` from `src/components/UserProvider.tsx` exposes `{ user, refreshBalance, signOut, openModal }`. Call `refreshBalance()` after any action that changes the user's balance server-side (e.g. prediction submit).

### Prediction flow
The canonical prediction entry point is `/match/[matchId]`. The home page cards link there — they do not open a modal. The `PredictionModal` component still exists but is only used if explicitly needed for quick-predict outside the match page.

---

## File structure rules

- One React component per file. File name = component name (PascalCase).
- API routes: one `route.ts` per directory. Export named `GET`, `POST`, etc.
- Do not add new pages under `app/` without a corresponding entry in this file documenting what it does.
- Do not create `utils/` or `helpers/` folders. Put shared logic in `lib/` with a descriptive filename.

---

## Project structure (current)

```
src/
├── app/
│   ├── page.tsx                      # Home — match grid, filters, section toggles
│   ├── layout.tsx                    # Root layout — header, footer, UserProvider
│   ├── globals.css                   # Global styles
│   ├── rules/page.tsx                # Scoring rules (static)
│   ├── leaderboard/page.tsx          # Global leaderboard
│   ├── leaderboard/[matchId]/page.tsx # Per-match leaderboard page
│   ├── match/[matchId]/page.tsx      # Match detail + inline prediction + match leaderboard
│   └── api/
│       ├── matches/route.ts
│       ├── users/route.ts
│       ├── predictions/route.ts
│       ├── leaderboard/route.ts
│       └── leaderboard/[matchId]/route.ts
│
├── components/
│   ├── Header.tsx                    # Sticky nav — balance chip, user dropdown
│   ├── Logo.tsx                      # <LogoIcon> and <Logo> SVG components
│   ├── UserProvider.tsx              # Auth context (username + balance)
│   ├── CricketMatchCard.tsx          # Home page match card
│   ├── PredictionModal.tsx           # Quick-predict modal (home page)
│   └── Predictions.tsx               # MyPredictionsPanel FAB
│
├── lib/
│   ├── api.ts                        # Client-side fetch wrappers
│   ├── config.ts                     # Env var config
│   ├── scoring.ts                    # Pure scoring engine
│   ├── storage/                      # Store interfaces + implementations
│   └── providers/                    # Cricket data provider adapters
│
├── store/
│   └── reactions.ts                  # Client-side in-memory reaction state
│
└── types/
    └── index.ts                      # All types + STARTING_BALANCE + PREDICTION_STAKE
```

---

## Git workflow

- Do **not** run `git commit` or `git push` unless the user explicitly asks.
- Make all file changes first, then wait for the user to review and commit.

---

## What NOT to do

- Do not mock storage in tests — use the real in-memory backend.
- Do not add `console.log` statements in production paths — use `console.error` for actual errors only.
- Do not add loading spinners or skeletons beyond what already exists — keep the UI lean.
- Do not introduce new npm/bun packages for things already achievable with the existing stack (Tailwind, React, built-in `fetch`).
- Do not change the colour palette without updating this document.
- Do not use `npm install` — always `bun add`.
