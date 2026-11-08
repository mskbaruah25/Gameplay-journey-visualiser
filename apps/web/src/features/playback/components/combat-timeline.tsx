import { useMemo } from "react";
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
  { id: "kills", label: "Kill labels" },
  { id: "deaths", label: "Death labels" },
  { id: "storm", label: "Storm deaths" },
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
  if (!moments.length) return null;

  return <label className="combat-jump">Jump to combat
      <select aria-label="Jump to combat timestamp" value={moments.some((moment) => moment.frameIndex === index) ? String(index) : ""}
        onChange={(event) => onSeek(Number(event.target.value))}>
        <option value="" disabled>Choose a recorded timestamp</option>
        {moments.map((moment) => <option key={moment.frameIndex} value={moment.frameIndex}>
          {formatElapsed(moment.elapsedSeconds)} · {describeMoment(moment)}
        </option>)}
      </select>
    </label>;
}
