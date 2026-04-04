"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type {
  HonkTier,
  HonkSession,
  HonkOtpState,
  HonkError,
  HonkErrorCode,
  HonkChallengeResponse,
} from "@/lib/honk-types";
import { HONK_ERRORS } from "@/lib/honk-types";
import {
  captureHonk,
  saveRegistration,
  loadRegistration,
  deleteRegistration,
} from "@/lib/honk-capture";
import { getAudioContext } from "@/lib/audio-context";
import {
  base64ToUint8Array,
  linearResample,
  pcm16leToFloat32,
  playFloat32Pcm,
} from "@/lib/pcm-audio";
import { synthesizeSeedHonk, renderSeedHonkReference } from "@/lib/seed-honk";
import { verifyHonkOtp } from "@/lib/honk-otp-verify";
import { recordAuthAttempt } from "@/lib/honk-metrics";

interface HonkAuthContextValue {
  session: HonkSession | null;
  isRegistered: boolean;
  isAuthenticated: boolean;
  tier: HonkTier | null;
  phoneNumber: string | null;

  otpState: HonkOtpState;
  startAuth: () => Promise<void>;
  cancelAuth: () => void;

  showRegistration: () => void;
  registerPhone: (phone: string) => void;
  cancelRegistration: () => void;

  authError: HonkError | null;
  authAttempts: number;

  clearSession: () => void;
  reRegister: () => void;
}

const HonkAuthContext = createContext<HonkAuthContextValue | null>(null);

export function useHonkAuth(): HonkAuthContextValue {
  const ctx = useContext(HonkAuthContext);
  if (!ctx) {
    throw new Error("useHonkAuth must be used within HonkAuthProvider");
  }
  return ctx;
}

const INITIAL_OTP_STATE: HonkOtpState = {
  step: "idle",
  seedHonkParams: null,
  phoneNumber: "",
  error: null,
  matchScore: null,
};

export default function HonkAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { publicKey } = useWallet();
  const pubkey = publicKey?.toBase58() ?? null;

  const [session, setSession] = useState<HonkSession | null>(null);
  const [otpState, setOtpState] = useState<HonkOtpState>(INITIAL_OTP_STATE);
  const [authError, setAuthError] = useState<HonkError | null>(null);
  const [authAttempts, setAuthAttempts] = useState(0);
  const authStartTimeRef = useRef<number>(0);

  const registration = pubkey ? loadRegistration(pubkey) : null;
  const isRegistered = registration !== null;
  const phoneNumber = registration?.phoneNumber ?? null;
  const isAuthenticated = session !== null && session.pubkey === pubkey;
  const tier = session?.tier ?? null;

  useEffect(() => {
    if (!pubkey) {
      setSession(null);
      setAuthError(null);
      setAuthAttempts(0);
      setOtpState(INITIAL_OTP_STATE);
    }
  }, [pubkey]);

  const showRegistration = useCallback(() => {
    setOtpState((prev) => ({ ...prev, step: "phone-entry", error: null }));
  }, []);

  const registerPhone = useCallback(
    (phone: string) => {
      if (!pubkey) return;
      saveRegistration(pubkey, phone);
      setOtpState((prev) => ({
        ...prev,
        step: "idle",
        phoneNumber: phone,
        error: null,
      }));
    },
    [pubkey]
  );

  const cancelRegistration = useCallback(() => {
    setOtpState(INITIAL_OTP_STATE);
  }, []);

  const startAuth = useCallback(async () => {
    if (!pubkey) return;

    authStartTimeRef.current = Date.now();

    try {
      setOtpState((prev) => ({
        ...prev,
        step: "calling",
        error: null,
        matchScore: null,
      }));
      setAuthError(null);

      await sleep(1500);

      const res = await fetch(
        `/api/honk-auth/challenge?pubkey=${encodeURIComponent(pubkey)}`
      );
      if (!res.ok) throw new Error("Failed to fetch challenge");
      const challenge = (await res.json()) as HonkChallengeResponse;
      const { seedHonk, seedAudioPcmBase64, seedAudioSampleRate } = challenge;

      setOtpState((prev) => ({
        ...prev,
        step: "playing-seed",
        seedHonkParams: seedHonk,
      }));

      const ctx = getAudioContext();
      let referenceSignal: Float32Array;

      if (seedAudioPcmBase64 && seedAudioSampleRate) {
        const pcmBytes = base64ToUint8Array(seedAudioPcmBase64);
        let floats = pcm16leToFloat32(pcmBytes);
        if (ctx.sampleRate !== seedAudioSampleRate) {
          floats = linearResample(
            floats,
            seedAudioSampleRate,
            ctx.sampleRate
          );
        }
        referenceSignal = floats;
        await playFloat32Pcm(ctx, referenceSignal, ctx.sampleRate);
      } else {
        const [ref] = await Promise.all([
          renderSeedHonkReference(seedHonk, ctx.sampleRate),
          synthesizeSeedHonk(ctx, seedHonk),
        ]);
        referenceSignal = ref;
      }

      await sleep(500);

      setOtpState((prev) => ({ ...prev, step: "listening" }));

      const capture = await captureHonk();

      setOtpState((prev) => ({ ...prev, step: "verifying" }));
      await sleep(800);

      const result = verifyHonkOtp(
        capture.rawSignal,
        referenceSignal,
        seedHonk,
        ctx.sampleRate
      );

      const durationMs = Date.now() - authStartTimeRef.current;
      setAuthAttempts((prev) => prev + 1);

      recordAuthAttempt({
        timestamp: Date.now(),
        durationMs,
        success: result.matched,
        matchScore: result.matchScore,
        tier: result.tier,
        errorCode: result.errorCode,
        flaggedAsReplay: false,
        flaggedAsImpersonation:
          result.antiImpersonation.isHumanMouth ||
          result.antiImpersonation.isMallard,
      });

      if (result.matched && result.tier !== "locked") {
        setSession({
          pubkey,
          tier: result.tier,
          authenticatedAt: Date.now(),
          roundId: "",
          seedHonkId: seedHonk.id,
        });
        setOtpState((prev) => ({
          ...prev,
          step: "success",
          matchScore: result.matchScore,
        }));
        setAuthError(null);
        setAuthAttempts(0);

        fetch("/api/honk-auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pubkey,
            seedHonkId: seedHonk.id,
            matchScore: result.matchScore,
            frequencyMatch: result.frequencyMatch,
            amplitudeMatch: result.amplitudeMatch,
            aggressionMatch: result.aggressionMatch,
            tier: result.tier,
            antiImpersonation: result.antiImpersonation,
          }),
        }).catch(() => {
          /* audit log best-effort */
        });
      } else {
        const code = result.errorCode ?? "HNK-001";
        const error: HonkError = { code, ...HONK_ERRORS[code] };
        setAuthError(error);
        setOtpState((prev) => ({
          ...prev,
          step: "error",
          error,
          matchScore: result.matchScore,
        }));
      }
    } catch (err) {
      const analysis = err as { errorCode?: HonkErrorCode };
      const code: HonkErrorCode = analysis.errorCode ?? "HNK-010";

      const error: HonkError = { code, ...HONK_ERRORS[code] };
      setAuthError(error);
      setOtpState((prev) => ({ ...prev, step: "error", error }));
    }
  }, [pubkey]);

  const cancelAuth = useCallback(() => {
    setOtpState(INITIAL_OTP_STATE);
    setAuthError(null);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setAuthError(null);
    setAuthAttempts(0);
    setOtpState(INITIAL_OTP_STATE);
  }, []);

  const reRegister = useCallback(() => {
    if (pubkey) {
      deleteRegistration(pubkey);
    }
    setSession(null);
    setAuthError(null);
    setAuthAttempts(0);
    setOtpState({ ...INITIAL_OTP_STATE, step: "phone-entry" });
  }, [pubkey]);

  return (
    <HonkAuthContext.Provider
      value={{
        session,
        isRegistered,
        isAuthenticated,
        tier,
        phoneNumber,
        otpState,
        startAuth,
        cancelAuth,
        showRegistration,
        registerPhone,
        cancelRegistration,
        authError,
        authAttempts,
        clearSession,
        reRegister,
      }}
    >
      {children}
    </HonkAuthContext.Provider>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
