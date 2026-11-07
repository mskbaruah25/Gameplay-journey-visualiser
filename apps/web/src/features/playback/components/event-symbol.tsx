import type { EventType } from "@/lib/gameplay-types";

/** Shared by the map and its legend so the event shapes stay consistent. */
export function EventSymbol({ eventType }: { eventType: EventType }) {
  if (eventType === "Loot") {
    return <rect x={-6} y={-6} width={12} height={12} fill="#7dc8dd" stroke="#10160f" strokeWidth={2} />;
  }
  if (eventType === "KilledByStorm") {
    return <path d="M0,-10 L9,7 L-9,7 Z" fill="#b8a1ed" stroke="#10160f" strokeWidth={2} />;
  }
  if (["Kill", "BotKill"].includes(eventType)) {
    return <g stroke="#f2a56d" strokeWidth={3} fill="none"><circle r={8} /><path d="M-13,0 H13 M0,-13 V13" /></g>;
  }
  return <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#ff8993" strokeWidth={4} />;
}
