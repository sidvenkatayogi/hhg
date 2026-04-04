# GOOSE BETS 🪿

**The future of degenerate waterfowl gambling.**

Bet devnet SOL on what geese will do in AI-generated video clips. Polymarket meets shitposting about waterfowl.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your Phantom wallet (set to **devnet**), airdrop some SOL, and start betting.

## Full Setup

### Prerequisites

- Node.js 18+
- Phantom wallet browser extension
- Rust + Anchor CLI (for smart contract deployment)
- ElevenLabs API key (for video generation only)

### 1. Install dependencies

```bash
npm install
```

### 2. Generate videos (optional)

Pre-generated placeholder videos are included for development. To generate real videos:

```bash
ELEVENLABS_API_KEY=your_key node scripts/generate-videos.js

# Preview prompts without making API calls:
ELEVENLABS_API_KEY=xxx node scripts/generate-videos.js --dry-run
```

### 3. Deploy smart contract (optional)

```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
# Copy the program ID to .env.local
```

### 4. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your program ID and authority key
```

### 5. Run

```bash
npm run dev
```

## Deploy to Vercel

```bash
vercel deploy --prod
```

Set these environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_SOLANA_NETWORK=devnet`
- `NEXT_PUBLIC_PROGRAM_ID=<your_program_id>`
- `AUTHORITY_PRIVATE_KEY=<server_wallet_base58>`

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
- **Blockchain:** Solana devnet, Anchor framework
- **Video:** ElevenLabs AI video generation (Wan 2.5 model)
- **Deployment:** Vercel (frontend + API routes in one deploy)

## How It Works

1. A goose scenario video plays (setup)
2. You bet devnet SOL on what the goose will do next
3. Countdown expires, the reveal video plays
4. Winners get proportional share of the pot
5. Next round starts automatically

*No real geese were harmed. Some wallets were.*
