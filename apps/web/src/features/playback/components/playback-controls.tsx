"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import type { PlaybackFrame } from "@/lib/gameplay-types";
import { PLAYBACK_SPEEDS, formatElapsed, useMatchPlayback } from "../hooks/use-match-playback";

interface Props {
  frames: PlaybackFrame[];
  playback: ReturnType<typeof useMatchPlayback>;
}

export function PlaybackControls({ frames, playback }: Props) {
  const { index, maximum, playing, speed, setSpeed, seek, toggle, restart } = playback;
  const current = frames[index]?.elapsedSeconds ?? 0;
  const last = frames[maximum]?.elapsedSeconds ?? 0;
  const ticks = Array.from(new Set([0, Math.round(maximum / 4), Math.round(maximum / 2), Math.round(maximum * 3 / 4), maximum]));

  return <section className="playback-controls" aria-label="Playback controls">
    <div className="timeline-heading">
      <label htmlFor="playback-timeline">Recorded timestamps</label>
      <span className="timeline-preview-badge">{frames.length ? `Step ${index + 1} of ${frames.length}` : "No recorded steps"}</span>
    </div>
    <div className="timeline-track">
      <input id="playback-timeline" className="playback-scrubber" type="range" min={0} max={maximum}
        step={1} value={index} disabled={frames.length < 2}
        aria-valuetext={`Recorded step ${index + 1}, ${formatElapsed(current)} from recording start`}
        style={{ "--timeline-progress": `${maximum ? index / maximum * 100 : 0}%` } as React.CSSProperties}
        onChange={(event) => seek(Number(event.target.value))} />
      <div className="timeline-ticks" aria-hidden="true">
        {ticks.map((step) => <span key={step}>{formatElapsed(frames[step]?.elapsedSeconds ?? 0)}</span>)}
      </div>
    </div>
    <div className="transport-row">
      <div className="transport-actions">
        <button className="play-button" type="button" disabled={frames.length < 2}
          aria-label={playing ? "Pause playback" : "Play playback"} onClick={toggle}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button className="restart-playback" type="button" aria-label="Restart playback" onClick={restart}><RotateCcw size={16} /></button>
        <div className="playback-time"><span>{formatElapsed(current)}</span><span>/</span><span>{formatElapsed(last)}</span></div>
      </div>
      <fieldset className="playback-speed">
        <legend>Playback speed</legend>
        <div className="speed-options">
          {PLAYBACK_SPEEDS.map((value) => <button key={value} type="button" aria-pressed={value === speed}
            aria-label={`Playback speed ${value}x`} className={value === speed ? "selected" : ""}
            onClick={() => setSpeed(value)}>{value}x</button>)}
        </div>
      </fieldset>
    </div>
  </section>;
}
