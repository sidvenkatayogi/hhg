"use client";

import { useEffect } from "react";

/**
 * While active, mutes every video/audio in the document so honk verification
 * capture and seed playback are not masked by site media (e.g. arena clips).
 * Uses both a MutationObserver (for new elements) and a polling interval
 * (to catch programmatic unmutes via JS properties).
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

    // Catch newly added media elements
    const observer = new MutationObserver(captureAndMute);
    observer.observe(document.body, { childList: true, subtree: true });

    // Catch programmatic unmutes (el.muted = false) which don't trigger MutationObserver
    const interval = setInterval(captureAndMute, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      snapshots.forEach((snap, el) => {
        if (el.isConnected) {
          el.volume = snap.volume;
          el.muted = snap.muted;
        }
      });
    };
  }, [active]);
}
