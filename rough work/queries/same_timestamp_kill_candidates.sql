-- Spark SQL. First register the notebook's decoded events DataFrame:
-- events.createOrReplaceTempView("player_events")
-- timestamp_value is the original integer recovered from the stored timestamp.
-- DISTINCT lists each matching ID/time/label combination once.

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
    AND NOT EXISTS (
        SELECT 1
        FROM player_events AS later_position
        WHERE later_position.match_id = victim.match_id
            AND later_position.user_id = victim.user_id
            AND later_position.event IN ('Position', 'BotPosition')
            AND later_position.timestamp_value > victim.timestamp_value
    )
ORDER BY
    match_id,
    event_timestamp,
    possible_killer_id,
    possible_victim_id,
    kill_event,
    death_event;
