import { CalendarDays, ChevronRight, Grid2X2, Info, Map as MapIcon, PanelLeftClose, PanelTop, Play } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { PlaybackSidebar } from "@/features/playback/components/playback-sidebar";
import type { useExplorerData } from "../hooks/use-explorer-data";
import { formatDate } from "../format-date";
import { MAP_OPTIONS } from "../map-assets";
import type { HeatmapLayer } from "../types";
import { HeatmapControls } from "./heatmap-controls";
import { MatchSelector } from "./match-selector";

interface Props {
  data: ReturnType<typeof useExplorerData>;
  isPlayback: boolean;
  collapsed: boolean;
  layers: HeatmapLayer[];
  opacity: number;
  hiddenParticipants: string[];
  onLayersChange: (layers: HeatmapLayer[]) => void;
  onOpacityChange: (opacity: number) => void;
  onToggleParticipant: (id: string) => void;
  onCollapse: () => void;
}

export function ExplorerSidebar({ data, isPlayback, collapsed, layers, opacity, hiddenParticipants,
  onLayersChange, onOpacityChange, onToggleParticipant, onCollapse }: Props) {
  const viewName = isPlayback ? "Playback" : "Overview";
  const ViewIcon = isPlayback ? Play : Grid2X2;

  return <aside id="workspace-sidebar" className="sidebar" hidden={collapsed} aria-label={`${viewName} controls`}>
    <div className="sidebar-navigation"><div className="sidebar-topline"><span className="eyebrow">WORKSPACE</span>
      <button type="button" aria-label="Collapse sidebar" title="Collapse sidebar" aria-controls="workspace-sidebar" onClick={onCollapse}><PanelLeftClose size={16} /></button>
    </div>
      <div className="active-navigation"><ViewIcon size={17} /><span>{viewName}</span><ChevronRight size={15} /></div>
    </div>
    <section className="selection-section" aria-labelledby="selection-heading">
      <div className="section-heading"><h2 id="selection-heading">Match selection</h2><span>01</span></div>
      <SelectField id="map" label="Map" icon={MapIcon} value={data.mapId} onChange={data.changeMap}>
        {(data.maps.data?.maps ?? MAP_OPTIONS).map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
      </SelectField>
      <SelectField id="date" label="UTC date" icon={CalendarDays} value={data.date} onChange={data.changeDate} disabled={!data.dates.data?.dates.length}>
        {!data.date && <option value="">{data.loading ? "Loading dates…" : "No imported dates"}</option>}
        {data.dates.data?.dates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
      </SelectField>
      <MatchSelector page={data.matches.data} selected={data.selectedMatch} search={data.matchSearch}
        multipleOnly={data.multipleOnly} offset={data.matchOffset} pageSize={data.matchPageSize}
        loading={data.dates.loading || data.matches.loading || data.searchPending} onChange={data.changeMatch}
        onSearch={data.changeMatchSearch} onMultipleOnly={data.changeMultipleOnly} onPage={data.changeMatchPage} />
      <div className="selection-footnote"><Info size={13} />Events on the selected UTC date</div>
    </section>
    {isPlayback ? <PlaybackSidebar participants={data.playback.data?.participants ?? []} hidden={hiddenParticipants} onToggle={onToggleParticipant} />
      : <HeatmapControls layers={layers} opacity={opacity} onLayersChange={onLayersChange} onOpacityChange={onOpacityChange} />}
    <div className="sidebar-bottom"><PanelTop size={15} /><div><strong>Gameplay explorer</strong><span>Read-only recordings</span></div><span className="local-tag">V1</span></div>
  </aside>;
}
