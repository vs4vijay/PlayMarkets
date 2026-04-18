# PlayMarkets

**The Social Prediction Layer for Live Sports**

PlayMarkets is a real-time cricket fan engagement platform. Watch live scores, react to key moments, and compete on the prediction leaderboard — all in one place. Every prediction costs points, every correct call earns them back with interest.

![PlayMarkets — Live matches dashboard](.images/home.png)

**Live demo:** https://play-markets.vercel.app/

---

## Features

### Live Match Dashboard
- Live, completed, and upcoming matches in a filterable grid
- 30-second auto-polling for live matches — scores update without a page refresh
- Per-match key moments (wickets, boundaries, milestones) with emoji reactions
- Match status badges: LIVE, TOSS, INNINGS BREAK, DRINKS, STUMPS, RAIN DELAY, and more

### Dedicated Match Page
Each match has its own page (`/match/[matchId]`) with:
- Full team scorecards and live status
- Key Moments timeline
- Inline prediction form — pick the winner, predict final scores, see your potential points before committing
- Per-match prediction leaderboard showing all players' picks and outcomes

![Match detail page — inline prediction form and leaderboard](.images/match.png)

### Prediction System
- Predict the **winner** and **final scores** for any non-completed match (including live matches)
- **10 pt stake** deducted immediately on submit — skin in the game
- Points awarded on match completion:
  - Correct winner: **+10 pts**
  - Home score within tolerance: **+5 pts**
  - Away score within tolerance: **+5 pts**
  - Wrong winner: **−5 pts** (score bonuses still apply)
- Score bonuses are **independent** of the winner call — partial credit always available
- **Early Bird multiplier** on positive outcomes:
  - >48 h before match: **×1.5**
  - 12–48 h before match: **×1.25**
  - <12 h / live: **×1.0**
- Format-aware tolerances (T10 ±10 · T20 ±15 · ODI ±25 · TEST ±40)
- Abandoned/tied matches are voided — stake returned, no points won or lost

![Upcoming matches with Predict CTAs](.images/upcoming.png)

### Leaderboard
- Global leaderboard ranked by current point balance
- Per-match leaderboard: see every player's pick vs. the actual result
- Your row is highlighted across all leaderboard views

### Scoring Rules Page
Full transparency on how points work — starting balance, breakdown table, format tolerances, early-bird multiplier, and strategy tips.

![Scoring rules page](.images/rules.png)

### Balance System
- Every new player starts with **200 pts**
- Balance tracked in real-time — visible in the header
- Balance colour-coded: teal = above starting, red = below starting

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Runtime | Bun |
| Language | TypeScript 5 |
| UI | React 19.2.4 + Tailwind CSS 4 |
| Storage | In-memory (dev) · JSON file · SQLite (prod) |
| Linting | ESLint 9 |

---

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs with rich mock IPL 2026 data out of the box — no API key needed.

### Environment Variables

Create `.env.local` in the project root:

```env
# Cricket data provider: mock | cricketdata | entitysport
CRICKET_PROVIDER=mock

# Storage backend: memory | json | sqlite
STORAGE_BACKEND=memory

# Required only when CRICKET_PROVIDER=cricketdata
CRICKETDATA_API_KEY=your_key_here

# Required only when CRICKET_PROVIDER=entitysport
ENTITYSPORT_TOKEN=your_token_here
```

### Build & Deploy

```bash
bun run build   # Production build
bun run start   # Start production server
bun run lint    # ESLint check
```

---

## Cricket Data Providers

| Provider | Env value | Free tier | Config key |
|---|---|---|---|
| Mock (default) | `mock` | Unlimited | — |
| CricketData.org | `cricketdata` | 100 req/day | `CRICKETDATA_API_KEY` |
| EntitySport | `entitysport` | Dev token | `ENTITYSPORT_TOKEN` |

The mock provider ships with a full IPL 2026 fixture list covering live, completed, and upcoming matches across T20, ODI, and Test formats.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Home — match grid with filters & sections
│   ├── layout.tsx                    # Root layout — header, footer, providers
│   ├── globals.css                   # Global styles (navy/saffron theme)
│   ├── rules/page.tsx                # Scoring rules (static)
│   ├── leaderboard/
│   │   ├── page.tsx                  # Global leaderboard
│   │   └── [matchId]/page.tsx        # Per-match leaderboard
│   ├── match/
│   │   └── [matchId]/page.tsx        # Match detail + inline prediction
│   └── api/
│       ├── matches/route.ts          # GET matches (all / filtered / by id)
│       ├── users/route.ts            # GET/POST users
│       ├── predictions/route.ts      # GET/POST predictions (deducts stake)
│       └── leaderboard/
│           ├── route.ts              # Global leaderboard (scores + persists)
│           └── [matchId]/route.ts    # Per-match leaderboard
│
├── components/
│   ├── Header.tsx                    # Sticky nav — logo, balance chip, user menu
│   ├── Logo.tsx                      # LogoIcon + Logo components (SVG)
│   ├── UserProvider.tsx              # Auth context — username modal, balance
│   ├── CricketMatchCard.tsx          # Match card — scores, events, predict strip
│   ├── PredictionModal.tsx           # Quick-predict modal (home page)
│   └── Predictions.tsx               # MyPredictionsPanel FAB
│
├── lib/
│   ├── api.ts                        # Client-side fetch helpers
│   ├── config.ts                     # Provider + storage config from env
│   ├── scoring.ts                    # Pure scoring engine (calcPoints, computeLeaderboard)
│   ├── storage/
│   │   ├── index.ts                  # getStore() / getUserStore() factory
│   │   ├── types.ts                  # PredictionStore interface
│   │   ├── memory.ts                 # InMemoryPredictionStore (globalThis singleton)
│   │   ├── json.ts                   # JsonFilePredictionStore
│   │   ├── sqlite.ts                 # SqlitePredictionStore
│   │   ├── userTypes.ts              # UserStore interface
│   │   ├── userMemory.ts             # InMemoryUserStore
│   │   ├── userJson.ts               # JsonFileUserStore
│   │   └── userSqlite.ts             # SqliteUserStore
│   └── providers/
│       ├── base.ts                   # CricketProvider interface
│       ├── index.ts                  # Provider factory (singleton)
│       ├── cricketdata.ts            # CricketData.org adapter
│       ├── entitysport.ts            # EntitySport adapter
│       ├── mock.ts                   # Rich IPL 2026 mock data
│       └── teamColors.ts             # IPL + national team colour palette
│
├── store/
│   └── reactions.ts                  # In-memory reaction state (client)
│
└── types/
    └── index.ts                      # All shared types + STARTING_BALANCE / PREDICTION_STAKE
```

---

## Scoring Engine

The scoring logic lives entirely in `src/lib/scoring.ts` as pure functions — no side effects, easy to unit test.

```
calcPoints(prediction, match) → number
  ├── Void if tie / abandoned
  ├── Wrong winner: −5 pts  (+ up to +4 pts if scores close)
  └── Correct winner: +10 pts  (+ up to +10 pts for close scores)  × earlyMultiplier

computeLeaderboard(predictions, matches, userBalanceMap) → ScoringResult
  └── Returns: { newlyScored, leaderboard, userBalanceUpdates }

computeMatchLeaderboard(predictions, match) → MatchLeaderboardEntry[]
```

Stake timing: the 10 pt stake is deducted on submit (immediate balance feedback). At scoring time the stake is returned plus the net points from `calcPoints`, so the total effect is identical.

---

## Key Types

```ts
CricketMatch   — id, name, matchType, status, homeTeam, awayTeam, homeScore, awayScore, events
CricketScore   — runs, wickets, overs, runRate, inningNumber, isComplete
MatchStatus    — UPCOMING | LIVE | TOSS | INNINGS_BREAK | COMPLETED | ABANDONED | ...
MatchType      — T20 | ODI | TEST | T10
User           — id, name, balance, createdAt
Prediction     — matchId, userId, predictedWinner, predictedHomeRuns, predictedAwayRuns, stake, points, scored
LeaderboardEntry      — userId, userName, balance, totalPoints, rank, predictions
MatchLeaderboardEntry — userId, userName, predictedWinner, predictedHomeRuns, predictedAwayRuns, points, rank
```

---

## Colour Palette

| Token | Value | Usage |
|---|---|---|
| Background | `#070d1a` | Page background |
| India Blue | `#003791` | Primary brand, buttons |
| Saffron | `#FF7722` | Accent, CTAs, "Play" wordmark |
| Teal | `#00D4B4` | Positive points, correct picks |
| Card bg | `#0e1628` | Card surfaces |
| Border | `#1e2d45` | Card borders, dividers |
| Red | `red-400` | Wrong picks, negative points |
