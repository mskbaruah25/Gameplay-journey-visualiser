import { Activity, Bot, Crosshair, Package, Skull, Users, Wind, List } from "lucide-react";
import type { MatchOverview, Participant } from "@/lib/gameplay-types";

function leader(participants: Participant[], metric: "killEventCount" | "lootItems") {
  const maximum = Math.max(0, ...participants.map((participant) => participant[metric]));
  if (!maximum) return "None recorded";
  return participants.filter((participant) => participant[metric] === maximum)
    .map((participant) => `${participant.actorType === "bot" ? "Bot" : "Human"} ${participant.userId.slice(0, 8)}`)
    .join(", ") + ` (${maximum})`;
}

export function MatchStatistics({ overview }: { overview?: MatchOverview }) {
  const stats = overview?.stats;
  const entries = [
    ["Recorded humans", stats?.humans, Users], ["Recorded bots", stats?.bots, Bot],
    ["Position samples", stats?.positionSamples, Activity], ["Loot items", stats?.lootItems, Package],
    ["Kill labels", stats?.killEventCount, Crosshair], ["Death labels", stats?.deathEventCount, Skull],
    ["Storm deaths", stats?.stormDeaths, Wind], ["Total events", stats?.eventCount, List],
  ] as const;
  return <>
    <section className="match-stats" aria-label="Selected recording summary">
      {entries.map(([label, value, Icon]) => <div className="stat" key={label}>
        <span className="stat-icon"><Icon size={19} /></span>
        <div><span className="stat-label">{label}</span><strong>{value?.toLocaleString() ?? "—"}</strong></div>
      </div>)}
    </section>
    {overview && <div className="match-leaders">
      <span><strong>Most kill labels</strong> {leader(overview.participants, "killEventCount")}</span>
      <span><strong>Most loot</strong> {leader(overview.participants, "lootItems")}</span>
    </div>}
  </>;
}
