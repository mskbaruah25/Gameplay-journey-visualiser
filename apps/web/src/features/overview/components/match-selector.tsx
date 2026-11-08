"use client";

import { useRef } from "react";
import { ChevronDown, Crosshair, Search, X } from "lucide-react";
import type { MatchChoice, MatchPage } from "@/lib/gameplay-types";
import { matchLabel } from "@/lib/match-label";

interface Props {
  page?: MatchPage;
  selected?: MatchChoice;
  search: string;
  multipleOnly: boolean;
  offset: number;
  pageSize: number;
  loading: boolean;
  onChange: (matchId: string) => void;
  onSearch: (value: string) => void;
  onMultipleOnly: (value: boolean) => void;
  onPage: (offset: number) => void;
}

export function MatchSelector({ page, selected, search, multipleOnly, offset, pageSize, loading,
  onChange, onSearch, onMultipleOnly, onPage }: Props) {
  const searchInput = useRef<HTMLInputElement>(null);
  const matches = page?.matches ?? [];
  const selectedOutsideResults = selected && !matches.some((match) => match.id === selected.id);
  const filtered = Boolean(search.trim() || multipleOnly);
  let searchStatus = loading ? "Loading matches…" : "No imported matches";
  if (!loading && page) {
    searchStatus = matches.length
      ? `Showing ${offset + 1}–${offset + matches.length} of ${page.total} ${page.total === 1 ? "match" : "matches"}${filtered ? ` found (${page.availableTotal} available)` : ""}`
      : page.total ? "No matches on this page. Choose Previous matches."
        : page.availableTotal ? "No matches found. Change the search or participant filter." : "No imported matches";
  }

  return <div className="select-field match-selector">
    <label htmlFor="match">Match</label>
    <div className="match-search-wrap">
      <Search size={14} aria-hidden="true" />
      <input id="match-search" ref={searchInput} type="search" value={search} maxLength={200}
        aria-label="Search matches" aria-controls="match" aria-describedby="match-search-results"
        placeholder="Search number or match ID" autoComplete="off" spellCheck={false}
        onChange={(event) => onSearch(event.target.value)} />
      {search && <button type="button" aria-label="Clear match search" onClick={() => {
        onSearch("");
        searchInput.current?.focus();
      }}><X size={13} /></button>}
    </div>
    <label className="match-participant-filter">
      <input type="checkbox" checked={multipleOnly} onChange={(event) => onMultipleOnly(event.target.checked)} />
      <span>Multiple recorded participants</span>
    </label>
    <div className="select-wrap">
      <Crosshair size={16} aria-hidden="true" />
      <select id="match" value={selected?.id ?? ""} disabled={loading || (!matches.length && !selected)} title={selected?.id}
        aria-busy={loading} onChange={(event) => onChange(event.target.value)}>
        {!selected && <option value="">{loading ? "Loading matches…" : "Select a match"}</option>}
        {selectedOutsideResults && <optgroup label="Currently selected">
          <option value={selected.id}>{matchLabel(selected)}</option>
        </optgroup>}
        <optgroup label={filtered ? "Filtered matches" : "Matches on this page"}>
          {matches.map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}
          {!matches.length && !loading && <option disabled>No matching matches</option>}
        </optgroup>
      </select>
      <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
    </div>
    {selected && <p className="selected-match-details">
      Recorded: {selected.humans} {selected.humans === 1 ? "human" : "humans"} · {selected.bots} {selected.bots === 1 ? "bot" : "bots"}
    </p>}
    <p id="match-search-results" className="match-search-results" role="status">
      {searchStatus}
      {!loading && selectedOutsideResults && " Current match is outside this page or these filters."}
    </p>
    <div className="match-pagination" aria-label="Match result pages">
      <button type="button" disabled={loading || offset === 0} onClick={() => onPage(Math.max(0, offset - pageSize))}>Previous matches</button>
      <button type="button" disabled={loading || !page?.hasMore} onClick={() => onPage(offset + pageSize)}>Next matches</button>
    </div>
  </div>;
}
