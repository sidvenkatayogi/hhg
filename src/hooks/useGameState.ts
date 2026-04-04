"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchGameState, type ApiGameState } from "@/lib/api";

export function useGameState() {
  const [state, setState] = useState<ApiGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await fetchGameState();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  return { state, error, refresh: poll };
}
