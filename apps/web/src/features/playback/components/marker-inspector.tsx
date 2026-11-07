import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { GameEvent, Participant } from "@/lib/gameplay-types";
import { formatRecordedTime } from "../event-details";
import { formatElapsed } from "../hooks/use-match-playback";

interface Props {
  event: GameEvent;
  frameEvents: GameEvent[];
  participants: Participant[];
  onSelect: (event: GameEvent) => void;
  onClose: () => void;
}

const coordinateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 });

export function MarkerInspector({ event, frameEvents, participants, onSelect, onClose }: Props) {
  const panel = useRef<HTMLElement>(null);
  const actor = participants.find((participant) => participant.id === event.participantId);
  // Keep an older last-known position selectable alongside the current frame.
  const records = frameEvents.some((record) => record.id === event.id) ? frameEvents : [event, ...frameEvents];

  useEffect(() => { panel.current?.focus(); }, []);

  return <section className="marker-inspector" ref={panel} tabIndex={-1} aria-label="Marker inspector"
    onKeyDown={(key) => { if (key.key === "Escape") { key.stopPropagation(); onClose(); } }}>
    <div className="inspector-heading"><h2>Marker inspector</h2>
      <button type="button" aria-label="Close marker inspector" onClick={onClose}><X size={17} /></button>
    </div>
    {records.length > 1 && <label className="inspector-record-selector">Recorded event
      <select value={event.id} onChange={(change) => {
        const record = records.find((item) => item.id === change.target.value);
        if (record) onSelect(record);
      }}>
        {records.map((record) => {
          const participant = participants.find((item) => item.id === record.participantId);
          return <option key={record.id} value={record.id}>
            {record.eventType} · {participant?.actorType ?? "actor"} {participant?.userId.slice(0, 8)} · {record.id.slice(0, 8)}
          </option>;
        })}
      </select>
    </label>}
    <dl className="inspector-details">
      <div><dt>Event type</dt><dd className="mono">{event.eventType}</dd></div>
      <div><dt>Recorded actor</dt><dd>{actor?.actorType === "bot" ? "Bot" : actor?.actorType === "human" ? "Human" : "Unknown"}
        <code>{actor?.userId ?? event.participantId}</code></dd></div>
      <div><dt>Time from recording start</dt><dd className="mono">{formatElapsed(event.elapsedSeconds)}</dd></div>
      <div><dt>Timestamp (UTC)</dt><dd className="mono"><time dateTime={new Date(event.timestamp * 1000).toISOString()}>{formatRecordedTime(event.timestamp)}</time></dd></div>
      <div><dt>World coordinates</dt><dd className="inspector-coordinates">
        {(["x", "y", "z"] as const).map((axis) => <span key={axis} title={String(event[axis])}>
          <strong>{axis.toUpperCase()}</strong> {coordinateFormat.format(event[axis])}
        </span>)}
      </dd></div>
    </dl>
    <p className="inspector-note">Coordinates rounded to 3 decimals. Y is elevation; the map uses X and Z.</p>
    {event.repeatedCombat && <p className="inspector-note">Repeated combat record retained in the supplied data.</p>}
    {event.postDeathPosition && <p className="inspector-note">Supplied position after a death label; plotted unchanged.</p>}
    <p className="inspector-note">This identifies the recorded actor. No opposing participant is inferred.</p>
  </section>;
}
