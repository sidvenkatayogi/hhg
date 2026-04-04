"use client";

import { useEffect } from "react";

/**
 * While active, mutes every video/audio in the document so Honk-OTP capture
 * and seed playback are not masked by site media (e.g. arena clips).
 */
export function useHonkVerificationSiteMute(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    type M = HTMLMediaElement;
    const snapshots = new Map<M, { volume: number; muted: boolean }>();

    const captureAndMute = () => {
      document.querySelectorAll<M>("video, audio").forEach((el) => {
        if (!snapshots.has(el)) {
          snapshots.set(el, { volume: el.volume, muted: el.muted });
        }
        el.volume = 0;
        el.muted = true;
      });
    };

    captureAndMute();
    const observer = new MutationObserver(captureAndMute);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      snapshots.forEach((snap, el) => {
        if (el.isConnected) {
          el.volume = snap.volume;
          el.muted = snap.muted;
        }
      });
    };
  }, [active]);
}
