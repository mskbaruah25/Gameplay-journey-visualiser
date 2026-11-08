import { memo, useMemo } from "react";
import type { GameEvent, Participant, PlaybackFrame } from "@/lib/gameplay-types";
import { EventSymbol } from "./event-symbol";
import { InspectableMarker } from "./inspectable-marker";
import { isPositionEvent } from "../event-details";
import { buildJourneyIndex, TRAIL_CHUNK_SIZE, trailGeometry, visibleSampleCount,
  type IndexedJourney, type TrailGeometry } from "../journey-index";

interface Props {
  frames: PlaybackFrame[];
  index: number;
  participants: Participant[];
  hidden: string[];
  selectedEventId?: string;
  onInspect: (event: GameEvent) => void;
}

const RecordedTrail = memo(function RecordedTrail({ geometry, color, bot }: {
  geometry: TrailGeometry; color: string; bot: boolean;
}) {
  return <>
    <path d={geometry.trail} fill="none" stroke={color} strokeWidth={2.5} opacity={0.7}
      strokeDasharray={bot ? "6 4" : undefined} />
    <path d={geometry.dots} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.45} />
  </>;
});

function ParticipantJourney({ journey, count, participant, selectedEventId, onInspect }: {
  journey: IndexedJourney; count: number; participant: Participant;
  selectedEventId?: string; onInspect: (event: GameEvent) => void;
}) {
  const completeChunks = Math.floor(count / TRAIL_CHUNK_SIZE);
  const partial = useMemo(() => count % TRAIL_CHUNK_SIZE
    ? trailGeometry(journey.samples, completeChunks * TRAIL_CHUNK_SIZE, count) : null,
  [journey, completeChunks, count]);
  const last = journey.samples[count - 1]?.event;
  if (!last) return null;
  const bot = participant.actorType === "bot";
  const color = bot ? "#80bfd1" : "#c4e88a";
  return <g data-participant-id={participant.id} data-position-samples={count}>
    {journey.chunks.slice(0, completeChunks).map((geometry, index) =>
      <RecordedTrail key={index} geometry={geometry} color={color} bot={bot} />)}
    {partial && <RecordedTrail geometry={partial} color={color} bot={bot} />}
    <InspectableMarker event={last} label={`${participant.actorType} ${participant.userId} position`}
      selected={selectedEventId === last.id} onInspect={onInspect}>
      {bot ? <rect x={-6} y={-6} width={12} height={12} fill={color} stroke="var(--map-bg)" transform="rotate(45)" />
        : <circle r={7} fill={color} stroke="var(--map-bg)" strokeWidth={2} />}
    </InspectableMarker>
  </g>;
}

export function JourneyOverlay({ frames, index, participants, hidden, selectedEventId, onInspect }: Props) {
  const journeys = useMemo(() => buildJourneyIndex(frames), [frames]);
  const participantsById = useMemo(() => new Map(participants.map((participant) => [participant.id, participant])), [participants]);
  const hiddenIds = new Set(hidden);
  const currentEvents = (frames[index]?.events ?? []).filter((event) =>
    !isPositionEvent(event.eventType) && !hiddenIds.has(event.participantId));

  return <svg className="telemetry-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="group" aria-label="Recorded human and bot journeys and events">
    {participants.filter((participant) => !hiddenIds.has(participant.id)).map((participant) => {
      const journey = journeys.get(participant.id);
      return journey ? <ParticipantJourney key={participant.id} journey={journey}
        count={visibleSampleCount(journey.samples, index)} participant={participant}
        selectedEventId={selectedEventId} onInspect={onInspect} /> : null;
    })}
    {currentEvents.map((event) => <InspectableMarker key={event.id} event={event}
      label={`${event.eventType} · ${participantsById.get(event.participantId)?.userId ?? event.participantId}`}
      selected={selectedEventId === event.id} onInspect={onInspect}><EventSymbol eventType={event.eventType} /></InspectableMarker>)}
  </svg>;
}
