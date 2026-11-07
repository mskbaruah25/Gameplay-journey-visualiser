import { Bot, Crosshair, Package, Skull, Users, Wind } from "lucide-react";
import type { Participant } from "@/lib/gameplay-types";

interface Props {
  participants: Participant[];
  hidden: string[];
  onToggle: (id: string) => void;
}

export function PlaybackSidebar({ participants, hidden, onToggle }: Props) {
  return <div className="playback-sidebar">
    <section className="participants-section" aria-labelledby="participants-heading">
      <div className="section-heading"><h2 id="participants-heading">Recorded participants</h2><span>{participants.length}</span></div>
      <div className="participant-legend">
        <span><i className="human-marker" /><Users size={12} />Humans</span>
        <span><i className="bot-marker" /><Bot size={12} />Bots</span>
      </div>
      <div className="participant-list">
        {participants.map((participant) => <label key={participant.id} title={participant.userId}>
          <input type="checkbox" checked={!hidden.includes(participant.id)} onChange={() => onToggle(participant.id)} />
          <i className={participant.actorType === "human" ? "human-marker" : "bot-marker"} />
          <span>{participant.actorType === "human" ? `Human ${participant.userId.slice(0, 8)}` : `Bot ${participant.userId}`}</span>
          <small>{participant.positionSamples}</small>
        </label>)}
        {!participants.length && <p className="section-description">No recorded participants for this selection.</p>}
      </div>
    </section>
    <section className="event-legend-section" aria-labelledby="event-legend-heading">
      <div className="section-heading"><h2 id="event-legend-heading">Event markers</h2><span>04</span></div>
      <div className="event-legend">
        <span><Crosshair size={15} className="kill-marker" />Kill</span>
        <span><Skull size={15} className="death-marker" />Death</span>
        <span><Package size={15} className="loot-marker" />Loot pickup</span>
        <span><Wind size={15} className="storm-marker" />Storm death</span>
      </div>
      <p className="section-description">Markers show events at the current timestamp. Trails show recorded position samples.</p>
    </section>
  </div>;
}
