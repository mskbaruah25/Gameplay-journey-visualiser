import { ChevronDown } from "lucide-react";
import type { EventType } from "@/lib/gameplay-types";
import { EventSymbol } from "@/features/playback/components/event-symbol";
import { LAYERS, type HeatmapLayer } from "../types";

const EVENT_KEYS: { eventType: EventType; label: string }[] = [
  { eventType: "Kill", label: "Kill" },
  { eventType: "Killed", label: "Death" },
  { eventType: "Loot", label: "Loot pickup" },
  { eventType: "KilledByStorm", label: "Storm death" },
];

export function HeatmapLegend({ layers }: { layers: HeatmapLayer[] }) {
  // With no active overlay, still show the available colour key.
  const visibleLayers = layers.length ? LAYERS.filter((layer) => layers.includes(layer.id)) : LAYERS;
  return <>
    <ul className="heatmap-colour-key">
      {visibleLayers.map((layer) => <li key={layer.id}>
        <i style={{ backgroundColor: layer.color }} aria-hidden="true" />{layer.label}
      </li>)}
    </ul>
    <div className="density-legend" aria-hidden="true" />
    <div className="density-legend-labels"><span>Lower density</span><span>Higher density</span></div>
    <p>Brighter areas contain more records within each layer. Traffic counts position samples.</p>
  </>;
}

export function MapLegend({ mode, layers }: { mode: "overview" | "playback"; layers: HeatmapLayer[] }) {
  return <aside className="map-legend" aria-label="Map legend">
    <details open>
      <summary><span>Map legend</span><ChevronDown size={14} /></summary>
      <div className="map-legend-content">
        {mode === "overview" ? <HeatmapLegend layers={layers} /> : <>
          <div className="map-legend-actors">
            <span><i className="human-marker" aria-hidden="true" />Human</span>
            <span><i className="bot-marker" aria-hidden="true" />Bot</span>
          </div>
          <div className="map-legend-events">
            {EVENT_KEYS.map(({ eventType, label }) => <span key={eventType}>
              <svg viewBox="-16 -16 32 32" aria-hidden="true"><EventSymbol eventType={eventType} /></svg>{label}
            </span>)}
          </div>
          <p>Human trails are solid; bot trails are dashed. Event markers show the current timestamp.</p>
        </>}
      </div>
    </details>
  </aside>;
}
