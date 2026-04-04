"use client";

import { useState, useCallback } from "react";

export function useBetting() {
  const [userBets, setUserBets] = useState<Record<string, number>>({}); // roundId -> option
  const [userWagers, setUserWagers] = useState<Record<string, number>>({}); // roundId -> amount

  const recordUserBet = useCallback((roundId: string, option: number, amount: number) => {
    setUserBets((prev) => ({ ...prev, [roundId]: option }));
    setUserWagers((prev) => ({ ...prev, [roundId]: amount }));
  }, []);

  const getUserBet = useCallback(
    (roundId: string): number | null => {
      return userBets[roundId] ?? null;
    },
    [userBets]
  );

  const getUserWager = useCallback(
    (roundId: string): number => {
      return userWagers[roundId] ?? 0;
    },
    [userWagers]
  );

  return { recordUserBet, getUserBet, getUserWager };
}
