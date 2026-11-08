import type { PoolClient } from "pg";
import type { GameEvent, GameMap, MatchChoice, MatchOption, MatchOverview, MatchStats, Participant, PlaybackFrame } from "@/lib/gameplay-types";
import { readSnapshot } from "../database";
import { ApiError } from "../http";

export async function listMaps() {
  return readSnapshot(async (client) => {
    const result = await client.query<GameMap>(`
      SELECT id, name, image_path AS "imagePath", image_width AS width, image_height AS height
      FROM maps ORDER BY CASE WHEN id='AmbroseValley' THEN 0 ELSE 1 END, name
    `);
    return { maps: result.rows };
  });
}

export async function listDates(mapId: string | null) {
  return readSnapshot(async (client) => {
    const result = await client.query<{ date: string }>(`
      SELECT DISTINCT s.event_date::text AS date FROM match_summaries s JOIN matches m ON m.id=s.match_id
      WHERE s.event_date IS NOT NULL AND ($1::text IS NULL OR m.map_id=$1) ORDER BY date
    `, [mapId]);
    return { dates: result.rows.map((row) => row.date) };
  });
}

export async function listMatches(mapId: string | null, date: string | null, limit: number, offset: number,
  search = "", multipleOnly = false) {
  return readSnapshot(async (client) => {
    // Number the map/date catalogue before searching so labels survive filters
    // and pagination. All catalogue work reads summaries, never raw events.
    const result = await client.query<{ matches: MatchChoice[]; total: number; availableTotal: number }>(`
      WITH catalogue AS MATERIALIZED (
        SELECT m.id, m.map_id AS "mapId", m.first_recorded_at AS "firstRecordedAt",
          m.last_recorded_at AS "lastRecordedAt", s.event_count::double precision AS "eventCount",
          s.humans, s.bots,
          row_number() OVER (ORDER BY m.first_recorded_at, m.id)::integer AS "matchNumber"
        FROM matches m JOIN match_summaries s ON s.match_id=m.id
        WHERE ($1::text IS NULL OR m.map_id=$1) AND s.event_date IS NOT DISTINCT FROM $2::date
      ), filtered AS MATERIALIZED (
        SELECT * FROM catalogue WHERE (NOT $4::boolean OR humans+bots > 1)
          AND ($3::text = '' OR strpos(lower(id), $3) > 0
            OR strpos(lower('Match ' || lpad("matchNumber"::text, greatest(3, length("matchNumber"::text)), '0')
              || ' · ' || humans || CASE WHEN humans=1 THEN ' human' ELSE ' humans' END
              || ' · ' || bots || CASE WHEN bots=1 THEN ' bot' ELSE ' bots' END), $3) > 0)
      ), page AS (
        SELECT * FROM filtered ORDER BY "firstRecordedAt", id LIMIT $5 OFFSET $6
      )
      SELECT (SELECT count(*)::integer FROM catalogue) AS "availableTotal",
        (SELECT count(*)::integer FROM filtered) AS total,
        coalesce((SELECT json_agg(page ORDER BY "firstRecordedAt", id) FROM page), '[]'::json) AS matches
    `, [mapId, date, search.trim().toLowerCase(), multipleOnly, limit, offset]);
    const page = result.rows[0];
    return { ...page, hasMore: offset + page.matches.length < page.total };
  });
}

async function readOverview(client: PoolClient, matchId: string, date: string | null): Promise<MatchOverview> {
  const match = await client.query<Omit<MatchOption, "eventCount" | "humans" | "bots"> & { revision: string }>(`
    SELECT id, map_id AS "mapId", first_recorded_at AS "firstRecordedAt",
      last_recorded_at AS "lastRecordedAt", updated_run_id::text AS revision
    FROM matches WHERE id=$1
  `, [matchId]);
  if (!match.rows[0]) throw new ApiError(404, "Match not found.");
  const participants = await client.query<Participant>(`
    SELECT p.id, p.source_user_id AS "userId", p.actor_type AS "actorType",
      count(*)::integer AS "eventCount",
      count(*) FILTER (WHERE e.event_type IN ('Position','BotPosition'))::integer AS "positionSamples",
      count(*) FILTER (WHERE e.event_type IN ('Kill','BotKill'))::integer AS "killEventCount",
      count(*) FILTER (WHERE e.event_type IN ('Killed','BotKilled','KilledByStorm'))::integer AS "deathEventCount",
      count(*) FILTER (WHERE e.event_type='Loot')::integer AS "lootItems"
    FROM match_participants p JOIN events e ON e.participant_id=p.id
    WHERE p.match_id=$1 AND ($2::date IS NULL OR e.event_date=$2)
    GROUP BY p.id ORDER BY p.actor_type DESC, p.source_user_id
  `, [matchId, date]);
  const totals = await client.query<MatchStats>(`
    SELECT count(*)::integer AS "eventCount",
      count(*) FILTER (WHERE e.event_type IN ('Position','BotPosition'))::integer AS "positionSamples",
      count(*) FILTER (WHERE e.event_type IN ('Kill','BotKill'))::integer AS "killEventCount",
      count(*) FILTER (WHERE e.event_type IN ('Killed','BotKilled','KilledByStorm'))::integer AS "deathEventCount",
      count(*) FILTER (WHERE e.event_type='KilledByStorm')::integer AS "stormDeaths",
      count(*) FILTER (WHERE e.event_type='Loot')::integer AS "lootItems",
      count(DISTINCT e.participant_id) FILTER (WHERE p.actor_type='human')::integer AS humans,
      count(DISTINCT e.participant_id) FILTER (WHERE p.actor_type='bot')::integer AS bots
    FROM events e JOIN match_participants p ON p.id=e.participant_id
    WHERE e.match_id=$1 AND ($2::date IS NULL OR e.event_date=$2)
  `, [matchId, date]);
  const { revision, ...recording } = match.rows[0];
  return {
    match: { ...recording, eventCount: totals.rows[0].eventCount, humans: totals.rows[0].humans, bots: totals.rows[0].bots },
    date,
    stats: totals.rows[0],
    participants: participants.rows,
    revision,
    countingPolicy: "Retained event rows. Each Loot row counts as one item; repeated combat labels are preserved.",
  };
}

export function matchOverview(matchId: string, date: string | null) {
  return readSnapshot((client) => readOverview(client, matchId, date));
}

const EVENT_FIELDS = `
  e.id, e.participant_id AS "participantId", e.event_type AS "eventType",
  e.raw_timestamp_value::double precision AS timestamp,
  (e.raw_timestamp_value - extract(epoch FROM m.first_recorded_at))::double precision AS "elapsedSeconds",
  e.event_date::text AS "eventDate", e.x, e.y, e.z,
  e.minimap_x AS "minimapX", e.minimap_y AS "minimapY",
  e.repeated_combat AS "repeatedCombat", e.post_death_position AS "postDeathPosition"`;

export async function listEvents(matchId: string, date: string | null, limit: number, offset: number) {
  return readSnapshot(async (client) => {
    const overview = await readOverview(client, matchId, date);
    const result = await client.query<GameEvent>(`
      SELECT ${EVENT_FIELDS} FROM events e JOIN matches m ON m.id=e.match_id
      WHERE e.match_id=$1 AND ($2::date IS NULL OR e.event_date=$2)
      ORDER BY e.occurred_at, e.id LIMIT $3 OFFSET $4
    `, [matchId, date, limit, offset]);
    return { events: result.rows, total: overview.stats.eventCount, hasMore: offset + result.rows.length < overview.stats.eventCount };
  });
}

export async function matchPlayback(matchId: string, date: string | null) {
  return readSnapshot(async (client) => {
    const overview = await readOverview(client, matchId, date);
    // Bound one response without silently truncating a future, much larger match.
    if (overview.stats.eventCount > 100000) throw new ApiError(413, "This recording exceeds the playback response limit. Use the paginated events endpoint.");
    const result = await client.query<GameEvent>(`
      SELECT ${EVENT_FIELDS} FROM events e JOIN matches m ON m.id=e.match_id
      WHERE e.match_id=$1 AND ($2::date IS NULL OR e.event_date=$2)
      ORDER BY e.occurred_at, e.id
    `, [matchId, date]);
    const frames: PlaybackFrame[] = [];
    for (const event of result.rows) {
      let frame = frames[frames.length - 1];
      if (!frame || frame.timestamp !== event.timestamp) {
        frame = { timestamp: event.timestamp, elapsedSeconds: event.elapsedSeconds, events: [] };
        frames.push(frame);
      }
      frame.events.push(event);
    }
    return { ...overview, frames };
  });
}

const HEATMAP_EVENTS: Record<string, string[]> = {
  traffic: ["Position", "BotPosition"],
  kills: ["Kill", "BotKill"],
  deaths: ["Killed", "BotKilled", "KilledByStorm"],
  storm: ["KilledByStorm"],
  loot: ["Loot"],
};

export async function matchHeatmap(matchId: string, date: string | null, layer: string, gridSize: number, actorType: string | null) {
  if (!HEATMAP_EVENTS[layer]) throw new ApiError(400, "Unknown heatmap layer.");
  if (actorType && !["human", "bot"].includes(actorType)) throw new ApiError(400, "actorType must be human or bot.");
  return readSnapshot(async (client) => {
    const exists = await client.query("SELECT id FROM matches WHERE id=$1", [matchId]);
    if (!exists.rowCount) throw new ApiError(404, "Match not found.");
    const result = await client.query<{ x: number; y: number; count: number }>(`
      SELECT least($4-1, floor(e.minimap_x*$4)::integer) AS x,
        least($4-1, floor(e.minimap_y*$4)::integer) AS y, count(*)::integer AS count
      FROM events e JOIN match_participants p ON p.id=e.participant_id
      WHERE e.match_id=$1 AND ($2::date IS NULL OR e.event_date=$2)
        AND e.event_type=ANY($3::text[]) AND ($5::text IS NULL OR p.actor_type=$5)
      GROUP BY 1, 2 ORDER BY 1, 2
    `, [matchId, date, HEATMAP_EVENTS[layer], gridSize, actorType]);
    return { layer, gridSize, cells: result.rows, totalRecords: result.rows.reduce((sum, cell) => sum + cell.count, 0) };
  });
}
