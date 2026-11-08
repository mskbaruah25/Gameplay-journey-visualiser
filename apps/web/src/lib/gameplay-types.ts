// Shared API contracts contain no database connection code or secrets.
export type ActorType = "human" | "bot";
export type EventType = "Position" | "BotPosition" | "Kill" | "BotKill" | "Killed" | "BotKilled" | "KilledByStorm" | "Loot";

export interface GameMap {
  id: string;
  name: string;
  imagePath: string;
  width: number;
  height: number;
}

export interface MatchOption {
  id: string;
  mapId: string;
  firstRecordedAt: string;
  lastRecordedAt: string;
  eventCount: number;
  humans: number;
  bots: number;
}

export interface MatchChoice extends MatchOption {
  matchNumber: number;
}

export interface MatchPage {
  matches: MatchChoice[];
  total: number;
  availableTotal: number;
  hasMore: boolean;
}

export interface Participant {
  id: string;
  userId: string;
  actorType: ActorType;
  eventCount: number;
  positionSamples: number;
  killEventCount: number;
  deathEventCount: number;
  lootItems: number;
}

export interface MatchStats {
  eventCount: number;
  positionSamples: number;
  killEventCount: number;
  deathEventCount: number;
  stormDeaths: number;
  lootItems: number;
  humans: number;
  bots: number;
}

export interface MatchOverview {
  match: MatchOption;
  date: string | null;
  stats: MatchStats;
  participants: Participant[];
  countingPolicy: string;
  revision: string;
}

export interface GameEvent {
  id: string;
  participantId: string;
  eventType: EventType;
  timestamp: number;
  elapsedSeconds: number;
  eventDate: string;
  x: number;
  y: number;
  z: number;
  minimapX: number;
  minimapY: number;
  repeatedCombat: boolean;
  postDeathPosition: boolean;
}

export interface PlaybackFrame {
  timestamp: number;
  elapsedSeconds: number;
  events: GameEvent[];
}

export interface PlaybackData extends MatchOverview {
  frames: PlaybackFrame[];
}

export interface HeatmapData {
  layer: string;
  gridSize: number;
  cells: { x: number; y: number; count: number }[];
  totalRecords: number;
}
