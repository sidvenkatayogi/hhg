# GOOSE BETS — Product Requirements Document

## Project Overview

**Goose Bets** is a meme sports betting platform where users wager devnet SOL on what geese will do in AI-generated video clips. Think Polymarket meets shitposting about waterfowl.

**Tagline:** *"The future of degenerate waterfowl gambling."*

**Context:** This is a hackathon project. Prioritize fun, polish on the betting UX, and a working Solana devnet flow over production concerns. Ship fast, make it funny.

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React, Tailwind CSS, TypeScript |
| Blockchain | Solana devnet, `@solana/web3.js`, `@solana/wallet-adapter-react` (Phantom/Solflare) |
| Smart Contract | Anchor framework (Rust), deployed to Solana devnet |
| Backend API | Next.js API Route Handlers (`app/api/`), serverless-compatible |
| Real-time | Polling (short-poll every 2s) — no WebSockets, for Vercel serverless compatibility |
| Video Generation | ElevenLabs Image & Video API (`@elevenlabs/elevenlabs-js` SDK), Wan 2.5 model |
| Video Storage | Static MP4 files served from `/public/videos/` |
| Deployment | Vercel (frontend + API routes in one deploy) |

### Project Structure

```
goose-bets/
├── anchor/                        # Solana smart contract
│   ├── programs/
│   │   └── goose-bets/
│   │       └── src/
│   │           └── lib.rs         # Betting pool program
│   ├── tests/
│   │   └── goose-bets.ts
│   ├── Anchor.toml
│   └── Cargo.toml
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout with wallet providers
│   │   ├── page.tsx               # Landing page
│   │   ├── arena/
│   │   │   └── page.tsx           # Main game view (Goose Arena)
│   │   └── api/                   # API Route Handlers (serverless)
│   │       ├── rounds/
│   │       │   ├── route.ts       # GET /api/rounds — list all rounds
│   │       │   ├── current/
│   │       │   │   └── route.ts   # GET /api/rounds/current — active round + state
│   │       │   └── [id]/
│   │       │       ├── route.ts   # GET /api/rounds/:id
│   │       │       └── resolve/
│   │       │           └── route.ts # POST /api/rounds/:id/resolve
│   │       ├── leaderboard/
│   │       │   └── route.ts       # GET /api/leaderboard
│   │       ├── state/
│   │       │   └── route.ts       # GET /api/state — poll endpoint for game state
│   │       └── stats/
│   │           └── route.ts       # GET /api/stats — meme stats
│   ├── components/
│   │   ├── WalletConnect.tsx
│   │   ├── GooseArena.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── BettingPanel.tsx
│   │   ├── CountdownTimer.tsx
│   │   ├── RevealSequence.tsx
│   │   ├── Leaderboard.tsx
│   │   └── LandingHero.tsx
│   ├── hooks/
│   │   ├── useGameState.ts        # Polls /api/state every 2s
│   │   └── useBetting.ts
│   ├── lib/
│   │   ├── solana.ts              # Solana helpers (airdrop, balance, etc.)
│   │   ├── api.ts                 # API client (fetch wrappers)
│   │   ├── rounds.ts              # Loads and types rounds.json
│   │   └── game-state.ts          # Server-side game state (in-memory singleton)
│   └── assets/
│       └── honk.mp3               # Honk sound effect
├── public/
│   └── videos/                    # Pre-generated MP4s (setup + reveal pairs)
├── data/
│   └── rounds.json                # Round definitions (scenarios, options, outcomes)
├── scripts/
│   └── generate-videos.js         # Standalone ElevenLabs video generation script
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                    # Vercel deployment config
├── package.json
└── README.md
```

**Why Next.js over Vite?** The project needs to deploy to Vercel as a single unit — frontend + backend together with zero extra infra. Next.js App Router gives us serverless API routes that deploy alongside the React frontend in one `vercel deploy`. No separate server process to manage.

---

## Data Model

### `rounds.json` — Round Definitions

This is the source of truth for all game content. Pre-authored, static config file.

```json
{
  "rounds": [
    {
      "id": "round_001",
      "title": "The Sandwich Standoff",
      "description": "A goose is eyeing a child's sandwich at the park...",
      "setupVideo": "/videos/round_001_setup.mp4",
      "revealVideo": "/videos/round_001_reveal.mp4",
      "options": [
        { "index": 0, "label": "🥪 Snatch the sandwich" },
        { "index": 1, "label": "🫡 Walk away peacefully" },
        { "index": 2, "label": "🗣️ Honk aggressively and assert dominance" },
        { "index": 3, "label": "🧍 Just stand there. Menacingly." }
      ],
      "correctOutcome": 0,
      "setupPrompt": "A fat white goose standing at the edge of a park pond, staring intensely at a child holding a sandwich, nature documentary style, dramatic tension, 5 second clip",
      "revealPrompt": "A goose lunges forward and snatches a sandwich from a shocked child, chaotic park scene, 5 second clip"
    }
  ]
}
```

Include 10–15 rounds. Each round has:
- `id`: Unique round identifier
- `title`: Funny scenario name
- `description`: Flavor text shown during betting
- `setupVideo` / `revealVideo`: Paths to pre-generated MP4s
- `options`: Array of 3–4 funny betting options with emoji prefixes
- `correctOutcome`: Index of the winning option
- `setupPrompt` / `revealPrompt`: ElevenLabs prompts (used by generate script only, stored here for reference)

#### Scenario Ideas (implement all of these)

| # | Title | Setup | Reveal (correct) | Options |
|---|---|---|---|---|
| 1 | The Sandwich Standoff | Goose stares at kid's sandwich in park | Goose snatches the sandwich | Snatch sandwich / Walk away / Honk aggressively / Stand menacingly |
| 2 | Dog vs. Goose | Goose in standoff with golden retriever | Goose charges, dog flees | Chase the dog / Get chased / Befriend the dog / Ignore it completely |
| 3 | Shopping Cart Heist | Goose next to unattended cart in parking lot | Goose climbs into cart, sits triumphantly | Steal the cart / Knock it over / Sit in it / Poop on it |
| 4 | Bike Path Standoff | Goose blocking bike path, cyclist approaching | Goose doesn't move at all, cyclist swerves | Move aside / Charge the bike / Fly away / Do absolutely nothing |
| 5 | The Picnic Raid | Goose approaching an unattended picnic blanket | Goose drags the whole blanket away | Eat everything / Drag the blanket / Sit on the blanket / Honk at ants |
| 6 | Office Infiltrator | Goose standing outside glass office doors | Goose walks through automatic doors into office | Walk right in / Peck at the glass / Wait for someone / Poop on the welcome mat |
| 7 | The Fountain Dip | Goose standing at edge of a mall fountain | Goose kicks coins out of the fountain | Swim in it / Drink from it / Kick out the coins / Splash a tourist |
| 8 | Golf Course Chaos | Goose on a golf green near a ball | Goose steals the golf ball and runs | Steal the ball / Honk at golfers / Sit in the hole / Chase the golf cart |
| 9 | Wedding Crasher | Goose waddling toward an outdoor wedding setup | Goose sits in a chair in the front row | Attack the cake / Sit in a chair / Steal a ring / Honk during vows |
| 10 | Gas Station Goose | Goose standing at a gas pump | Goose pecks the screen and starts a transaction | Peck the screen / Block traffic / Steal snacks / Stare at customers |
| 11 | Beach Towel Bandit | Goose on a beach near a tourist's towel | Goose drags the towel into the water | Steal the towel / Steal sunglasses / Kick sand / Sunbathe |
| 12 | The Bread Decoy | Someone throwing bread, goose watching | Goose ignores bread, steals the whole bag | Eat the bread / Ignore bread, steal bag / Share with ducks / Honk for more |

---

## Smart Contract (Anchor Program)

### Program: `goose_bets`

A simple Solana betting pool program. Keep it minimal — this is a hackathon.

#### Accounts

```
BettingPool (PDA, seeded by round_id)
├── round_id: String
├── options_count: u8
├── total_pot: u64 (lamports)
├── option_totals: Vec<u64>       # total wagered per option
├── is_resolved: bool
├── winning_option: Option<u8>
├── authority: Pubkey              # backend server wallet that resolves rounds
└── bump: u8

UserBet (PDA, seeded by round_id + user pubkey)
├── user: Pubkey
├── round_id: String
├── option: u8
├── amount: u64 (lamports)
├── claimed: bool
└── bump: u8
```

#### Instructions

1. **`initialize_pool(round_id, options_count)`** — Create a new betting pool for a round. Called by the backend/authority.
2. **`place_bet(round_id, option, amount)`** — User places a bet. Transfers SOL from user to pool PDA. Creates a `UserBet` account.
3. **`resolve_round(round_id, winning_option)`** — Authority resolves the round. Sets `winning_option` and `is_resolved = true`.
4. **`claim_winnings(round_id)`** — Winner claims proportional share of the pot. Transfers SOL from pool PDA to user. Marks `UserBet.claimed = true`.

#### Payout Logic

- Winner's share = `(user_bet_amount / total_winning_option_amount) * total_pot`
- If no one bet on the winning option, refund all bets
- Keep it simple: no house rake, no fees

#### Deployment

- Deploy to Solana **devnet** only
- Include deployment instructions in README
- Export the IDL for frontend consumption

---

## Backend API (Next.js API Route Handlers)

All backend logic lives in `src/app/api/` as Next.js Route Handlers. These deploy as Vercel serverless functions automatically — no separate server to manage.

### Endpoints

```
GET  /api/rounds              # List all rounds (metadata only, no prompts)
GET  /api/rounds/[id]         # Get specific round details
GET  /api/rounds/current      # Get the current active round
POST /api/rounds/[id]/resolve # Resolve a round (triggers on-chain resolution)
GET  /api/state               # Poll endpoint — returns full game state (round, status, countdown, bet totals)
GET  /api/leaderboard         # Top winners by total SOL won
GET  /api/stats               # Meme stats (total volume, total bets, etc.)
```

### Game State Management

**Important Vercel constraint:** Serverless functions are stateless. In-memory state does NOT persist between invocations in production. For the hackathon, there are two options:

**Option A (recommended for hackathon demo):** Use Vercel KV (Redis) or a simple JSON file in `/tmp` for state. Vercel KV is free tier and requires zero config beyond `npm i @vercel/kv`. Store the game state there.

**Option B (local dev / single-instance):** Use a module-level singleton in `src/lib/game-state.ts`. This works in `next dev` and in Vercel if traffic is low enough to hit the same warm instance. Good enough for a demo.

```typescript
// src/lib/game-state.ts
interface GameState {
  currentRoundIndex: number;
  roundStatus: 'betting' | 'countdown' | 'revealing' | 'resolved';
  bettingEndsAt: number;          // Unix timestamp
  roundStartedAt: number;
  bets: Map<string, UserBetInfo>; // pubkey -> bet info (for leaderboard tracking)
}

// Singleton — survives across requests in the same serverless instance
let gameState: GameState = { ... };
export function getGameState() { return gameState; }
export function advanceRound() { ... }
```

### Round Lifecycle

The round lifecycle is **client-driven with server validation**, not server-pushed:

1. `/api/rounds/current` returns the active round + `bettingEndsAt` timestamp
2. Client counts down locally using `bettingEndsAt` (no server ticks needed)
3. Client polls `/api/state` every 2 seconds to sync bet totals and round status
4. When countdown expires, client shows "BETTING CLOSED" and polls for reveal
5. Any client (or a cron/manual trigger) can hit `POST /api/rounds/[id]/resolve` to resolve on-chain
6. `/api/state` returns `roundStatus: 'resolved'` with the winning option
7. After 15 seconds, `/api/state` returns the next round automatically

### Real-Time via Polling (Vercel-Compatible)

**No WebSockets or Socket.IO** — Vercel serverless doesn't support persistent connections.

Instead, the frontend `useGameState` hook polls `GET /api/state` every 2 seconds:

```typescript
// src/hooks/useGameState.ts
function useGameState() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
```

The `/api/state` response includes everything the client needs:

```json
{
  "round": { "id": "round_003", "title": "The Shopping Cart Heist", ... },
  "status": "betting",
  "bettingEndsAt": 1712345678,
  "secondsRemaining": 42,
  "betTotals": [2.5, 1.2, 0.8, 3.1],
  "totalPot": 7.6
}
```

---

## Frontend (Next.js + React + Tailwind)

### Design System

**Aesthetic direction:** Maximalist chaotic meme energy. Dark, loud, funny. Like a degenerate gambling site designed by a goose.

**Color Palette:**
- Background: `#0a0a0a` (near-black)
- Surface: `#1a1a1a` (dark gray cards)
- Primary/Accent: `#FF6B00` (goose beak orange)
- Secondary: `#FFD700` (gold/winner color)
- Text: `#FAFAFA` (white)
- Muted text: `#888888`
- Success (winner): `#00FF88`
- Danger (loser): `#FF4444`
- Border glow: Orange/gold glows on hover states

**Typography:**
- Display/Headers: A bold, distinctive display font — something chunky and chaotic. Use a Google Font like `Bungee`, `Righteous`, `Lilita One`, or `Luckiest Guy`. Pick ONE and commit.
- Body: `JetBrains Mono` or `Space Mono` (monospace for that degen terminal vibe)
- Numbers/SOL amounts: Monospace, always

**Motion & Effects:**
- Goose emoji 🪿 scattered as confetti on wins
- Screen shake on reveals
- Pulsing orange glow on the active betting card
- Countdown timer with dramatic scaling as it approaches zero
- "HONK" text flash on bet confirmation
- Slot-machine-style reveal for the winning option
- Subtle background noise/grain texture

**Sound Effects:**
- Honk sound on bet placement
- Dramatic drumroll or tension sound during reveal countdown
- Victory honk fanfare for winners
- All sounds should be toggleable (mute button)

### Pages & Components

#### 1. Landing Page (`LandingPage.tsx`)

Full-screen hero with maximum meme energy:

- Giant goose illustration or emoji art at center
- Title: **"GOOSE BETS"** in huge display font with orange glow
- Subtitle: *"The future of degenerate waterfowl gambling"*
- Big CTA button: **"CONNECT WALLET TO ENTER THE HONK ZONE"** (pulsing orange, honk on hover)
- Fake scrolling ticker at bottom: `"🪿 HONK HONK HONK — Total Volume Honked: 420.69 SOL — Active Degens: 69 — Geese Wronged: 0 — HONK HONK HONK"` (marquee animation)
- Dark background with subtle animated grain
- Small text at bottom: *"Built on Solana devnet. No real geese were harmed. Some wallets were."*

#### 2. Goose Arena (`GooseArena.tsx`) — Main Game View

This is the core experience. Layout:

```
┌──────────────────────────────────────────────┐
│  GOOSE BETS 🪿          [Balance] [Airdrop]  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │         VIDEO PLAYER (16:9)            │  │
│  │    (setup video looping / reveal)      │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Round 3: "The Shopping Cart Heist"          │
│  What does the goose do next?                │
│                                              │
│  ⏱️ 0:42 remaining                           │
│                                              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ 🛒 Steal the │  │ 💥 Knock it  │          │
│  │    cart       │  │    over      │          │
│  │   2.5 SOL    │  │   1.2 SOL    │          │
│  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ 🪑 Sit in it │  │ 💩 Poop on   │          │
│  │              │  │    it        │          │
│  │   0.8 SOL    │  │   3.1 SOL    │          │
│  └──────────────┘  └──────────────┘          │
│                                              │
│  Wager: [____] SOL    [PLACE BET 🪿]         │
│                                              │
│  ── Leaderboard ──────────────────────────── │
│  1. 0xdegen...420  🏆 12.5 SOL              │
│  2. honkmaster.sol 🥈  8.2 SOL              │
│  3. goosewhisp.sol 🥉  5.1 SOL              │
└──────────────────────────────────────────────┘
```

#### 3. Component Details

**WalletConnect (`WalletConnect.tsx`)**
- Uses `@solana/wallet-adapter-react-ui` for Phantom/Solflare
- Shows truncated address when connected
- Displays SOL balance (auto-refreshes)
- "Airdrop 2 SOL" button (calls `requestAirdrop` on devnet)
- Connection state persists in wallet adapter

**VideoPlayer (`VideoPlayer.tsx`)**
- Plays MP4 from static path
- Setup video: autoplay, loop, muted
- Reveal video: plays once on trigger, NOT looped
- Smooth crossfade transition between setup → reveal
- 16:9 aspect ratio, rounded corners, subtle border glow

**BettingPanel (`BettingPanel.tsx`)**
- 2x2 grid of option cards
- Each card shows: emoji + label + total SOL wagered on this option
- Selected card gets orange glow border
- Wager input: number input with SOL denomination, min 0.01 SOL
- "PLACE BET" button — triggers wallet transaction
- After placing: card shows user's bet, button changes to "BET PLACED ✓"
- Disabled state when betting is closed

**CountdownTimer (`CountdownTimer.tsx`)**
- Circular or bar countdown (60 seconds default)
- Gets more dramatic as time runs out (color shift to red, pulsing, scale up)
- Shows "BETTING CLOSED" when expired
- Final 10 seconds: plays urgency sound (optional)

**RevealSequence (`RevealSequence.tsx`)**
- Orchestrates the reveal animation:
  1. "BETTING CLOSED" overlay (1s)
  2. Dramatic pause with pulsing "REVEALING..." text (2s)
  3. Play reveal video (5s)
  4. Flash winning option with confetti/honk effects
  5. Show results: "YOU WON X SOL" or "REKT 🪿"
  6. "Claim Winnings" button for winners (triggers on-chain claim)
  7. Transition to next round after 15s

**Leaderboard (`Leaderboard.tsx`)**
- Top 10 wallets by total winnings
- Columns: Rank, Address (truncated), Total Won
- Updates in real-time via WebSocket
- Trophy emoji for #1

### Wallet Integration Details

```typescript
// Required wallet adapter packages
@solana/wallet-adapter-base
@solana/wallet-adapter-react
@solana/wallet-adapter-react-ui
@solana/wallet-adapter-wallets  // Phantom, Solflare
@solana/web3.js

// Connection config
const network = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl('devnet');

// Airdrop helper
async function requestAirdrop(connection, publicKey) {
  const sig = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);
}
```

### Meme Copy & UI Text

Sprinkle these throughout the UI:

- Header: "GOOSE BETS — The future of degenerate waterfowl gambling"
- Empty state: "No active rounds. The geese are resting. (They're plotting.)"
- Bet confirmation: "HONK! Your bet is locked in."
- Win message: "THE GOOSE GODS SMILE UPON YOU 🪿✨"
- Loss message: "REKT BY A GOOSE. tale as old as time."
- Airdrop button: "AIRDROP ME (devnet, dw)"
- Loading: "Summoning geese from the blockchain..."
- Leaderboard title: "HALL OF HONK 🏆"
- Footer stat ticker: "Total Volume Honked: 420.69 SOL | Bets Placed: 1,337 | Geese Angered: 42"
- 404 page: "This goose has flown the coop. 🪿"

---

## Video Generation Script

### `scripts/generate-videos.js`

Standalone Node.js script. User runs this with their own ElevenLabs API key before launching the app.

```
Usage: ELEVENLABS_API_KEY=xxx node scripts/generate-videos.js
```

#### Behavior

1. Reads `rounds.json` for all scenario prompts
2. For each round, generates:
   - Setup video (5s, 16:9, Wan 2.5 model, text-to-video)
   - Reveal video (5s, 16:9, Wan 2.5 model, text-to-video)
3. Batch up to 4 generations at a time (Wan 2.5 limit)
4. Polls for completion, downloads MP4s to `public/videos/`
5. Filenames: `round_XXX_setup.mp4`, `round_XXX_reveal.mp4`
6. Logs progress: `[3/24] Generating reveal for "The Sandwich Standoff"...`
7. Handles rate limits with exponential backoff
8. Skips files that already exist (resume support)

#### ElevenLabs API Details

```javascript
// SDK setup
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

// Generate video
const result = await client.textToVideo.generate({
  prompt: "A fat white goose standing at the edge of a park pond...",
  model: "wan-2.5",       // Cheapest: 2,500 credits
  duration: "5",           // 5 or 10 seconds
  aspect_ratio: "16:9",   // 16:9, 1:1, or 9:16
  resolution: "720p",      // Keep 720p to save credits
});
```

Refer to the ElevenLabs docs for exact SDK usage: https://elevenlabs.io/docs/overview/capabilities/image-video

The script should also handle checking the API response for the video URL/file and saving it properly. Add a `--dry-run` flag that prints all prompts without making API calls (for review).

---

## Implementation Plan

Build in this order. Each step should be independently testable.

### Phase 1: Project Scaffolding
1. Initialize Next.js project with TypeScript + Tailwind (`npx create-next-app@latest --typescript --tailwind --app`)
2. Set up project structure: `src/app/`, `src/components/`, `src/lib/`, `data/`, `scripts/`
3. Create `data/rounds.json` with all 12 scenarios
4. Create the video generation script `scripts/generate-videos.js`
5. Add placeholder videos for dev mode
6. Verify `npm run dev` works and `vercel dev` works

### Phase 2: Smart Contract
1. Initialize Anchor project in `anchor/`
2. Implement `BettingPool` and `UserBet` account structs
3. Implement `initialize_pool`, `place_bet`, `resolve_round`, `claim_winnings` instructions
4. Write basic tests
5. Deploy to devnet, export IDL into `src/lib/`

### Phase 3: API Routes
1. `GET /api/rounds` and `GET /api/rounds/[id]` — serve round data from `rounds.json`
2. `GET /api/state` — game state polling endpoint (current round, status, countdown, bet totals)
3. `POST /api/rounds/[id]/resolve` — resolve round on-chain using authority wallet
4. `GET /api/leaderboard` and `GET /api/stats`
5. Game state singleton in `src/lib/game-state.ts` with round lifecycle logic

### Phase 4: Frontend — Core
1. Wallet connection (Phantom adapter, balance display, airdrop)
2. Landing page (`src/app/page.tsx`) with full meme design
3. Video player component (setup loop + reveal playback)
4. Betting panel (option selection, wager input)
5. On-chain bet placement via wallet transaction

### Phase 5: Frontend — Game Loop
1. `useGameState` hook polling `/api/state` every 2s
2. Countdown timer with client-side rendering off `bettingEndsAt`
3. Reveal sequence (dramatic pause → reveal video → results)
4. Claim winnings flow
5. Auto-advance to next round

### Phase 6: Polish & Deploy
1. Sound effects (honk on bet, fanfare on win)
2. Confetti/particle effects on wins
3. Screen shake on reveal
4. Leaderboard
5. Stat ticker with meme numbers
6. Goose favicon (animated if possible)
7. Mobile responsiveness
8. `vercel.json` config, env var setup
9. Test full flow on Vercel preview deployment
10. README with local dev + Vercel deployment instructions

---

## Running the Project

### Prerequisites
- Node.js 18+
- Rust + Anchor CLI (for smart contract)
- Phantom wallet browser extension
- ElevenLabs API key (for video generation only)
- Vercel CLI (optional, for deployment): `npm i -g vercel`

### Local Dev Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate videos (optional — can use placeholder videos for dev)
ELEVENLABS_API_KEY=your_key node scripts/generate-videos.js

# 3. Build and deploy the Anchor program to devnet
cd anchor
anchor build
anchor deploy --provider.cluster devnet
# Copy the program ID to .env.local as NEXT_PUBLIC_PROGRAM_ID

# 4. Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=<your_deployed_program_id>
AUTHORITY_PRIVATE_KEY=<server_wallet_private_key_for_resolving_rounds>
EOF

# 5. Start the dev server (frontend + API routes together)
npm run dev   # runs on http://localhost:3000

# 6. Open browser, connect Phantom (set to devnet), airdrop SOL, start betting
```

### Dev Mode Without Videos

For development without ElevenLabs, include 2-3 placeholder MP4 files (any short clip) in `public/videos/` and update `data/rounds.json` to point to them. The full video generation is a separate offline step.

---

## Vercel Deployment

This project is designed to deploy to Vercel with zero extra infrastructure. One repo, one deploy, everything works.

### Deploy Steps

```bash
# Option A: Vercel CLI
vercel deploy --prod

# Option B: Connect GitHub repo to Vercel dashboard
# Push to main → auto-deploys
```

### Vercel Configuration

Include a `vercel.json` in the project root:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SOLANA_NETWORK": "devnet"
  }
}
```

### Environment Variables (set in Vercel dashboard)

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=<deployed_anchor_program_id>
AUTHORITY_PRIVATE_KEY=<server_wallet_base58_private_key>
```

`AUTHORITY_PRIVATE_KEY` is a server-side only env var (no `NEXT_PUBLIC_` prefix) — used by the resolve endpoint to sign on-chain transactions. Generate a throwaway devnet wallet for this.

### Video Assets on Vercel

Pre-generated MP4s in `public/videos/` are served as static assets by Vercel's CDN automatically. No extra config needed. Note: Vercel has a 250MB limit for the `public/` directory on the free tier. At ~5MB per 5-second 720p clip, 24 clips ≈ 120MB — well within limits.

If videos exceed the limit, move them to Vercel Blob storage or an external CDN and update the video URLs in `rounds.json`.

### Deployment Checklist

- [ ] All MP4 files present in `public/videos/`
- [ ] `data/rounds.json` video paths match filenames in `public/videos/`
- [ ] Anchor program deployed to devnet, program ID set in env vars
- [ ] Authority wallet funded with devnet SOL (for resolving rounds)
- [ ] Environment variables set in Vercel dashboard
- [ ] `vercel deploy --prod` succeeds
- [ ] Phantom wallet connects and can airdrop on the deployed URL

---

## Scope Boundaries (What NOT to Build)

- ❌ No admin panel
- ❌ No user accounts or auth (wallet is identity)
- ❌ No database (in-memory state or Vercel KV at most)
- ❌ No real SOL — devnet only, always
- ❌ No on-the-fly video generation — all pre-generated
- ❌ No chat or social features
- ❌ No house rake or fee system
- ❌ No WebSockets — polling only (Vercel serverless constraint)
- ❌ No separate backend server — everything is Next.js API routes

---

## Key Technical Decisions

1. **Why Next.js over Vite?** — The project needs to deploy to Vercel as a single unit. Next.js App Router gives us serverless API routes alongside React pages in one `vercel deploy`. No separate server process, no extra infra. Worth the small overhead for zero-config deployment.
2. **Why polling over WebSockets?** — Vercel serverless functions don't support persistent connections (no Socket.IO, no WebSockets). Polling `/api/state` every 2 seconds is simple, reliable, and good enough for a hackathon demo. The countdown timer runs client-side off the `bettingEndsAt` timestamp so it feels smooth despite polling.
3. **Why in-memory state?** — No persistence needed for a hackathon. Rounds cycle. Leaderboard resets on restart. For the demo, a module-level singleton in the API routes works. If deploying to Vercel for real, swap in Vercel KV (free tier Redis) with minimal code changes.
4. **Why pre-generated videos?** — ElevenLabs generation takes time. Pre-generating keeps the UX snappy. The generation script is a separate step.
5. **Why Anchor?** — Provides the IDL and TypeScript client generation, making frontend integration much easier than raw Solana programs.

---

## Success Criteria

A successful implementation means:
1. A user can connect their Phantom wallet on Solana devnet
2. They see a goose video clip and 3-4 funny betting options
3. They can place a bet with devnet SOL via an on-chain transaction
4. A countdown expires, a reveal video plays, and the winner is shown
5. Winners can claim proportional winnings on-chain
6. The next round starts automatically
7. The whole thing looks hilarious and feels polished
8. Someone seeing this at a hackathon demo says "wait, this is actually sick"