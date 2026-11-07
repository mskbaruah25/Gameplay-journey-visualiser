import { ChevronDown, Layers2 } from "lucide-react";
import type { HeatmapLayer } from "../types";
import { HeatmapControls } from "./heatmap-controls";
import { HeatmapLegend } from "./map-legend";

interface Props {
  layers: HeatmapLayer[];
  opacity: number;
  onLayersChange: (layers: HeatmapLayer[]) => void;
  onOpacityChange: (opacity: number) => void;
}

export function FullscreenHeatmapPanel(props: Props) {
  return <aside className="map-fullscreen-panel" aria-label="Fullscreen heatmap tools">
    <details open>
      <summary><Layers2 size={16} /><span>Heatmap tools</span><ChevronDown size={15} /></summary>
      <div className="fullscreen-panel-content">
        <HeatmapControls {...props} />
        <section className="heatmap-legend" aria-label="Map legend">
          <h2>Map legend</h2>
          <HeatmapLegend layers={props.layers} />
        </section>
      </div>
    </details>
  </aside>;
}
