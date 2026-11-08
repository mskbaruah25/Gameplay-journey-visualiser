import type { MatchChoice } from "./gameplay-types";

export function matchLabel(match: MatchChoice) {
  return `Match ${String(match.matchNumber).padStart(3, "0")} · ${match.humans} ${match.humans === 1 ? "human" : "humans"} · ${match.bots} ${match.bots === 1 ? "bot" : "bots"}`;
}
