"use client";

import { useRef, useEffect, useState } from "react";

interface VideoPlayerProps {
  setupSrc: string;
  revealSrc: string;
  isRevealing: boolean;
}

export default function VideoPlayer({ setupSrc, revealSrc, isRevealing }: VideoPlayerProps) {
  const setupRef = useRef<HTMLVideoElement>(null);
  const revealRef = useRef<HTMLVideoElement>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [setupEnded, setSetupEnded] = useState(false);

  // Reset state when the setup video source changes (new round)
  useEffect(() => {
    setSetupEnded(false);
    setShowReveal(false);
    const setupEl = setupRef.current;
    if (setupEl) {
      setupEl.currentTime = 0;
      setupEl.play().catch(() => {});
    }
  }, [setupSrc]);

  useEffect(() => {
    if (isRevealing) {
      setShowReveal(true);
      const revealEl = revealRef.current;
      if (revealEl) {
        revealEl.currentTime = 0;
        revealEl.play().catch(() => {});
      }
    } else {
      setShowReveal(false);
    }
  }, [isRevealing]);

  const handleReplay = () => {
    const setupEl = setupRef.current;
    if (setupEl) {
      setupEl.currentTime = 0;
      setupEl.play().catch(() => {});
      setSetupEnded(false);
    }
  };

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/10 glow-orange">
      {/* Setup video - plays once, user can replay */}
      <video
        ref={setupRef}
        src={setupSrc}
        autoPlay
        muted
        playsInline
        onEnded={() => setSetupEnded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          showReveal ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* Reveal video - plays once when triggered */}
      <video
        ref={revealRef}
        src={revealSrc}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          showReveal ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Replay button - shows after setup video ends, during betting */}
      {setupEnded && !showReveal && (
        <button
          onClick={handleReplay}
          className="absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity hover:bg-black/40 cursor-pointer"
        >
          <div className="flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-16 h-16 text-primary drop-shadow-lg"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-white font-bold text-sm">REPLAY</span>
          </div>
        </button>
      )}
    </div>
  );
}
