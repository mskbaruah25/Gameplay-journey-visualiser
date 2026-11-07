"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Crosshair, Grid2X2, Info, Layers2, Map as MapIcon, Play, PanelTop } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import type { PlaybackFrame } from "@/lib/gameplay-types";
import { PlaybackControls } from "@/features/playback/components/playback-controls";
import { PlaybackSidebar } from "@/features/playback/components/playback-sidebar";
import { JourneyOverlay } from "@/features/playback/components/journey-overlay";
import { formatElapsed, useMatchPlayback } from "@/features/playback/hooks/use-match-playback";
import { MAP_OPTIONS } from "../map-assets";
import { LAYERS, type HeatmapLayer } from "../types";
import { useExplorerData } from "../hooks/use-explorer-data";
import { MapViewport } from "./map-viewport";
import { HeatmapOverlay } from "./heatmap-overlay";
import { HeatmapControls } from "./heatmap-controls";
import { FullscreenHeatmapPanel } from "./fullscreen-heatmap-panel";
import { MatchStatistics } from "./match-statistics";

const EMPTY_FRAMES: PlaybackFrame[] = [];

function formatDate(value: string) {
  if (!value) return "No available dates";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function OverviewPage() {
  const [mode, setMode] = useState<"overview" | "playback">("overview");
  const [layers, setLayers] = useState<HeatmapLayer[]>([]);
  const [opacity, setOpacity] = useState(75);
  const [hidden, setHidden] = useState<string[]>([]);
  const isPlayback = mode === "playback";
  const data = useExplorerData(isPlayback, layers);
  const frames = data.playback.data?.frames ?? EMPTY_FRAMES;
  const playback = useMatchPlayback(frames);
  const overview = isPlayback ? data.playback.data : data.overview.data;
  const participants = overview?.participants ?? [];
  const map = data.maps.data?.maps.find((item) => item.id === data.mapId) ?? MAP_OPTIONS.find((item) => item.id === data.mapId)!;
  const viewName = isPlayback ? "Playback" : "Overview";
  const ViewIcon = isPlayback ? Play : Grid2X2;

  useEffect(() => { document.title = `${viewName} · LILA BLACK`; }, [viewName]);
  useEffect(() => { setHidden([]); }, [data.matchId, data.date]);

  function changeMode(next: "overview" | "playback") {
    if (next === mode) return;
    setLayers([]);
    setOpacity(75);
    setMode(next);
  }

  return <div className="app-shell">
    <header className="app-header">
      <a href="/" className="brand" aria-label="LILA BLACK overview">
        <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-name">LILA<span>BLACK</span></span>
      </a>
      <div className="header-divider" /><span className="workspace-name">Level design workspace</span>
      <div className="header-right"><span className="dataset-badge"><span />Recorded gameplay</span><div className="avatar">LD</div></div>
    </header>

    <aside className="sidebar" aria-label={`${viewName} controls`}>
      <div className="sidebar-navigation"><span className="eyebrow">WORKSPACE</span><div className="active-navigation"><ViewIcon size={17} /><span>{viewName}</span><ChevronRight size={15} /></div></div>
      <section className="selection-section" aria-labelledby="selection-heading">
        <div className="section-heading"><h2 id="selection-heading">Match selection</h2><span>01</span></div>
        <SelectField id="map" label="Map" icon={MapIcon} value={data.mapId} onChange={data.changeMap}>
          {(data.maps.data?.maps ?? MAP_OPTIONS).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectField>
        <SelectField id="date" label="UTC date" icon={CalendarDays} value={data.date} onChange={data.changeDate} disabled={!data.dates.data?.dates.length}>
          {!data.date && <option value="">{data.loading ? "Loading dates…" : "No imported dates"}</option>}
          {data.dates.data?.dates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
        </SelectField>
        <SelectField id="match" label="Match" icon={Crosshair} value={data.matchId} onChange={data.changeMatch} disabled={!data.matches.data?.matches.length}>
          {!data.matchId && <option value="">{data.loading ? "Loading matches…" : "No imported matches"}</option>}
          {data.matches.data?.matches.map((match, index) => <option key={match.id} value={match.id}>Match {String(index + 1).padStart(3, "0")} · {match.id.slice(0, 8)}</option>)}
        </SelectField>
        <div className="selection-footnote"><Info size={11} />Events on the selected UTC date</div>
      </section>

      {isPlayback ? <PlaybackSidebar participants={participants} hidden={hidden}
        onToggle={(id) => setHidden((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />
        : <HeatmapControls layers={layers} opacity={opacity} onLayersChange={setLayers} onOpacityChange={setOpacity} />}
      <div className="sidebar-bottom"><PanelTop size={15} /><div><strong>Gameplay explorer</strong><span>Read-only recordings</span></div><span className="local-tag">V1</span></div>
    </aside>

    <main className={`main-content ${isPlayback ? "is-playback" : ""}`} id="main-content">
      <div className="page-heading">
        <div><div className="breadcrumb">Workspace<ChevronRight size={12} /><span>{viewName}</span></div>
          <h1>{isPlayback ? "Match playback" : "Overview"}<span className="small-badge">LILA BLACK</span></h1>
          <p>{isPlayback ? "Follow a match, one recorded moment at a time." : "A closer look at where the action happens."}</p></div>
        <div className="page-status"><span className="status-dot" />{formatDate(data.date)}</div>
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
          statusText={data.loading ? "Loading recordings…" : isPlayback ? `${participants.length} ${participants.length === 1 ? "participant" : "participants"} · ${formatElapsed(frames[playback.index]?.elapsedSeconds ?? 0)}` : layers.length ? "Event density" : "No overlays selected"}>
          {isPlayback ? <JourneyOverlay frames={frames} index={playback.index} participants={participants} hidden={hidden} />
            : <HeatmapOverlay heatmaps={data.heatmaps.data ?? []} opacity={opacity} />}
        </MapViewport>
        {!isPlayback && <div className="map-panel-footer"><span><span className="status-dot" />{layers.length ? "Density counts recorded events; traffic counts position samples" : "Select a heatmap layer to explore this recording"}</span><span><Layers2 size={13} />{layers.length} / {LAYERS.length} layers</span></div>}
      </section>
      {!isPlayback && <MatchStatistics overview={data.overview.data} />}
      <div className="coverage-note"><Info size={14} /><p>{isPlayback
        ? "Playback advances between recorded timestamps. Supplied positions after death labels are retained. Trails break across sampling gaps longer than 15 seconds."
        : "Showing the supplied recordings on this UTC date. Kill and death totals count retained event labels; repeated combat records remain included."}</p></div>
    </main>
  </div>;
}
