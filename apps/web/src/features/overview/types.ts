export interface MapOption {
  id: string;
  name: string;
  width: number;
  height: number;
  imagePath?: string;
}

export type HeatmapLayer = "traffic" | "kills" | "deaths" | "storm" | "loot";

export const LAYERS: { id: HeatmapLayer; label: string; color: string }[] = [
  { id: "traffic", label: "Player traffic", color: "#c4e88a" },
  { id: "kills", label: "Kill zones", color: "#f2a56d" },
  { id: "deaths", label: "Death zones", color: "#ef8088" },
  { id: "storm", label: "Storm deaths", color: "#b8a1ed" },
  { id: "loot", label: "Loot pickups", color: "#7dc8dd" },
];
