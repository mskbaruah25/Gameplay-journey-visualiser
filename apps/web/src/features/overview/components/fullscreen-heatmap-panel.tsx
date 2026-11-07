import { ChevronDown, Layers2 } from "lucide-react";
import { LAYERS, type HeatmapLayer } from "../types";
import { HeatmapControls } from "./heatmap-controls";

interface Props {
  layers: HeatmapLayer[];
  opacity: number;
  onLayersChange: (layers: HeatmapLayer[]) => void;
  onOpacityChange: (opacity: number) => void;
}

export function FullscreenHeatmapPanel(props: Props) {
  const activeLayers = LAYERS.filter((layer) => props.layers.includes(layer.id));

  return <aside className="map-fullscreen-panel" aria-label="Fullscreen heatmap tools">
    <details open>
      <summary><Layers2 size={16} /><span>Heatmap tools</span><ChevronDown size={15} /></summary>
      <div className="fullscreen-panel-content">
        <HeatmapControls {...props} />
        <section className="heatmap-legend" aria-label="Map legend">
          <h2>Map legend</h2>
          {activeLayers.length ? <>
            <ul>
              {activeLayers.map((layer) => <li key={layer.id}>
                <i style={{ backgroundColor: layer.color }} aria-hidden="true" />{layer.label}
              </li>)}
            </ul>
            <div className="density-legend" aria-hidden="true" />
            <div className="density-legend-labels"><span>Lower density</span><span>Higher density</span></div>
            <p>Brighter areas contain more records within each layer. Traffic counts position samples.</p>
          </> : <p>Select a layer to see its colour and density key.</p>}
        </section>
      </div>
    </details>
  </aside>;
}
