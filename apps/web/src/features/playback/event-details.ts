import type { EventType } from "@/lib/gameplay-types";

export type CombatCategory = "kills" | "deaths" | "storm";

export function isPositionEvent(eventType: EventType) {
  return eventType === "Position" || eventType === "BotPosition";
}

export function combatCategory(eventType: EventType): CombatCategory | null {
  if (eventType === "Kill" || eventType === "BotKill") return "kills";
  if (eventType === "Killed" || eventType === "BotKilled") return "deaths";
  if (eventType === "KilledByStorm") return "storm";
  return null;
}

export function formatRecordedTime(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}
