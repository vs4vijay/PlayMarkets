<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Overview

**CricPulse** — India's Cricket Fan Zone

A Next.js 16 sports fan engagement platform for Indian cricket (IPL + national team). Users can:
- View live, recent, and upcoming cricket matches
- React to matches/events with emojis
- Make score & winner predictions

## Tech Stack

- Next.js 16.2.4 (App Router)
- React 19.2.4 with TypeScript 5
- Tailwind CSS 4
- ESLint 9

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Cricket Data Providers

The active provider is set via `CRICKET_PROVIDER` in `.env.local`.

| Provider       | Env value      | Free tier         | Config key              |
|----------------|----------------|-------------------|-------------------------|
| CricketData    | `cricketdata`  | 100 req/day       | `CRICKETDATA_API_KEY`   |
| EntitySport    | `entitysport`  | dev token         | `ENTITYSPORT_TOKEN`     |
| Mock (default) | `mock`         | unlimited         | none needed             |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Cricket fan zone home page (client)
│   ├── layout.tsx            # Root layout — CricPulse header/footer
│   ├── globals.css           # Global styles (navy/saffron theme)
│   └── api/matches/route.ts  # Server route — proxies provider data
├── components/
│   ├── CricketMatchCard.tsx  # Cricket match card with score display
│   └── Predictions.tsx       # Floating predictions panel
├── store/
│   └── reactions.ts          # In-memory reaction/comment state
├── lib/
│   ├── api.ts                # Client-side fetch helpers (/api/matches)
│   ├── config.ts             # Provider config from env vars
│   └── providers/
│       ├── base.ts           # CricketProvider interface
│       ├── index.ts          # Provider factory (singleton)
│       ├── cricketdata.ts    # CricketData.org implementation
│       ├── entitysport.ts    # EntitySport implementation
│       ├── mock.ts           # Rich IPL 2026 mock data
│       └── teamColors.ts     # IPL + national team colour palette
└── types/
    └── index.ts              # CricketMatch, CricketTeam, CricketScore, etc.
```

## Key Types

- `CricketMatch`: id, name, matchType, status, homeTeam, awayTeam, homeScore, awayScore, events
- `CricketScore`: runs, wickets, overs, runRate, inningNumber, isComplete
- `MatchStatus`: UPCOMING | LIVE | INNINGS_BREAK | COMPLETED | ABANDONED | ...
- `MatchType`: T20 | ODI | TEST | T10
- `ReactionType`: 🔥 | 💪 | 😭 | 🙌 | 😱 | 👀
- `Prediction`: matchId, userId, predictedWinner, predictedHomeRuns, predictedAwayRuns

## Styling

- Background: `#070d1a` (deep navy)
- India Blue: `#003791`
- Saffron: `#FF7722`
- Teal accent: `#00D4B4`
- Card bg: `#0e1628`, Border: `#1e2d45`