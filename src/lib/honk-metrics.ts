// ── Honk Verification KPI Tracking ──
// Time-to-Honk (TTH) and False Honk Rate (FHR), stored in localStorage.

const METRICS_KEY = "honk_otp_metrics";
const MAX_ENTRIES = 50;

interface AuthAttemptRecord {
  timestamp: number;
  durationMs: number; // TTH: time from initiation to result
  success: boolean;
  matchScore: number;
  tier: string;
  errorCode: string | null;
  flaggedAsReplay: boolean;
  flaggedAsImpersonation: boolean;
}

interface HonkMetricsStore {
  attempts: AuthAttemptRecord[];
}

function loadStore(): HonkMetricsStore {
  if (typeof window === "undefined") return { attempts: [] };
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function saveStore(store: HonkMetricsStore): void {
  if (typeof window === "undefined") return;
  // Keep only the most recent entries
  store.attempts = store.attempts.slice(-MAX_ENTRIES);
  localStorage.setItem(METRICS_KEY, JSON.stringify(store));
}

export function recordAuthAttempt(record: AuthAttemptRecord): void {
  const store = loadStore();
  store.attempts.push(record);
  saveStore(store);
}

export interface HonkKPIs {
  tth_avg: number; // Average Time-to-Honk (ms) for successful attempts
  tth_min: number;
  tth_max: number;
  fhr: number; // False Honk Rate (%)
  totalAttempts: number;
  successRate: number; // %
  errorDistribution: Record<string, number>;
}

export function getHonkKPIs(): HonkKPIs {
  const store = loadStore();
  const attempts = store.attempts;

  if (attempts.length === 0) {
    return {
      tth_avg: 0,
      tth_min: 0,
      tth_max: 0,
      fhr: 0,
      totalAttempts: 0,
      successRate: 0,
      errorDistribution: {},
    };
  }

  // TTH — successful attempts only
  const successAttempts = attempts.filter((a) => a.success);
  const durations = successAttempts.map((a) => a.durationMs);

  const tth_avg =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  const tth_min = durations.length > 0 ? Math.min(...durations) : 0;
  const tth_max = durations.length > 0 ? Math.max(...durations) : 0;

  // FHR — replay + impersonation that still passed
  const falseHonks = attempts.filter(
    (a) => a.success && (a.flaggedAsReplay || a.flaggedAsImpersonation)
  );
  const fhr =
    attempts.length > 0 ? (falseHonks.length / attempts.length) * 100 : 0;

  // Error distribution
  const errorDistribution: Record<string, number> = {};
  for (const a of attempts) {
    if (a.errorCode) {
      errorDistribution[a.errorCode] =
        (errorDistribution[a.errorCode] || 0) + 1;
    }
  }

  return {
    tth_avg: Math.round(tth_avg),
    tth_min: Math.round(tth_min),
    tth_max: Math.round(tth_max),
    fhr: Math.round(fhr * 100) / 100,
    totalAttempts: attempts.length,
    successRate:
      Math.round((successAttempts.length / attempts.length) * 10000) / 100,
    errorDistribution,
  };
}
