-- Six application tables. Re-running this initial migration is safe.
CREATE TABLE IF NOT EXISTS maps (
    id text PRIMARY KEY,
    name text NOT NULL,
    image_path text NOT NULL,
    image_width integer NOT NULL CHECK (image_width > 0),
    image_height integer NOT NULL CHECK (image_height > 0),
    origin_x double precision NOT NULL,
    origin_z double precision NOT NULL,
    world_scale double precision NOT NULL CHECK (world_scale > 0)
);

CREATE TABLE IF NOT EXISTS etl_runs (
    id uuid PRIMARY KEY,
    rule_version text NOT NULL,
    status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    report jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text
);

CREATE TABLE IF NOT EXISTS source_files (
    id uuid PRIMARY KEY,
    bucket text NOT NULL,
    object_key text NOT NULL,
    source_path text NOT NULL,
    collection_date date NOT NULL,
    content_hash text NOT NULL CHECK (length(content_hash) = 64),
    etag text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
    row_count bigint NOT NULL CHECK (row_count >= 0),
    source_schema jsonb NOT NULL,
    status text NOT NULL CHECK (status IN ('loaded', 'duplicate')),
    duplicate_of uuid REFERENCES source_files(id) DEFERRABLE INITIALLY DEFERRED,
    loaded_run_id uuid NOT NULL REFERENCES etl_runs(id),
    UNIQUE (bucket, object_key),
    CHECK ((status = 'duplicate') = (duplicate_of IS NOT NULL)),
    CHECK (duplicate_of IS NULL OR duplicate_of <> id)
);

CREATE TABLE IF NOT EXISTS matches (
    -- Preserve the complete supplied identifier, including the server suffix.
    id text PRIMARY KEY,
    map_id text NOT NULL REFERENCES maps(id),
    first_recorded_at timestamptz NOT NULL,
    last_recorded_at timestamptz NOT NULL,
    updated_run_id uuid NOT NULL REFERENCES etl_runs(id),
    CHECK (last_recorded_at >= first_recorded_at)
);

CREATE TABLE IF NOT EXISTS match_participants (
    id uuid PRIMARY KEY,
    match_id text NOT NULL REFERENCES matches(id),
    source_user_id text NOT NULL,
    actor_type text NOT NULL CHECK (actor_type IN ('human', 'bot')),
    UNIQUE (match_id, source_user_id),
    UNIQUE (id, match_id)
);

CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY,
    match_id text NOT NULL REFERENCES matches(id),
    participant_id uuid NOT NULL,
    source_file_id uuid NOT NULL REFERENCES source_files(id),
    source_row_number integer NOT NULL CHECK (source_row_number >= 0),
    event_type text NOT NULL CHECK (event_type IN (
        'Position', 'BotPosition', 'Kill', 'BotKill',
        'Killed', 'BotKilled', 'KilledByStorm', 'Loot'
    )),
    raw_timestamp_value bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    event_date date NOT NULL,
    x real NOT NULL,
    y real NOT NULL,
    z real NOT NULL,
    minimap_x double precision NOT NULL CHECK (minimap_x BETWEEN 0 AND 1),
    minimap_y double precision NOT NULL CHECK (minimap_y BETWEEN 0 AND 1),
    repeated_combat boolean NOT NULL DEFAULT false,
    post_death_position boolean NOT NULL DEFAULT false,
    FOREIGN KEY (participant_id, match_id) REFERENCES match_participants(id, match_id),
    UNIQUE (source_file_id, source_row_number),
    CHECK (event_date = (occurred_at AT TIME ZONE 'UTC')::date),
    CHECK (occurred_at = to_timestamp(raw_timestamp_value))
);

-- Timestamp ties remain separate events; id only makes their display order stable.
CREATE INDEX IF NOT EXISTS events_match_time_idx ON events (match_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS events_participant_time_idx ON events (participant_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS events_date_match_idx ON events (event_date, match_id);
CREATE INDEX IF NOT EXISTS matches_map_idx ON matches (map_id, id);
CREATE INDEX IF NOT EXISTS source_files_hash_idx ON source_files (content_hash);
