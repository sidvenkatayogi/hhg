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
      const setupEl = setupRef.current;
      if (setupEl) {
        setupEl.currentTime = 0;
        setupEl.play().catch(() => {});
      }
    }
  }, [isRevealing]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/10 glow-orange">
      {/* Setup video - loops */}
      <video
        ref={setupRef}
        src={setupSrc}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          showReveal ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* Reveal video - plays once */}
      <video
        ref={revealRef}
        src={revealSrc}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          showReveal ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
