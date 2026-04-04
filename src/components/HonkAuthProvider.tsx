"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type {
  HonkTier,
  HonkSession,
  HonkEnrollmentState,
  HonkError,
  HonkErrorCode,
} from "@/lib/honk-types";
import { HONK_ERRORS } from "@/lib/honk-types";
import {
  captureHonk,
  enrollHonk,
  authenticateHonk,
  saveHonkprint,
  loadHonkprint,
  deleteHonkprint,
  type CaptureResult,
} from "@/lib/honk-capture";

interface HonkAuthContextValue {
  // Session state
  session: HonkSession | null;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  tier: HonkTier | null;

  // Enrollment
  enrollmentState: HonkEnrollmentState;
  startEnrollment: () => void;
  captureEnrollmentHonk: () => Promise<void>;
  cancelEnrollment: () => void;

  // Authentication
  authenticate: () => Promise<void>;
  authError: HonkError | null;
  authAttempts: number;
  isCapturing: boolean;

  // Management
  clearSession: () => void;
  reEnroll: () => void;
}

const HonkAuthContext = createContext<HonkAuthContextValue | null>(null);

export function useHonkAuth(): HonkAuthContextValue {
  const ctx = useContext(HonkAuthContext);
  if (!ctx) {
    throw new Error("useHonkAuth must be used within HonkAuthProvider");
  }
  return ctx;
}

export default function HonkAuthProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const pubkey = publicKey?.toBase58() ?? null;

  const [session, setSession] = useState<HonkSession | null>(null);
  const [enrollmentState, setEnrollmentState] = useState<HonkEnrollmentState>({
    step: 0,
    captures: [],
    status: "idle",
    error: null,
  });
  const [enrollmentCaptures, setEnrollmentCaptures] = useState<CaptureResult[]>([]);
  const [authError, setAuthError] = useState<HonkError | null>(null);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Check if enrolled on wallet change
  const isEnrolled = pubkey ? loadHonkprint(pubkey) !== null : false;
  const isAuthenticated = session !== null && session.pubkey === pubkey;
  const tier = session?.tier ?? null;

  // Clear session on wallet disconnect
  useEffect(() => {
    if (!pubkey) {
      setSession(null);
      setAuthError(null);
      setAuthAttempts(0);
    }
  }, [pubkey]);

  const startEnrollment = useCallback(() => {
    setEnrollmentState({
      step: 1,
      captures: [],
      status: "idle",
      error: null,
    });
    setEnrollmentCaptures([]);
  }, []);

  const captureEnrollmentHonk = useCallback(async () => {
    if (!pubkey) return;
    setIsCapturing(true);
    setEnrollmentState((prev) => ({ ...prev, status: "listening", error: null }));

    try {
      const result = await captureHonk();

      if (!result.analysis.isValid) {
        const code = result.analysis.errorCode!;
        setEnrollmentState((prev) => ({
          ...prev,
          status: "error",
          error: { code, ...HONK_ERRORS[code] },
        }));
        return;
      }

      const newCaptures = [...enrollmentCaptures, result];
      setEnrollmentCaptures(newCaptures);

      const newStep = (enrollmentState.step + 1) as 0 | 1 | 2 | 3;

      if (newCaptures.length === 3) {
        // All 3 honks captured — generate honkprint
        setEnrollmentState((prev) => ({
          ...prev,
          step: 3,
          captures: [...prev.captures, result.analysis],
          status: "processing",
        }));

        const honkprint = await enrollHonk(newCaptures);
        saveHonkprint(pubkey, honkprint);

        setEnrollmentState({
          step: 0,
          captures: [],
          status: "complete",
          error: null,
        });
      } else {
        setEnrollmentState((prev) => ({
          ...prev,
          step: Math.min(newStep, 3) as 0 | 1 | 2 | 3,
          captures: [...prev.captures, result.analysis],
          status: "idle",
        }));
      }
    } catch (err) {
      // Handle HNK-004 (timeout/silence) thrown as rejected promise
      const analysis = err as { errorCode?: HonkErrorCode };
      if (analysis.errorCode) {
        const code = analysis.errorCode;
        setEnrollmentState((prev) => ({
          ...prev,
          status: "error",
          error: { code, ...HONK_ERRORS[code] },
        }));
      } else {
        setEnrollmentState((prev) => ({
          ...prev,
          status: "error",
          error: {
            code: "HNK-004",
            ...HONK_ERRORS["HNK-004"],
          },
        }));
      }
    } finally {
      setIsCapturing(false);
    }
  }, [pubkey, enrollmentCaptures, enrollmentState.step]);

  const cancelEnrollment = useCallback(() => {
    setEnrollmentState({ step: 0, captures: [], status: "idle", error: null });
    setEnrollmentCaptures([]);
  }, []);

  const authenticate = useCallback(async () => {
    if (!pubkey) return;

    const honkprint = loadHonkprint(pubkey);
    if (!honkprint) return;

    setIsCapturing(true);
    setAuthError(null);

    try {
      const result = await captureHonk();
      const authResult = authenticateHonk(result, honkprint);

      setAuthAttempts((prev) => prev + 1);

      if (authResult.matched && authResult.tier !== "locked") {
        setSession({
          pubkey,
          honkprint: honkprint.digest,
          tier: authResult.tier,
          authenticatedAt: Date.now(),
          roundId: "", // Will be updated by game state
        });
        setAuthError(null);
        setAuthAttempts(0);
      } else {
        const code = authResult.errorCode ?? "HNK-001";
        setAuthError({ code, ...HONK_ERRORS[code] });

        // After 5 failed attempts, suggest re-enrollment
        if (authAttempts >= 4) {
          setAuthError({
            code: "HNK-008",
            ...HONK_ERRORS["HNK-008"],
          });
        }
      }
    } catch {
      setAuthError({
        code: "HNK-004",
        ...HONK_ERRORS["HNK-004"],
      });
    } finally {
      setIsCapturing(false);
    }
  }, [pubkey, authAttempts]);

  const clearSession = useCallback(() => {
    setSession(null);
    setAuthError(null);
    setAuthAttempts(0);
  }, []);

  const reEnroll = useCallback(() => {
    if (pubkey) {
      deleteHonkprint(pubkey);
    }
    setSession(null);
    setAuthError(null);
    setAuthAttempts(0);
    startEnrollment();
  }, [pubkey, startEnrollment]);

  return (
    <HonkAuthContext.Provider
      value={{
        session,
        isEnrolled,
        isAuthenticated,
        tier,
        enrollmentState,
        startEnrollment,
        captureEnrollmentHonk,
        cancelEnrollment,
        authenticate,
        authError,
        authAttempts,
        isCapturing,
        clearSession,
        reEnroll,
      }}
    >
      {children}
    </HonkAuthContext.Provider>
  );
}
