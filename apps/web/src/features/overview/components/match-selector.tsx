"use client";

import { useRef, useState } from "react";
import { ChevronDown, Crosshair, Search, X } from "lucide-react";
import type { MatchOption } from "@/lib/gameplay-types";

interface Props {
  matches: MatchOption[];
  value: string;
  loading: boolean;
  onChange: (matchId: string) => void;
}

export function MatchSelector({ matches, value, loading, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [multipleOnly, setMultipleOnly] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();

  // Number the complete list first so searching never renames a match.
  const options = matches.map((match, index) => ({
    id: match.id,
    label: `Match ${String(index + 1).padStart(3, "0")} · ${match.humans} ${match.humans === 1 ? "human" : "humans"} · ${match.bots} ${match.bots === 1 ? "bot" : "bots"}`,
    participantCount: match.humans + match.bots,
  }));
  const results = options.filter((option) =>
    (!multipleOnly || option.participantCount > 1)
    && (option.id.toLowerCase().includes(query) || option.label.toLowerCase().includes(query)));
  const selected = options.find((option) => option.id === value);
  const selectedMatch = matches.find((match) => match.id === value);
  const selectedOutsideResults = selected && !results.some((option) => option.id === value);

  let searchStatus;
  if (loading) searchStatus = "Loading matches…";
  else if (!query && !multipleOnly) searchStatus = `${matches.length} ${matches.length === 1 ? "match" : "matches"} available`;
  else if (results.length) searchStatus = `${results.length} of ${matches.length} matches found`;
  else searchStatus = "No matches found. Change the search or participant filter.";

  return <div className="select-field match-selector">
    <label htmlFor="match">Match</label>
    <div className="match-search-wrap">
      <Search size={14} aria-hidden="true" />
      <input id="match-search" ref={searchInput} type="search" value={search}
        aria-label="Search matches" aria-controls="match" aria-describedby="match-search-results"
        placeholder="Search number or match ID" autoComplete="off" spellCheck={false}
        disabled={!matches.length} onChange={(event) => setSearch(event.target.value)} />
      {search && <button type="button" aria-label="Clear match search" onClick={() => {
        setSearch("");
        searchInput.current?.focus();
      }}><X size={13} /></button>}
    </div>
    <label className="match-participant-filter">
      <input type="checkbox" checked={multipleOnly} disabled={!matches.length}
        onChange={(event) => setMultipleOnly(event.target.checked)} />
      <span>Multiple recorded participants</span>
    </label>
    <div className="select-wrap">
      <Crosshair size={16} aria-hidden="true" />
      <select id="match" value={value} disabled={!matches.length} title={value}
        onChange={(event) => onChange(event.target.value)}>
        {!matches.length && <option value="">{loading ? "Loading matches…" : "No imported matches"}</option>}
        {/* Keep the displayed value honest while a search hides the active match. */}
        {selectedOutsideResults && <optgroup label="Currently selected">
          <option value={selected.id}>{selected.label}</option>
        </optgroup>}
        {query || multipleOnly ? <optgroup label="Filtered matches">
          {results.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          {!results.length && <option disabled>No matching matches</option>}
        </optgroup> : results.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
    </div>
    {selectedMatch && <p className="selected-match-details">
      Recorded: {selectedMatch.humans} {selectedMatch.humans === 1 ? "human" : "humans"} · {selectedMatch.bots} {selectedMatch.bots === 1 ? "bot" : "bots"}
    </p>}
    <p id="match-search-results" className="match-search-results" role="status">
      {searchStatus}
      {selectedOutsideResults && " Current match is outside these filters."}
    </p>
  </div>;
}
