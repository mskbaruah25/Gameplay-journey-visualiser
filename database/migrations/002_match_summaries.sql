-- One full-recording summary and one summary per UTC event date.
-- NULL denotes the full recording; NULLS NOT DISTINCT prevents duplicate totals.
CREATE TABLE match_summaries (
    match_id text NOT NULL REFERENCES matches(id),
    event_date date,
    event_count bigint NOT NULL CHECK (event_count > 0),
    humans integer NOT NULL CHECK (humans >= 0),
    bots integer NOT NULL CHECK (bots >= 0),
    UNIQUE NULLS NOT DISTINCT (match_id, event_date)
);
CREATE INDEX match_summaries_date_idx ON match_summaries (event_date, match_id);

-- Backfill existing installations once, without modifying any source events.
INSERT INTO match_summaries (match_id, event_date, event_count, humans, bots)
SELECT e.match_id, e.event_date, count(*),
    count(DISTINCT e.participant_id) FILTER (WHERE p.actor_type='human'),
    count(DISTINCT e.participant_id) FILTER (WHERE p.actor_type='bot')
FROM events e JOIN match_participants p ON p.id=e.participant_id
GROUP BY GROUPING SETS ((e.match_id), (e.match_id, e.event_date));
