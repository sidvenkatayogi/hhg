# Honk-OTP 2FA: Product Requirements Document

**Organization:** Anser-Auth  
**Product:** Honk-OTP (Honk-factor Authentication)  
**Tagline:** "Waterfowl-Grade Encryption"

---

## 1. Problem Statement

### The Crisis

Traditional 6-digit SMS codes are *for the birds* — and not in a good way. Users forget them, hackers intercept them, and they breed a false sense of security while actual threats fly overhead undetected. Human-centric security has failed because we've been asking users to remember things. Geese never forget anything, and they're angrier about it.

### The Solution: Honk-factor Authentication (HFA)

We present **Honk-OTP**, a proprietary 2FA protocol that replaces insecure numeric codes with unique, non-repeating **acoustic goose signatures**. Authentication is no longer a passive act—it is a *biometric-acoustic handshake* requiring the user to physically re-honk an encrypted audio stream back into their computer.

The protocol works as follows:

1. System initiates a VOIP call to the user
2. User receives a unique "Seed Honk"—never before heard, never to be heard again
3. User must hold their phone speaker to their computer's microphone
4. System analyzes the captured honk against cryptographic goose-voice parameters
5. On 95% acoustic match, user gains access

This transforms authentication from **"something you know"** into **"something a goose knows about you."**

---

## 2. The User Journey (The "Migration" Flow)

### Step 1: The Outbound Call

The system initiates a VOIP call to the user's registered phone number. The user hears their personal, non-repeating goose honk—the "Seed Honk"—transmitted through crystal-clear phone audio.

*UI: Phone ringing animation. Text: "INITIATING GOOSE CALL..."*

### Step 2: The Acoustic Capture

The user must hold their phone speaker directly to their computer's microphone. The browser's Web Audio API begins listening for the re-transmitted honk.

*UI: Large microphone icon. Text: "HOLD PHONE TO MICROPHONE. The goose is listening."*

### Step 3: The Verification

The system analyzes three acoustic dimensions:

- **Frequency Profile:** Fundamental frequency (F0), harmonic overtones, spectral centroid
- **Amplitude Dynamics:** Attack/decay envelope, peak dBFS, RMS energy curve
- **Aggression Coefficient:** Harmonic-to-noise ratio, crest factor, spectral distortion

The system compares these against the known Seed Honk parameters. A 95% match is required for authentication success.

*UI: Progress bar animating through frequency → amplitude → aggression checks. Text: "ANALYZING HONK SIGNATURE..."*

### Step 4: The Hiss-Success

Upon a 95% acoustic match, the system verifies the honk is not:
- A recording of a different goose
- A human mouthing the word "honk"
- A mallard (a known imposter species)

On success, the user is granted access with a celebratory **V-formation animation**—geese flying in perfect formation across the screen, trailing confetti.

*UI: V-formation animation. Text: "HONK VERIFIED. Access granted."*

---

## 3. Technical Specifications

### 3.1 Honk-Print Mapping

The authentication algorithm distinguishes between genuine Canada Goose signatures and Sub-standard Mallard interference through a weighted composite score:

**Composite Match Score = (0.40 × Frequency Match) + (0.25 × Amplitude Match) + (0.35 × Aggression Match)**

#### Frequency Match (40% weight)
Extract MFCC (Mel-Frequency Cepstral Coefficients) from both captured and reference signals. Compute cosine similarity between MFCC vectors. This captures spectral shape independent of volume.

```
frequencyMatch = cosineSimilarity(capturedMFCC, referenceMFCC)
```

#### Amplitude Match (25% weight)
Analyze the ADSR envelope (Attack, Decay, Sustain, Release). Divide both signals into 50ms windows, compute RMS energy, normalize 0-1, then calculate Pearson correlation between envelope curves.

```
amplitudeMatch = pearsonCorrelation(capturedEnvelope, referenceEnvelope)
```

#### Aggression Coefficient Match (35% weight)
Compute three sub-metrics of the captured signal:
- **Spectral Centroid (SC):** Mean frequency, weighted by magnitude
- **Crest Factor (CF):** Peak-to-RMS ratio
- **Harmonic-to-Noise Ratio (HNR):** Ratio of harmonic energy to noise floor

Compare each against expected values derived from the Seed Honk's `aggressionCoefficient` parameter (0-1 scale).

```
aggressionMatch = 1 - mean([|SC_actual - SC_expected| / SC_max, 
                              |CF_actual - CF_expected| / CF_max,
                              |HNR_actual - HNR_expected| / HNR_max])
```

#### Tier Determination
- **Apex (Dominant Gander):** Composite score ≥ 0.98 (near-perfect acoustic fidelity)
- **Compliant (Standard Goose):** Composite score ≥ 0.95 (meets threshold, access granted)
- **Gosling (Probationary):** Composite score ≥ 0.85 (degraded signal, read-only access)
- **Locked (Low-Energy Predator):** Composite score < 0.85 (authentication failed, account locked)

### 3.2 Latency & Echo Cancellation

The system must handle "Background Pond Noise" and degraded audio quality from consumer speakers and smartphone microphones.

#### Echo Cancellation Strategy
- **Client-side:** Web Audio API `echoCancellation: false` (we want to capture the original honk, not suppress it)
- **Reference Signal:** Rendered via `OfflineAudioContext` to produce a clean, deterministic ground-truth waveform
- **Tolerance:** The DTW (Dynamic Time Warping) distance metric allows 10-50ms timing offsets and time-stretching due to phone speaker/mic analog conversion

#### Spectral Noise Handling
If the captured signal has high spectral flatness (> 0.7, indicating broadband noise like crowd or wind), and the match score falls in the 0.80-0.95 range:
- Return a **warning** (HNK-014: "Bread-related distractions detected")
- Allow retry without incrementing failure counter
- Suggest moving to a quieter environment

### 3.3 The "Anti-Impersonation" Layer

The system detects three classes of fraudulent attempts:

#### Human Mouth-Honk Detection (HNK-012)
Humans saying "honk" exhibit:
- **Speech Formants:** F1 (~500-700 Hz) and F2 (~1000-2000 Hz) in the vowel space
- **Fricative Onset:** Broadband noise (1-4 kHz) 30-50ms before voicing begins (the /h/ sound)
- **Slow Voicing Ramp:** Gradual vocal cord vibration onset (not the abrupt onset of a goose)

**Detection:** If both speech formants AND /h/ fricative are present, flag as HNK-012 and reject.

#### Mallard Interference Detection (HNK-011)
Mallard quacks have distinctive acoustics:
- **Downward F0 Sweep:** Fundamental frequency drops ~100 Hz over the duration (descending quack)
- **Short Duration:** Typical 100-250ms (shorter than goose honks, typically 400-900ms)

**Detection:** If F0 descent > 60 Hz AND duration < 300ms, flag as HNK-011 and reject.

#### Replay Attack Detection (HNK-006)
A recording of an authorized goose honk played back through a speaker exhibits:
- **Temporal Artifacts:** Slight dropout/glitch patterns from the playback device
- **Spectral Flattening:** Reduced dynamic range due to compression in the recording/playback chain
- **Synchronous Harmonic Decay:** All harmonics decay together (synthetic), unlike real vocal decay

**Detection:** Analyze temporal jitter in harmonic onsets. If jitter is too regular (< 5ms variance), likely a recording. Flag as HNK-006 and lock account.

---

## 4. Edge Cases & Error Handling

### 4.1 The "Silent Gander" Error (HNK-010)

**Scenario:** User's phone is on mute.

**Detection:** `captureHonk()` function times out after 6 seconds with no audio detected above -50 dBFS silence threshold.

**User Experience:**
- Error code: HNK-010
- Message: *"No audio detected. Is your phone on mute? The goose waits for no one."*
- Action: Suggest unmuting phone and retrying
- Attempt counter: **Does NOT count as a failure** (user error, not auth failure)

### 4.2 The "Hissing Lockout" (HNK-013)

**Scenario:** User fails authentication three times consecutively.

**Lockout Mechanism:**
1. Record each failed attempt in localStorage: `honk_lockout_{pubkey}`
2. On third consecutive failure, set `lockedUntil = now + 86400000` (24 hours)
3. Disable all auth attempts; show countdown timer
4. After 24 hours, reset failure counter to 0

**User Experience:**
- Error code: HNK-013
- Message: *"Hissing Lockout activated. Account locked for 24 hours. The geese are unimpressed."*
- Display: Countdown timer in HH:MM:SS format
- Action: None available; must wait or contact support

### 4.3 Environmental Noise: "Bread-Related Distractions" (HNK-014)

**Scenario:** User is in a noisy environment (crowd, park with ducks, bread-throwing festival).

**Detection:** 
- Compute spectral flatness: `sqrt(N * ∏|X[k]|) / (∑|X[k]| / N)` where X is the magnitude spectrum
- Threshold: flatness > 0.7 indicates broadband noise
- Check match score: If 0.80 ≤ score < 0.95 AND spectral flatness > 0.7

**User Experience:**
- Error code: HNK-014
- Message: *"Environmental noise detected. Please move to a quieter location and retry."*
- Attempt counter: **Does NOT count as a failure**
- Suggestion: Show list of "Geese-friendly quiet zones" (joke feature)

---

## 5. Performance Metrics (KPIs)

### 5.1 Time-to-Honk (TTH)

**Definition:** Average seconds from "INITIATE GOOSE CALL" button click to successful authentication.

**Target:** < 15 seconds (includes 1.5s call ringing animation + 3s seed honk playback + 5s user positioning + 3s capture + 2s verification)

**Tracking:** Each completed attempt records `{ timestamp, durationMs, success, matchScore, tier, errorCode, flaggedAsReplay, flaggedAsImpersonation }`. The client keeps the **50 most recent** attempts in `localStorage` under `honk_otp_metrics` (see §11).

**KPI Display:** Dev console: `getHonkKPIs()` → `{ ttH_avg: 12.3, tth_min: 8.1, tth_max: 18.9 }`

### 5.2 False Honk Rate (FHR)

**Definition:** Percentage of users who successfully authenticate using a recording of a *different* goose or synthetic audio.

**Target:** < 0.1% (99.9% rejection of non-authorized honks)

**Tracking:** Count authentication attempts that:
- Pass the 95% match threshold
- Later flagged as replay/impersonation
- Get marked as security incidents

**Formula:** `FHR = (replay_attacks_detected + impersonation_detected) / total_auth_attempts × 100%`

### 5.3 Failure Rate by Error Code

**Tracking:** Count occurrences of each error code:
- HNK-010 (Silent Gander): Expected high, acceptable
- HNK-011 (Mallard): Expected low, indicates species confusion
- HNK-012 (Human Mouth-honk): Expected very low, indicates fraud attempt
- HNK-013 (Lockout): Expected low, indicates repeated failures
- HNK-014 (Environmental Noise): Expected medium-high, indicates location quality

**Dashboard:** Plot error distribution over time to identify patterns.

---

## 6. Security Disclaimer

**Anser-Auth is NOT responsible for:**

- Neighbors thinking you are mentally unstable for playing loud goose noises to your laptop at 2:00 AM
- HOA complaints regarding "suspicious honking sounds"
- Alerts from home security systems triggered by the Seed Honk audio
- Genuine geese in your area responding aggressively to the simulated honk
- Damage to speakers or microphones from excessive volume
- Any resulting interpersonal conflicts with roommates
- Psychological distress caused by hearing the phrase "Honk-factor Authentication" repeatedly in your head
- The integrity of your professional reputation should colleagues ask why you're honking into a microphone during a Zoom call

**Use at Your Own Risk.** Honk-OTP is a security measure and a cry for help.

---

## 7. Implementation Extras

### Backend Stack (Prototype)
- **VOIP Simulation:** No actual Twilio integration. Web Audio API plays the Seed Honk through browser speakers as a simulated "incoming call"
- **Seed Honk Generation:** Server generates randomized parameters; client synthesizes via Web Audio API oscillators, waveshapers, and gain nodes
- **Reference Signal:** Rendered via `OfflineAudioContext` for deterministic comparison baseline
- **Comparison Engine:** Client-side DSP (Python/Librosa pattern via JavaScript equivalent)

### Frontend Stack
- **Web Audio API:** Microphone capture (`getUserMedia`), audio synthesis (oscillators), analysis (FFT via `AnalyserNode`)
- **React Context:** State management for OTP flow (phone entry → calling → playing → listening → verifying → success/error)
- **CSS Animations:** V-formation celebration using CSS transforms and keyframes
- **Canvas Confetti:** Celebratory particle effects on successful auth

### DSP Functions to Implement
- `generateSeedHonkParams()` → randomized goose signature parameters
- `synthesizeSeedHonk(ctx, params)` → Web Audio API graph, returns Promise of playback completion
- `renderSeedHonkReference(params)` → OfflineAudioContext render → Float32Array
- `verifyHonkOtp(capturedAudio, referenceSignal, params)` → composite match score + tier
- `detectHumanMouthHonk(signal)` → boolean, confidence score
- `detectMallardQuack(signal)` → boolean, confidence score
- `detectReplayAttack(signal, params)` → boolean, confidence score

### Recommended Libraries
- **Next.js 16:** App Router, API routes, server components
- **Web Audio API:** Native browser API, no additional library needed
- **canvas-confetti:** Already in dependencies, use for celebration particles
- **Zod or TypeScript:** Type-safe schema validation for Seed Honk parameters

---

## 8. Success Criteria

- ✅ User receives unique Seed Honk each auth attempt (no repeats)
- ✅ 95% match threshold enforced (compliant tier and above)
- ✅ Anti-impersonation detection prevents replay/mouth-honk/mallard attacks
- ✅ 3-strike lockout with 24-hour cooldown implemented
- ✅ V-formation animation plays on success (audible celebration)
- ✅ KPIs tracked: TTH, FHR, error code distribution
- ✅ Tier system working (apex/compliant/gosling/locked)
- ✅ Environmental noise detection allows retry without penalty

---

**Document Version:** 1.2  
**Status:** Prototype complete (TypeScript + `next build` green as of 2026-04-04)  
**Approved by:** Chief Security Architect, Anser-Auth  
**Date:** 2026-04-04

---

## 9. Implementation Status

### Completed ✅

| File | Status | Notes |
|------|--------|-------|
| `src/lib/honk-types.ts` | ✅ Done | `SeedHonkParams`, `HonkOtpState`, `HonkOtpResult`, `HonkLockoutState`, `HonkRegistration`, `HonkOtpStep`. Error codes HNK-010–HNK-015 (incl. Seed Honk Expired). |
| `src/lib/seed-honk.ts` | ✅ Done | `generateSeedHonkParams()`, `synthesizeSeedHonk()`, `renderSeedHonkReference()`. Sawtooth + FM vibrato + waveshaper + bandpass. `WaveShaperNode.curve` casts satisfy strict `Float32Array<ArrayBuffer>` typing (live + offline graphs). |
| `src/lib/honk-otp-verify.ts` | ✅ Done | `verifyHonkOtp()`, frequency/amplitude/aggression matchers, `detectHumanMouthHonk()`, `detectMallardQuack()`, `spectralFlatness()` for HNK-014. |
| `src/lib/honk-metrics.ts` | ✅ Done | `recordAuthAttempt()`, `getHonkKPIs()`; up to 50 attempts in `honk_otp_metrics`. |
| `src/lib/honk-capture.ts` | ✅ Done | `captureHonk()` → `rawSignal: Float32Array`. Lockout + registration persistence. Capture timeout → HNK-010. |
| `src/lib/honk-dsp.ts` | ✅ Done | Shared DSP helpers (pitch, MFCC, etc.) used by capture and verification. |
| `src/app/api/honk-auth/challenge/route.ts` | ✅ Done | GET returns `seedHonk` + `expiresAt`. In-memory challenge map keyed by `pubkey`; exports `consumeChallenge()` for future binding to verify. |
| `src/app/api/honk-auth/verify/route.ts` | ✅ Done | POST validates `matchScore` ≥ 0.95, tier ∈ {apex, compliant, gosling}, rejects human/mallard flags. Best-effort audit from client after local DSP success. |
| `src/components/HonkAuthProvider.tsx` | ✅ Done | OTP state machine, lockout countdown, registration, `startAuth()` orchestration, KPI recording. |
| `src/components/VFormationAnimation.tsx` | ✅ Done | CSS V-formation + canvas-confetti (gold/orange). |
| `src/components/HonkOtpFlow.tsx` | ✅ Done | Modal flow: phone → calling → seed → listening → verifying → success/error. |
| `src/components/HonkAuthPrompt.tsx` | ✅ Done | REGISTER / INITIATE GOOSE CALL / lockout copy; uses `isRegistered` from provider. |
| `src/components/GooseArena.tsx` | ✅ Done | Renders `HonkAuthPrompt` when wallet connected and not honk-authenticated (`needsHonkAuth`). Registration gating lives in provider + prompt, not the arena flag. |
| `src/components/HonkEnrollment.tsx` | ✅ Removed | Replaced by `HonkOtpFlow.tsx`. |
| `src/app/layout.tsx` | ✅ Done | Mounts `HonkOtpFlow` via provider stack. |
| `src/app/globals.css` | ✅ Done | V-formation, seed pulse, verify progress animations. |

### Optional / backlog ⏳

| Item | Notes |
|------|-------|
| `POST /api/honk-auth/register` | Not implemented; phone “registration” is client-only (`honk_registration_{pubkey}`). Add when a real backend or SMS flow exists. |
| Bind `consumeChallenge()` in verify | Challenge route defines one-time `consumeChallenge(pubkey, seedHonkId)` but verify does not call it yet—prototype trusts the client-reported scores after a successful local match. Production should require a consumed, unexpired challenge server-side. |
| `src/lib/api.ts` honk helpers | `fetchHonkChallenge` / `verifyHonkAuth` still describe the **legacy** nonce/honkprint API; unused by the OTP UI. Remove or realign when consolidating HTTP clients. |
| Replay detection (HNK-006) | PRD describes heuristics; confirm parity with `honk-otp-verify.ts` and whether failed replay should increment lockout. |

---

## 10. HTTP API (Prototype)

### `GET /api/honk-auth/challenge?pubkey=<wallet_pubkey>`

**Response 200**

```json
{
  "seedHonk": { "id": "…", "fundamentalHz": 240, "harmonics": […], "amplitudeEnvelope": { … }, "durationMs": 600, "frequencyModulation": { … }, "aggressionCoefficient": 0.4, "createdAt": 0, "expiresAt": 0 },
  "expiresAt": 1712345678901
}
```

**Errors:** `400` if `pubkey` missing.

**Behavior:** Stores one challenge per pubkey in memory until consumed or expired (server restart clears the map).

### `POST /api/honk-auth/verify`

**Body (JSON)**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `pubkey` | string | ✓ | Wallet public key |
| `seedHonkId` | string | ✓ | Must match issued challenge in a hardened deployment |
| `matchScore` | number | ✓ | Must be ≥ `0.95` |
| `frequencyMatch` | number | | Echoed in response |
| `amplitudeMatch` | number | | Echoed in response |
| `aggressionMatch` | number | | Echoed in response |
| `tier` | string | ✓ | `apex` \| `compliant` \| `gosling` |
| `antiImpersonation` | object | | If `isHumanMouth` or `isMallard` → `403` |

**Response 200:** `{ success, pubkey, tier, seedHonkId, matchScore, …, authenticatedAt, message }`

**Errors:** `400` missing fields; `401` score below threshold; `403` invalid tier or impersonation flags.

**Note:** The UI calls this **after** local verification succeeds; failures do not hit this route today.

---

## 11. Client persistence (`localStorage`)

| Key pattern | Purpose |
|-------------|---------|
| `honk_otp_metrics` | Rolling list (max 50) of auth attempts for KPIs |
| `honk_lockout_{pubkey}` | `{ failureCount, lastFailureAt, lockedUntil }` |
| `honk_registration_{pubkey}` | `{ phoneNumber, registeredAt, pubkey }` |

Session state (tier, `authenticatedAt`, `seedHonkId`) is held in React context after a successful match; it is not persisted to `localStorage` in the prototype.

---

## 12. UX ↔ state machine (reference)

High-level steps driven by `HonkAuthProvider` + `HonkOtpFlow`:

1. **idle** → user opens flow; may require **phone-entry** if not registered.  
2. **calling** → simulated ring; then **playing-seed** (synthesized seed honk).  
3. **listening** → `captureHonk()` (mic).  
4. **verifying** → `verifyHonkOtp()` against offline-rendered reference + anti-impersonation checks.  
5. **success** → session + optional `POST /verify`; **error** → mapped `HonkError` (incl. HNK-013 lockout).

HNK-010 and HNK-014 do not advance the lockout failure counter (see provider).

---

## 13. Manual QA checklist

- [ ] Connect wallet → prompt appears when not authenticated.  
- [ ] Register phone (stored per pubkey) → “initiate call” enabled.  
- [ ] Full happy path: seed plays → honk captured → score ≥ 0.95 → V-formation + confetti.  
- [ ] Silent timeout (no audio) → HNK-010, no lockout strike.  
- [ ] Three substantive failures → HNK-013, 24h countdown, auth blocked until expiry.  
- [ ] DevTools: `getHonkKPIs()` reflects attempts after several tries.  
- [ ] Lockout clears on success path (`clearLockout`) and when 24h elapses (`isLockedOut` clears expired state).

---

## 14. Document history

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | — | Initial PRD: journey, DSP spec, edge cases, KPIs, disclaimer. |
| 1.1 | 2026-04-04 | Implementation status appendix; OTP codebase mapped. |
| 1.2 | 2026-04-04 | Closed open “next session” items; added API, persistence, QA, backlog; build verified. |
