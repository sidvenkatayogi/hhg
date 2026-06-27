# Goose Bets

VIDEO LINK: https://cap.so/s/1jewm0pwdw3rxw7

## Inspiration

**Goose Bets** grew out of a playful mix of degenerate crypto culture, absurd "serious" security theater, and the simple joy of watching geese. The idea is to bet devnet SOL on what happens next in goose-themed video rounds — treating a silly premise with enough structure (wallet integration, betting pools, leaderboard, timed rounds) that it feels like a real mini-product, while the **Honk Verification** layer parodies biometric and voice-based 2FA with goose lore ("Waterfowl Handshake Protocol," tiers like Dominant Gander vs. Gosling).

---

## What it does

Users connect a **Solana wallet** and complete a **Honk Verification** flow — their wallet is auto-registered, a **Seed Honk** plays through the browser speakers (optionally generated via **ElevenLabs** when API keys are configured, otherwise synthesized client-side with Web Audio), then the user reproduces the honk into their microphone. The captured audio is compared against the reference signal using client-side DSP (frequency, amplitude, and aggression coefficient matching). Based on the match score, users are assigned a tier: **Dominant Gander** (full access), **Standard Goose** (full access), or **Gosling** (read-only). After verification, users can **bet on round outcomes** during the betting phase. The app shows **goose video clips**, a **countdown timer**, **live pot totals**, a **bet feed**, a **leaderboard** ("Hall of Honk"), and a **reveal sequence** with V-formation animation and confetti when the round resolves.

---

## How we built it

The app is a **Next.js 16** (App Router) frontend with **React 19**, **Tailwind CSS 4**, and **TypeScript**. Solana integration uses **wallet-adapter** and **@solana/web3.js** — bets are real on-chain SOL transfers on devnet to a deterministic pool wallet. Game state and round data come from **API routes** and a polling hook (`useGameState` polls `/api/state` every 2 seconds). Round content (goose scenario videos) is pre-generated using **ElevenLabs** text-to-video (Wan 2.5 model) and served as static MP4s. Honk Verification uses the **Web Audio API** for seed honk synthesis and playback, microphone capture via `getUserMedia`, and client-side DSP checks (YIN pitch detection, formant estimation, MFCC extraction) in `honk-otp-verify`. When ElevenLabs API keys are set, the seed honk is real TTS audio (PCM s16le @ 44100 Hz) with the same verification pipeline. The UI uses a warm **cream/brown palette** with custom fonts (GoofyPuff for display, PlotterxsTRIAL for body), noise textures, marquee tickers, and an Anchor framework setup for the Solana smart contract.

---

## Challenges we ran into

**Verification UX**: getting a stable but not impossible honk match threshold required tuning — the pass threshold was lowered to 40% for demo accessibility while keeping the tier system meaningful. **Audio pipeline complexity**: Web Audio autoplay policies, sample rate mismatches between ElevenLabs output (44100 Hz) and browser AudioContext, and resampling edge cases all needed careful handling. **Site audio conflicts**: the arena video would un-mute itself during honk verification due to React effects racing with the mute hook — solved with a polling interval that enforces mute on all media elements during the verification flow. **Betting state disconnect**: on-chain SOL transfers were succeeding (balance decreased) but the UI wasn't reflecting bets because the local React state wasn't being updated after the transaction — required wiring up the `recordUserBet` callback from the betting hook into the panel component.

---

## Accomplishments that we're proud of

A full **multi-step Honk Verification modal** (preparing seed -> playing seed -> listening -> analyzing -> V-formation confetti on success) with real audio DSP and anti-impersonation detection (duck mimicry, mouth-honk, mallard interference). **ElevenLabs dual integration** — both for pre-generating goose scenario videos and for producing the seed honk TTS audio, while gracefully falling back to Web Audio synthesis when keys aren't configured. A **wallet-gated betting flow** with real on-chain devnet SOL transfers, live pot tracking, odds display, and a reveal sequence. The **cream/brown UI overhaul** with custom fonts, branded goose imagery, and polished animations that make it feel like a real product despite being a hackathon build.

---

## What we learned

**Biometric UX is easy to over-promise**: the verification has to work reliably in noisy demo environments, so thresholds need to be forgiving while still being theatrical. **Browser audio is a minefield**: autoplay policies, sample rate conversion, and competing media elements all interact in non-obvious ways. **On-chain doesn't mean on-screen**: sending a successful Solana transaction is only half the work — the frontend state management has to reflect the bet or users think it failed. **Hackathon polish compounds**: small touches like the V-formation animation, honk error codes (HNK-002: Duck Mimicry), and the "Hall of Honk" leaderboard name make the demo land way harder than the underlying tech alone.

---

## What's next for Goose Bets

**Server-side bet persistence** — currently bets are real on-chain transfers but the app uses in-memory deterministic mock data for pot totals and leaderboards; wiring up the Anchor program's betting pool PDAs would make everything trustless. **Stricter verification thresholds and tiers** for a production security posture. **Mobile testing** for mic capture and wallet flows (Phantom mobile deep links). **More round content** — the ElevenLabs video generation pipeline supports it, just needs more scenario prompts. **Real payout flow** — the claim winnings button exists in the UI but needs to be connected to the on-chain claim instruction. **Deployment to Vercel** with environment variables and static video assets served from CDN.
