"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesCombined, ChevronRight, Grid2X2, Info, Layers2, Map as MapIcon, PanelLeftClose, PanelLeftOpen, Play } from "lucide-react";
import type { PlaybackFrame } from "@/lib/gameplay-types";
import { PlaybackControls } from "@/features/playback/components/playback-controls";
import { JourneyOverlay } from "@/features/playback/components/journey-overlay";
import { MarkerInspector } from "@/features/playback/components/marker-inspector";
import { useMarkerInspection } from "@/features/playback/hooks/use-marker-inspection";
import { formatElapsed, useMatchPlayback } from "@/features/playback/hooks/use-match-playback";
import { MAP_OPTIONS } from "../map-assets";
import { LAYERS, type HeatmapLayer } from "../types";
import { useExplorerData } from "../hooks/use-explorer-data";
import { MapViewport } from "./map-viewport";
import { HeatmapOverlay } from "./heatmap-overlay";
import { FullscreenHeatmapPanel } from "./fullscreen-heatmap-panel";
import { MatchStatistics } from "./match-statistics";
import { ExplorerSidebar } from "./explorer-sidebar";
import { formatDate } from "../format-date";

const EMPTY_FRAMES: PlaybackFrame[] = [];

export function OverviewPage() {
  const [mode, setMode] = useState<"overview" | "playback">("overview");
  const [layers, setLayers] = useState<HeatmapLayer[]>([]);
  const [opacity, setOpacity] = useState(75);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statisticsCollapsed, setStatisticsCollapsed] = useState(false);
  const isPlayback = mode === "playback";
  const data = useExplorerData(isPlayback, layers);
  const frames = data.playback.data?.frames ?? EMPTY_FRAMES;
  const playback = useMatchPlayback(frames);
  const inspection = useMarkerInspection(`${data.matchId}:${data.date}:${mode}:${data.playback.data?.revision ?? ""}`,
    playback.index, hidden, playback.pause);
  const overview = isPlayback ? data.playback.data : data.overview.data;
  const participants = overview?.participants ?? [];
  const map = data.maps.data?.maps.find((item) => item.id === data.mapId) ?? MAP_OPTIONS.find((item) => item.id === data.mapId)!;
  const viewName = isPlayback ? "Playback" : "Overview";

  useEffect(() => { document.title = `${viewName} · Gameplay Journey Visualizer`; }, [viewName]);
  useEffect(() => { setHidden([]); }, [data.matchId, data.date]);

  function changeMode(next: "overview" | "playback") {
    if (next === mode) return;
    setLayers([]);
    setOpacity(75);
    setMode(next);
  }

  return <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <header className="app-header">
      <a href="/" className="brand" aria-label="Gameplay Journey Visualizer overview">
        <span className="brand-name">
          <span className="brand-kicker">Gameplay</span>
          <span className="brand-title">Journey <span>Visualizer</span></span>
        </span>
      </a>
      <div className="header-divider" /><span className="workspace-name">Level design workspace</span>
      <div className="header-right"><span className="dataset-badge"><span />Recorded gameplay</span><div className="avatar">LD</div></div>
    </header>

    <ExplorerSidebar data={data} isPlayback={isPlayback} collapsed={sidebarCollapsed} layers={layers} opacity={opacity}
      onCollapse={() => setSidebarCollapsed(true)}
      hiddenParticipants={hidden} onLayersChange={setLayers} onOpacityChange={setOpacity}
      onToggleParticipant={(id) => setHidden((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />

    <main className={`main-content ${isPlayback ? "is-playback" : ""}`} id="main-content">
      <div className="page-heading">
        <div><div className="breadcrumb">Workspace<ChevronRight size={12} /><span>{viewName}</span></div>
          <h1>{isPlayback ? "Match playback" : "Overview"}<span className="small-badge">LILA BLACK DATA</span></h1>
          <p>{isPlayback ? "Follow a match, one recorded moment at a time." : "A closer look at where the action happens."}</p></div>
        <div className="page-actions">
          <div className="page-status"><span className="status-dot" />{formatDate(data.date)}</div>
          <div className="workspace-controls">
            <button type="button" aria-controls="workspace-sidebar" aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed((current) => !current)}>
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            </button>
            {!isPlayback && <button type="button" aria-controls="recording-statistics" aria-expanded={!statisticsCollapsed}
              onClick={() => setStatisticsCollapsed((current) => !current)}>
              <ChartNoAxesCombined size={16} />{statisticsCollapsed ? "Show statistics" : "Hide statistics"}
            </button>}
          </div>
        </div>
      </div>
      {data.error && <div className="data-message is-error" role="alert">{data.error} <button onClick={() => window.location.reload()}>Retry</button></div>}
      {!data.error && !data.loading && !data.matchId && <div className="data-message" role="status">No imported recordings are available for this selection. Run ingestion, then refresh the page.</div>}

      <section className="map-panel" aria-labelledby="map-heading" aria-busy={data.loading}>
        <div className="map-panel-header">
          <div className="map-heading-wrap"><div className="map-title-icon"><MapIcon size={20} /></div>
            <div><h2 id="map-heading">{map.name}</h2><div className="map-subtitle" title={data.matchId}>{data.matchId ? data.matchId.slice(0, 18) + "…" : "Select a recording"}<span>/</span><span className="mono">{data.loading ? "LOADING" : "RECORDED"}</span></div></div>
          </div>
          <div className="view-tabs" role="group" aria-label="View mode">
            <button type="button" className={`view-tab ${!isPlayback ? "active" : ""}`} aria-pressed={!isPlayback} onClick={() => changeMode("overview")}><Grid2X2 size={14} />Overview</button>
            <button type="button" className={`view-tab ${isPlayback ? "active" : ""}`} aria-pressed={isPlayback} onClick={() => changeMode("playback")}><Play size={14} />Playback</button>
          </div>
        </div>
        <MapViewport key={data.mapId} map={map} layers={layers} mode={mode}
          fullscreenPanel={!isPlayback && <FullscreenHeatmapPanel layers={layers} opacity={opacity}
            onLayersChange={setLayers} onOpacityChange={setOpacity} />}
          footer={isPlayback ? <PlaybackControls frames={frames} playback={playback} /> : undefined}
          inspector={isPlayback && inspection.event ? <MarkerInspector event={inspection.event}
            frameEvents={(frames[playback.index]?.events ?? []).filter((event) => !hidden.includes(event.participantId))}
            participants={participants} onSelect={inspection.inspect} onClose={inspection.close} /> : undefined}
          statusText={data.loading ? "Loading recordings…" : isPlayback ? `${participants.length} ${participants.length === 1 ? "participant" : "participants"} · ${formatElapsed(frames[playback.index]?.elapsedSeconds ?? 0)}` : layers.length ? "Event density" : "No overlays selected"}>
          {isPlayback ? <JourneyOverlay frames={frames} index={playback.index} participants={participants} hidden={hidden}
            selectedEventId={inspection.event?.id} onInspect={inspection.inspect} />
            : <HeatmapOverlay heatmaps={data.heatmaps.data ?? []} opacity={opacity} />}
        </MapViewport>
        {!isPlayback && <div className="map-panel-footer"><span><span className="status-dot" />{layers.length ? "Density counts recorded events; traffic counts position samples" : "Select a heatmap layer to explore this recording"}</span><span><Layers2 size={13} />{layers.length} / {LAYERS.length} layers</span></div>}
      </section>
      {!isPlayback && <div id="recording-statistics" className="statistics-panel" hidden={statisticsCollapsed}>
        <MatchStatistics overview={data.overview.data} />
      </div>}
      <div className="coverage-note"><Info size={14} /><p>{isPlayback
        ? "Playback advances between recorded timestamps. Supplied positions after death labels are retained. Trails break across sampling gaps longer than 15 seconds."
        : "Showing the supplied recordings on this UTC date. Kill and death totals count retained event labels; repeated combat records remain included."}</p></div>
    </main>
  </div>;
}
