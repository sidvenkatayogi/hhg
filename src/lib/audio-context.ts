// ── Shared AudioContext singleton ──
// Prevents collision between VideoPlayer audio and Honk-in capture.

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in the browser");
  }
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext({ sampleRate: 44100 });
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function closeAudioContext(): void {
  if (ctx && ctx.state !== "closed") {
    ctx.close();
    ctx = null;
  }
}
