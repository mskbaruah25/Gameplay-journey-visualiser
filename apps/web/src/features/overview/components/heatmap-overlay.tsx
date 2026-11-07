import { useId } from "react";
import type { HeatmapData } from "@/lib/gameplay-types";
import { LAYERS } from "../types";

export function HeatmapOverlay({ heatmaps, opacity }: { heatmaps: HeatmapData[]; opacity: number }) {
  const blurId = useId().replaceAll(":", "");
  return <svg className="telemetry-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Recorded event density heatmap" role="img" style={{ opacity: opacity / 100 }}>
    <defs><filter id={blurId} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={8} /></filter></defs>
    {heatmaps.map((heatmap) => {
      const maximum = Math.max(1, ...heatmap.cells.map((cell) => cell.count));
      const size = 1000 / heatmap.gridSize;
      const color = LAYERS.find((layer) => layer.id === heatmap.layer)?.color ?? "#c4e88a";
      return <g key={heatmap.layer} filter={`url(#${blurId})`}>
        {heatmap.cells.map((cell) => <rect key={`${cell.x}:${cell.y}`} x={cell.x * size} y={cell.y * size}
          width={size} height={size} fill={color} opacity={0.15 + 0.85 * Math.sqrt(cell.count / maximum)} />)}
      </g>;
    })}
  </svg>;
}
