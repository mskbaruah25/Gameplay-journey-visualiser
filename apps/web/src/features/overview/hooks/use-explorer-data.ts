"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api-client";
import type { GameMap, HeatmapData, MatchOption, MatchOverview, PlaybackData } from "@/lib/gameplay-types";
import type { HeatmapLayer } from "../types";

type Loader<T> = (url: string, signal: AbortSignal) => Promise<T>;

export function useApiData<T>(url: string | null, loader?: Loader<T>) {
  const [result, setResult] = useState<{ url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const load = loader ?? fetchJson<T>;
    load(url, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ url, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ url, error: error.message });
      });
    return () => controller.abort();
  }, [url, loader]);
  // Never paint the previous selection's data over the new minimap.
  const current = result?.url === url ? result : null;
  return { data: current?.data, error: current?.error, loading: Boolean(url && !current) };
}

async function loadMatches(url: string, signal: AbortSignal) {
  const matches: MatchOption[] = [];
  let hasMore = true;
  while (hasMore) {
    const page = await fetchJson<{ matches: MatchOption[]; hasMore: boolean }>(`${url}&offset=${matches.length}`, signal);
    matches.push(...page.matches);
    hasMore = page.hasMore;
    if (hasMore && page.matches.length === 0) throw new Error("The match list changed. Please refresh the page.");
  }
  return { matches };
}

async function loadHeatmaps(url: string, signal: AbortSignal) {
  const parsed = new URL(url, window.location.origin);
  const layers = parsed.searchParams.get("layers")!.split(",");
  parsed.searchParams.delete("layers");
  return Promise.all(layers.map((layer) => {
    parsed.searchParams.set("layer", layer);
    return fetchJson<HeatmapData>(parsed.pathname + parsed.search, signal);
  }));
}

export function useExplorerData(isPlayback: boolean, layers: HeatmapLayer[]) {
  const [mapId, setMapId] = useState("AmbroseValley");
  const [chosenDate, setChosenDate] = useState("");
  const [chosenMatch, setChosenMatch] = useState("");
  const maps = useApiData<{ maps: GameMap[] }>("/api/maps");
  const dates = useApiData<{ dates: string[] }>(`/api/dates?mapId=${encodeURIComponent(mapId)}`);
  const date = dates.data?.dates.includes(chosenDate) ? chosenDate : dates.data?.dates[0] ?? "";
  const matches = useApiData(date ? `/api/matches?mapId=${encodeURIComponent(mapId)}&date=${date}&limit=500` : null, loadMatches);
  const matchId = matches.data?.matches.some((match) => match.id === chosenMatch) ? chosenMatch : matches.data?.matches[0]?.id ?? "";
  const base = matchId ? `/api/matches/${encodeURIComponent(matchId)}` : null;
  const overview = useApiData<MatchOverview>(base ? `${base}?date=${date}` : null);
  const playback = useApiData<PlaybackData>(base && isPlayback ? `${base}/playback?date=${date}` : null);
  const heatmaps = useApiData(base && !isPlayback && layers.length ? `${base}/heatmap?date=${date}&layers=${layers.join(",")}` : null, loadHeatmaps);

  function changeMap(value: string) {
    setChosenDate("");
    setChosenMatch("");
    setMapId(value);
  }
  function changeDate(value: string) {
    setChosenMatch("");
    setChosenDate(value);
  }

  return {
    mapId, date, matchId, maps, dates, matches, overview, playback, heatmaps,
    changeMap, changeDate, changeMatch: setChosenMatch,
    error: maps.error ?? dates.error ?? matches.error ?? overview.error ?? playback.error ?? heatmaps.error,
    loading: maps.loading || dates.loading || matches.loading || overview.loading || playback.loading || heatmaps.loading,
  };
}
