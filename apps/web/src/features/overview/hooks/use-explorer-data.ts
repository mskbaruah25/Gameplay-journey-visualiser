"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api-client";
import type { GameMap, HeatmapData, MatchChoice, MatchPage, MatchOverview, PlaybackData } from "@/lib/gameplay-types";
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

const MATCH_PAGE_SIZE = 50;

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
  const [chosenMatch, setChosenMatch] = useState<{ context: string; match: MatchChoice } | null>(null);
  const [filters, setFilters] = useState({ context: "", search: "", multipleOnly: false, offset: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState({ context: "", value: "" });
  const maps = useApiData<{ maps: GameMap[] }>("/api/maps");
  const dates = useApiData<{ dates: string[] }>(`/api/dates?mapId=${encodeURIComponent(mapId)}`);
  const date = dates.data?.dates.includes(chosenDate) ? chosenDate : dates.data?.dates[0] ?? "";
  const context = `${mapId}:${date}`;
  const activeFilters = filters.context === context ? filters : { search: "", multipleOnly: false, offset: 0 };
  const search = debouncedSearch.context === context ? debouncedSearch.value : "";
  const searchPending = search !== activeFilters.search.trim().toLowerCase();
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch({ context, value: activeFilters.search.trim().toLowerCase() }), 250);
    return () => window.clearTimeout(timer);
  }, [context, activeFilters.search]);
  const matches = useApiData<MatchPage>(date
    ? `/api/matches?mapId=${encodeURIComponent(mapId)}&date=${date}&limit=${MATCH_PAGE_SIZE}&offset=${activeFilters.offset}&search=${encodeURIComponent(search)}&multipleOnly=${activeFilters.multipleOnly}`
    : null);
  const selectedMatch = chosenMatch?.context === context ? chosenMatch.match : matches.data?.matches[0];
  const matchId = selectedMatch?.id ?? "";
  // Keep the initial selection after its page is hidden by a search or page turn.
  useEffect(() => {
    if (selectedMatch && chosenMatch?.context !== context) setChosenMatch({ context, match: selectedMatch });
  }, [context, selectedMatch, chosenMatch?.context]);
  const base = matchId ? `/api/matches/${encodeURIComponent(matchId)}` : null;
  const overview = useApiData<MatchOverview>(base ? `${base}?date=${date}` : null);
  const playback = useApiData<PlaybackData>(base && isPlayback ? `${base}/playback?date=${date}` : null);
  const heatmaps = useApiData(base && !isPlayback && layers.length ? `${base}/heatmap?date=${date}&layers=${layers.join(",")}` : null, loadHeatmaps);

  function changeMap(value: string) {
    setChosenDate("");
    setChosenMatch(null);
    setFilters({ context: "", search: "", multipleOnly: false, offset: 0 });
    setDebouncedSearch({ context: "", value: "" });
    setMapId(value);
  }
  function changeDate(value: string) {
    setChosenMatch(null);
    setFilters({ context: "", search: "", multipleOnly: false, offset: 0 });
    setDebouncedSearch({ context: "", value: "" });
    setChosenDate(value);
  }

  return {
    mapId, date, matchId, maps, dates, matches, overview, playback, heatmaps, selectedMatch,
    matchSearch: activeFilters.search, multipleOnly: activeFilters.multipleOnly,
    matchOffset: activeFilters.offset, matchPageSize: MATCH_PAGE_SIZE, searchPending,
    changeMap, changeDate,
    changeMatch: (id: string) => {
      const match = matches.data?.matches.find((item) => item.id === id);
      if (match) setChosenMatch({ context, match });
    },
    changeMatchSearch: (value: string) => setFilters({ ...activeFilters, context, search: value, offset: 0 }),
    changeMultipleOnly: (value: boolean) => setFilters({ ...activeFilters, context, multipleOnly: value, offset: 0 }),
    changeMatchPage: (offset: number) => setFilters({ ...activeFilters, context, offset }),
    error: maps.error ?? dates.error ?? matches.error ?? overview.error ?? playback.error ?? heatmaps.error,
    loading: maps.loading || dates.loading || (!matchId && matches.loading) || overview.loading || playback.loading || heatmaps.loading,
  };
}
