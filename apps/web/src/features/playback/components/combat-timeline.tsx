import { useMemo } from "react";
import { Crosshair, Skull, Wind } from "lucide-react";
import type { PlaybackFrame } from "@/lib/gameplay-types";
import { combatCategory, type CombatCategory } from "../event-details";
import { formatElapsed } from "../hooks/use-match-playback";

interface Props {
  frames: PlaybackFrame[];
  index: number;
  onSeek: (index: number) => void;
}

interface CombatMoment {
  frameIndex: number;
  elapsedSeconds: number;
  counts: Record<CombatCategory, number>;
}

const CATEGORIES = [
  { id: "kills", label: "Kill labels", Icon: Crosshair },
  { id: "deaths", label: "Death labels", Icon: Skull },
  { id: "storm", label: "Storm deaths", Icon: Wind },
] as const;

function describeMoment(moment: CombatMoment) {
  return CATEGORIES.filter(({ id }) => moment.counts[id] > 0)
    .map(({ id, label }) => countLabel(moment.counts[id], label)).join(", ");
}

function countLabel(count: number, label: string) {
  return `${count} ${count === 1 ? label.toLowerCase().slice(0, -1) : label.toLowerCase()}`;
}

export function CombatTimeline({ frames, index, onSeek }: Props) {
  const moments = useMemo(() => {
    const result: CombatMoment[] = [];
    frames.forEach((frame, frameIndex) => {
      const counts = { kills: 0, deaths: 0, storm: 0 };
      for (const event of frame.events) {
        const category = combatCategory(event.eventType);
        if (category) counts[category]++;
      }
      if (counts.kills + counts.deaths + counts.storm > 0) {
        result.push({ frameIndex, elapsedSeconds: frame.elapsedSeconds, counts });
      }
    });
    return result;
  }, [frames]);
  const maximum = Math.max(1, frames.length - 1);

  if (!moments.length) return <p className="combat-empty">No kill, death, or storm-death labels in this recording.</p>;

  return <div className="combat-timeline" aria-label="Combat timeline">
    {CATEGORIES.map(({ id, label, Icon }) => <div className={`combat-lane combat-${id}`} key={id}>
      <span className="combat-lane-label"><Icon size={13} aria-hidden="true" />{label}</span>
      <div className="combat-lane-track" role="group" aria-label={label}>
        {moments.filter((moment) => moment.counts[id] > 0).map((moment) => {
          const description = `${formatElapsed(moment.elapsedSeconds)} · ${countLabel(moment.counts[id], label)}`;
          return <button type="button" className="combat-tick" key={moment.frameIndex}
            style={{ left: `${moment.frameIndex / maximum * 100}%` }}
            title={description} aria-label={`Jump to ${description}`} aria-pressed={index === moment.frameIndex}
            onClick={() => onSeek(moment.frameIndex)}>
            <span aria-hidden="true">{moment.counts[id] > 1 ? moment.counts[id] : ""}</span>
          </button>;
        })}
      </div>
    </div>)}
    {/* The exact list keeps every timestamp reachable when nearby ticks overlap. */}
    <label className="combat-jump">Jump to combat
      <select aria-label="Jump to combat timestamp" value={moments.some((moment) => moment.frameIndex === index) ? String(index) : ""}
        onChange={(event) => onSeek(Number(event.target.value))}>
        <option value="" disabled>Choose a recorded timestamp</option>
        {moments.map((moment) => <option key={moment.frameIndex} value={moment.frameIndex}>
          {formatElapsed(moment.elapsedSeconds)} · {describeMoment(moment)}
        </option>)}
      </select>
    </label>
  </div>;
}
