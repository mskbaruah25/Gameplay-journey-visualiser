"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Expand, Layers2, Minus, Play, Plus, RotateCcw } from "lucide-react";
import type { HeatmapLayer, MapOption } from "../types";
import { MapLegend } from "./map-legend";

interface Props {
  map: MapOption;
  layers: HeatmapLayer[];
  mode?: "overview" | "playback";
  children?: ReactNode;
  statusText?: string;
  fullscreenPanel?: ReactNode;
  footer?: ReactNode;
}

export function MapViewport({ map, layers, mode = "overview", children, statusText, fullscreenPanel, footer }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === viewport.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  function changeZoom(amount: number) {
    const next = Math.max(1, Math.min(3, zoom + amount));
    const bounds = canvas.current?.getBoundingClientRect();
    const limit = Math.max(0, Math.min(bounds?.width ?? 600, bounds?.height ?? 600) - 40) * (next - 1) / 2;
    setZoom(next);
    setPan((current) => ({ x: Math.max(-limit, Math.min(limit, current.x)), y: Math.max(-limit, Math.min(limit, current.y)) }));
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const bounds = canvas.current?.getBoundingClientRect();
    const limit = Math.max(0, Math.min(bounds?.width ?? 600, bounds?.height ?? 600) - 40) * (zoom - 1) / 2;
    setPan({
      x: Math.max(-limit, Math.min(limit, drag.current.left + event.clientX - drag.current.x)),
      y: Math.max(-limit, Math.min(limit, drag.current.top + event.clientY - drag.current.y)),
    });
  }

  async function toggleFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewport.current?.requestFullscreen();
      setFullscreen(document.fullscreenElement === viewport.current);
    } catch { setFullscreenError("Fullscreen is unavailable in this browser."); }
  }

  return <div className="map-view" ref={viewport}>
    {/* Keep controls inside the fullscreen element, outside the draggable canvas. */}
    <div className={`map-viewport ${dragging ? "dragging" : ""} ${zoom > 1 ? "is-zoomed" : ""}`} ref={canvas}
      onPointerDown={(event) => {
        if (zoom === 1 || (event.target as HTMLElement).closest("button")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, left: pan.x, top: pan.y };
        setDragging(true);
      }}
      onPointerMove={move}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}>
      <div className="grid-labels grid-labels-top" aria-hidden="true">{"ABCDEF".split("").map((letter) => <span key={letter}>{letter}</span>)}</div>
      <div className="grid-labels grid-labels-side" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n}>0{n}</span>)}</div>
      <div className="map-image-space">
        <div className="map-image-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, aspectRatio: `${map.width} / ${map.height}` }}>
          {/* The exported asset is already sized for the viewport; no image service is needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="minimap-image" src={map.imagePath ?? `/maps/${map.id}.webp`} alt={`${map.name} supplied top-down minimap`} draggable={false} />
          <div className="map-coordinate-grid" aria-hidden="true" />
          {children}
        </div>
      </div>
      <div className="compass" aria-label="Map top"><span>N</span><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1 21 27 12 21 3 27Z" fill="currentColor"/><path d="M12 1v20l9 6Z" fill="var(--subtle)"/></svg></div>
      <div className="map-tools" aria-label="Map controls">
        <button aria-label="Zoom in" title="Zoom in" onClick={() => changeZoom(0.25)} disabled={zoom === 3}><Plus size={17} /></button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button aria-label="Zoom out" title="Zoom out" onClick={() => changeZoom(-0.25)} disabled={zoom === 1}><Minus size={17} /></button>
        <span className="tool-separator" />
        <button aria-label="Reset map view" title="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={16} /></button>
        <button aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title="Fullscreen" onClick={toggleFullscreen}><Expand size={16} /></button>
      </div>
      {mode === "playback"
        ? <div className="map-layer-note"><Play size={14} /><span>Recorded journeys</span><i />{statusText ?? "Select a match"}</div>
        : <div className="map-layer-note"><Layers2 size={15} /><span>{layers.length ? `${layers.length} ${layers.length === 1 ? "layer" : "layers"} selected` : "Basemap only"}</span><i />{statusText ?? "No overlays selected"}</div>}
      {fullscreenError && <div className="map-notice" role="status">{fullscreenError}</div>}
    </div>
    {(!fullscreen || mode === "playback") && <MapLegend mode={mode} layers={layers} />}
    {fullscreen && fullscreenPanel}
    {footer}
  </div>;
}
