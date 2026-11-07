import type { GameEvent, Participant, PlaybackFrame } from "@/lib/gameplay-types";

interface Props {
  frames: PlaybackFrame[];
  index: number;
  participants: Participant[];
  hidden: string[];
}

function trailPath(positions: GameEvent[]) {
  let previous: GameEvent | undefined;
  return positions.map((position) => {
    // Do not imply an observed route across a long recording gap.
    const command = !previous || position.timestamp - previous.timestamp > 15 ? "M" : "L";
    previous = position;
    return `${command}${position.minimapX * 1000},${position.minimapY * 1000}`;
  }).join(" ");
}

function EventMarker({ event }: { event: GameEvent }) {
  const location = `translate(${event.minimapX * 1000},${event.minimapY * 1000})`;
  const title = `${event.eventType}${event.repeatedCombat ? " · repeated combat record" : ""}`;
  let marker;
  if (event.eventType === "Loot") {
    marker = <rect x={-6} y={-6} width={12} height={12} fill="#7dc8dd" stroke="#10160f" strokeWidth={2} />;
  } else if (event.eventType === "KilledByStorm") {
    marker = <path d="M0,-10 L9,7 L-9,7 Z" fill="#b8a1ed" stroke="#10160f" strokeWidth={2} />;
  } else if (["Kill", "BotKill"].includes(event.eventType)) {
    marker = <g stroke="#f2a56d" strokeWidth={3} fill="none"><circle r={8} /><path d="M-13,0 H13 M0,-13 V13" /></g>;
  } else {
    marker = <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#ff8993" strokeWidth={4} />;
  }
  return <g transform={location}><title>{title}</title>{marker}</g>;
}

export function JourneyOverlay({ frames, index, participants, hidden }: Props) {
  const positions = new Map<string, GameEvent[]>();
  for (const frame of frames.slice(0, index + 1)) {
    for (const event of frame.events) {
      if (["Position", "BotPosition"].includes(event.eventType) && !hidden.includes(event.participantId)) {
        const journey = positions.get(event.participantId) ?? [];
        journey.push(event);
        positions.set(event.participantId, journey);
      }
    }
  }
  const currentEvents = (frames[index]?.events ?? []).filter((event) =>
    !["Position", "BotPosition"].includes(event.eventType) && !hidden.includes(event.participantId));

  return <svg className="telemetry-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="Recorded human and bot journeys and events">
    {participants.filter((participant) => !hidden.includes(participant.id)).map((participant) => {
      const samples = positions.get(participant.id) ?? [];
      const last = samples[samples.length - 1];
      if (!last) return null;
      const color = participant.actorType === "human" ? "#c4e88a" : "#80bfd1";
      return <g key={participant.id}>
        <path d={trailPath(samples)} fill="none" stroke={color} strokeWidth={2.5} opacity={0.7}
          strokeDasharray={participant.actorType === "bot" ? "6 4" : undefined} />
        {samples.map((sample) => <circle key={sample.id} cx={sample.minimapX * 1000} cy={sample.minimapY * 1000} r={2} fill={color} opacity={0.45} />)}
        <g transform={`translate(${last.minimapX * 1000},${last.minimapY * 1000})`}>
          <title>{participant.userId}{last.postDeathPosition ? " · supplied post-death position" : ""}</title>
          {participant.actorType === "human" ? <circle r={7} fill={color} stroke="#10160f" strokeWidth={2} />
            : <rect x={-6} y={-6} width={12} height={12} transform="rotate(45)" fill={color} stroke="#10160f" strokeWidth={2} />}
        </g>
      </g>;
    })}
    {currentEvents.map((event) => <EventMarker key={event.id} event={event} />)}
  </svg>;
}
