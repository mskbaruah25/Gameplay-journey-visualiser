import { Check, Crosshair, Footprints, Package, RotateCcw, Skull, Wind } from "lucide-react";
import { LAYERS, type HeatmapLayer } from "../types";

const icons = { traffic: Footprints, kills: Crosshair, deaths: Skull, storm: Wind, loot: Package };

interface Props {
  layers: HeatmapLayer[];
  opacity: number;
  onLayersChange: (layers: HeatmapLayer[]) => void;
  onOpacityChange: (opacity: number) => void;
}

export function HeatmapControls({ layers, opacity, onLayersChange, onOpacityChange }: Props) {
  return <section className="heatmap-section" aria-labelledby="heatmap-heading">
    <div className="section-heading"><h2 id="heatmap-heading">Heatmap layers</h2><span>{String(layers.length).padStart(2, "0")}</span></div>
    <p className="section-description">Recorded activity for this match and UTC date.</p>
    <div className="layer-list">
      {LAYERS.map((layer) => {
        const Icon = icons[layer.id];
        const active = layers.includes(layer.id);
        return <button key={layer.id} type="button" className={`layer-button ${active ? "is-active" : ""}`}
          aria-pressed={active} style={{ "--layer-color": layer.color } as React.CSSProperties}
          onClick={() => onLayersChange(active ? layers.filter((id) => id !== layer.id) : [...layers, layer.id])}>
          <span className="layer-icon"><Icon size={17} /></span><span>{layer.label}</span>
          <span className="layer-checkbox">{active && <Check size={12} strokeWidth={3} />}</span>
        </button>;
      })}
    </div>
    <div className={`opacity-control ${!layers.length ? "is-disabled" : ""}`}>
      <label htmlFor="opacity">Overlay opacity<span>{opacity}%</span></label>
      <input id="opacity" type="range" min="15" max="100" value={opacity} disabled={!layers.length}
        style={{ "--range-progress": `${(opacity - 15) / 85 * 100}%` } as React.CSSProperties}
        onChange={(event) => onOpacityChange(Number(event.target.value))} />
    </div>
    <button className="reset-layers" disabled={!layers.length} onClick={() => { onLayersChange([]); onOpacityChange(75); }}><RotateCcw size={13} />Reset layers</button>
  </section>;
}
