"use client";

import { useEffect, useState } from "react";
import type { PlaybackFrame } from "@/lib/gameplay-types";

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function useMatchPlayback(frames: PlaybackFrame[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const maximum = Math.max(0, frames.length - 1);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (index >= maximum) {
      setPlaying(false);
      return;
    }
    // Advance one recorded timestamp per tick, regardless of elapsed-time gaps.
    const timer = window.setTimeout(() => setIndex((current) => current + 1), 500 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, maximum, speed, frames.length]);

  function seek(value: number) {
    setIndex(Math.max(0, Math.min(maximum, value)));
    setPlaying(false);
  }
  function toggle() {
    if (frames.length < 2) return;
    if (index >= maximum) setIndex(0);
    setPlaying((current) => !current);
  }

  return { index: Math.min(index, maximum), maximum, playing, speed, setSpeed, seek, toggle, restart: () => seek(0) };
}

export function formatElapsed(seconds: number) {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
