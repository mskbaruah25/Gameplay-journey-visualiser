import type { ReactNode } from "react";
import type { GameEvent } from "@/lib/gameplay-types";
import { formatElapsed } from "../hooks/use-match-playback";

interface Props {
  event: GameEvent;
  label: string;
  selected: boolean;
  onInspect: (event: GameEvent) => void;
  children: ReactNode;
}

export function InspectableMarker({ event, label, selected, onInspect, children }: Props) {
  return <g className="inspectable-marker" role="button" tabIndex={0}
    aria-label={`Inspect ${label} at ${formatElapsed(event.elapsedSeconds)}`} aria-pressed={selected}
    data-event-id={event.id} transform={`translate(${event.minimapX * 1000},${event.minimapY * 1000})`}
    onPointerDown={(pointer) => pointer.stopPropagation()}
    onClick={(click) => { click.stopPropagation(); click.currentTarget.focus(); onInspect(event); }}
    onKeyDown={(key) => {
      if (key.key === "Enter" || key.key === " ") {
        key.preventDefault();
        key.stopPropagation();
        onInspect(event);
      }
    }}>
    <title>{label} · {formatElapsed(event.elapsedSeconds)} · Click to inspect</title>
    <circle className="marker-hit-area" r={18} />
    {selected && <circle className="marker-selection-ring" r={19} />}
    {children}
  </g>;
}
