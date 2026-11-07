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
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();

  // Number the complete list first so searching never renames a match.
  const options = matches.map((match, index) => ({
    id: match.id,
    label: `Match ${String(index + 1).padStart(3, "0")} · ${match.id.slice(0, 8)}`,
  }));
  const results = options.filter((option) =>
    option.id.toLowerCase().includes(query) || option.label.toLowerCase().includes(query));
  const selected = options.find((option) => option.id === value);
  const selectedOutsideResults = selected && !results.some((option) => option.id === value);

  let searchStatus;
  if (loading) searchStatus = "Loading matches…";
  else if (!query) searchStatus = `${matches.length} ${matches.length === 1 ? "match" : "matches"} available`;
  else if (results.length) searchStatus = `${results.length} of ${matches.length} matches found`;
  else searchStatus = "No matches found. Try another number or ID.";

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
    <div className="select-wrap">
      <Crosshair size={16} aria-hidden="true" />
      <select id="match" value={value} disabled={!matches.length}
        onChange={(event) => onChange(event.target.value)}>
        {!matches.length && <option value="">{loading ? "Loading matches…" : "No imported matches"}</option>}
        {/* Keep the displayed value honest while a search hides the active match. */}
        {selectedOutsideResults && <optgroup label="Currently selected">
          <option value={selected.id}>{selected.label}</option>
        </optgroup>}
        {query ? <optgroup label="Search results">
          {results.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          {!results.length && <option disabled>No matching matches</option>}
        </optgroup> : results.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} className="select-chevron" aria-hidden="true" />
    </div>
    <p id="match-search-results" className="match-search-results" role="status">
      {searchStatus}
    </p>
  </div>;
}
