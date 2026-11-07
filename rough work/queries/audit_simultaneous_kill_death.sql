-- Spark SQL against the notebook's decoded player_events view.
-- Keep every same-time pair. Movement endings are results, not filters.
WITH movement_endings AS (
    SELECT
        match_id,
        user_id,
        MAX(timestamp_value) AS last_position_time
    FROM player_events
    WHERE event IN ('Position', 'BotPosition')
    GROUP BY match_id, user_id
),
simultaneous_pairs AS (
    SELECT DISTINCT
        killer.match_id,
        killer.map_id,
        killer.timestamp_value AS event_timestamp,
        killer.user_id AS possible_killer_id,
        killer.actor_type AS possible_killer_type,
        killer.event AS kill_event,
        victim.user_id AS possible_victim_id,
        victim.actor_type AS possible_victim_type,
        victim.event AS death_event
    FROM player_events AS killer
    JOIN player_events AS victim
        ON victim.match_id = killer.match_id
        AND victim.timestamp_value = killer.timestamp_value
        AND victim.user_id <> killer.user_id
    WHERE killer.event IN ('Kill', 'BotKill')
        AND victim.event IN ('Killed', 'BotKilled')
)
SELECT
    pair.*,
    killer_positions.last_position_time AS killer_last_position_time,
    victim_positions.last_position_time AS victim_last_position_time,
    killer_positions.last_position_time - pair.event_timestamp AS killer_last_position_offset,
    victim_positions.last_position_time - pair.event_timestamp AS victim_last_position_offset,
    killer_positions.last_position_time > pair.event_timestamp AS killer_has_later_positions,
    victim_positions.last_position_time > pair.event_timestamp AS victim_has_later_positions,
    CASE
        WHEN killer_positions.last_position_time IS NULL
            OR victim_positions.last_position_time IS NULL
            THEN 'missing_position_history'
        WHEN victim_positions.last_position_time <= pair.event_timestamp
            THEN 'victim_has_no_later_positions'
        WHEN killer_positions.last_position_time <= pair.event_timestamp
            THEN 'only_killer_has_no_later_positions'
        ELSE 'both_have_later_positions'
    END AS movement_result
FROM simultaneous_pairs AS pair
LEFT JOIN movement_endings AS killer_positions
    ON killer_positions.match_id = pair.match_id
    AND killer_positions.user_id = pair.possible_killer_id
LEFT JOIN movement_endings AS victim_positions
    ON victim_positions.match_id = pair.match_id
    AND victim_positions.user_id = pair.possible_victim_id
ORDER BY
    pair.match_id,
    pair.event_timestamp,
    pair.possible_killer_id,
    pair.possible_victim_id;
