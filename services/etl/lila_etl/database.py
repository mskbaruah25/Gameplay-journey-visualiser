"""Explicit PostgreSQL operations for migrations, staging, and atomic publication."""

import json

import psycopg
from psycopg.conninfo import conninfo_to_dict
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .config import PROJECT_ROOT


EVENT_COLUMNS = [
    'id', 'match_id', 'participant_id', 'source_file_id', 'source_row_number',
    'event_type', 'raw_timestamp_value', 'occurred_at', 'event_date',
    'x', 'y', 'z', 'minimap_x', 'minimap_y', 'repeated_combat',
    'post_death_position', 'map_id', 'user_id', 'actor_type',
]


def prepare_database_files(events, directory):
    """Let Spark format rows for COPY without collecting them into Python."""
    (events.select(*EVENT_COLUMNS).coalesce(2).write
     .option('header', 'false')
     .option('escape', '"')
     .option('nullValue', r'\N')
     .option('timeZone', 'UTC')
     .option('timestampFormat', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
     .option('dateFormat', 'yyyy-MM-dd')
     .csv(str(directory)))


def connect(database_url):
    if not database_url:
        raise ValueError('DATABASE_URL is required. Use local PostgreSQL or your Neon connection string.')
    host = conninfo_to_dict(database_url).get('host', '')
    if host.endswith('.neon.tech') and '-pooler.' in host:
        raise ValueError('Migration and ETL require a direct Neon connection. Set DATABASE_URL_UNPOOLED to the URL with connection pooling turned off.')
    return psycopg.connect(database_url, autocommit=True, row_factory=dict_row)


def migrate(connection):
    with connection.transaction():
        connection.execute('SELECT pg_advisory_xact_lock(64821101)')
        connection.execute('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
        for path in sorted((PROJECT_ROOT / 'database/migrations').glob('*.sql')):
            if connection.execute('SELECT 1 FROM schema_migrations WHERE name=%s', (path.name,)).fetchone():
                continue
            connection.execute(path.read_text())
            connection.execute('INSERT INTO schema_migrations (name) VALUES (%s)', (path.name,))
        maps = json.loads((PROJECT_ROOT / 'config/maps.json').read_text())
        for row in maps:
            connection.execute('''
                INSERT INTO maps (id, name, image_path, image_width, image_height, origin_x, origin_z, world_scale)
                VALUES (%(id)s, %(name)s, %(image_path)s, %(image_width)s, %(image_height)s, %(origin_x)s, %(origin_z)s, %(world_scale)s)
                ON CONFLICT (id) DO UPDATE SET name=excluded.name, image_path=excluded.image_path,
                    image_width=excluded.image_width, image_height=excluded.image_height,
                    origin_x=excluded.origin_x, origin_z=excluded.origin_z, world_scale=excluded.world_scale
            ''', row)


def publish(connection, sources, event_files, affected_matches, run_id, report):
    """Replace only affected matches, committing their metadata and events together."""
    with connection.transaction():
        for source in sources:
            values = {**source, 'source_schema': Jsonb(source['source_schema']), 'run_id': run_id}
            connection.execute('''
                INSERT INTO source_files (id, bucket, object_key, source_path, collection_date, content_hash,
                    etag, size_bytes, row_count, source_schema, status, duplicate_of, loaded_run_id)
                VALUES (%(id)s, %(bucket)s, %(object_key)s, %(source_path)s, %(collection_date)s, %(content_hash)s,
                    %(etag)s, %(size_bytes)s, %(row_count)s, %(source_schema)s, %(status)s, %(duplicate_of)s, %(run_id)s)
                ON CONFLICT (id) DO UPDATE SET status=excluded.status, duplicate_of=excluded.duplicate_of,
                    row_count=excluded.row_count, source_schema=excluded.source_schema,
                    loaded_run_id=excluded.loaded_run_id
            ''', values)

        if affected_matches:
            connection.execute('CREATE TEMP TABLE staged_events (LIKE events INCLUDING DEFAULTS) ON COMMIT DROP')
            # map_id and actor identity are staging-only fields, not repeated in every stored event.
            connection.execute('ALTER TABLE staged_events ADD COLUMN map_id text, ADD COLUMN user_id text, ADD COLUMN actor_type text')
            copy_sql = f"COPY staged_events ({', '.join(EVENT_COLUMNS)}) FROM STDIN WITH (FORMAT CSV, NULL '\\N')"
            with connection.cursor().copy(copy_sql) as copy:
                # Buffer at most one MiB; Spark has already stopped at this point.
                for path in sorted(event_files.glob('part-*.csv')):
                    with path.open('rb') as file:
                        for block in iter(lambda: file.read(1024 * 1024), b''):
                            copy.write(block)
            actual = connection.execute('SELECT count(*) AS count FROM staged_events').fetchone()['count']
            if actual != report['processed_rows']:
                raise ValueError('The staged database count disagrees with the validated Spark count.')

            connection.execute('''
                INSERT INTO matches (id, map_id, first_recorded_at, last_recorded_at, updated_run_id)
                SELECT match_id, min(map_id), min(occurred_at), max(occurred_at), %s FROM staged_events GROUP BY match_id
                ON CONFLICT (id) DO UPDATE SET map_id=excluded.map_id,
                    first_recorded_at=excluded.first_recorded_at, last_recorded_at=excluded.last_recorded_at,
                    updated_run_id=excluded.updated_run_id
            ''', (run_id,))
            connection.execute('''
                INSERT INTO match_participants (id, match_id, source_user_id, actor_type)
                SELECT DISTINCT participant_id, match_id, user_id, actor_type FROM staged_events
                ON CONFLICT (id) DO UPDATE SET source_user_id=excluded.source_user_id, actor_type=excluded.actor_type
            ''')
            connection.execute('DELETE FROM events WHERE match_id = ANY(%s)', (affected_matches,))
            stored_columns = EVENT_COLUMNS[:-3]
            names = ', '.join(stored_columns)
            connection.execute(f'INSERT INTO events ({names}) SELECT {names} FROM staged_events')
            # Publish catalogue counts in the same transaction as their events.
            # Rebuild every UTC slice, including cross-midnight recordings.
            connection.execute('DELETE FROM match_summaries WHERE match_id = ANY(%s)', (affected_matches,))
            connection.execute('''
                INSERT INTO match_summaries (match_id, event_date, event_count, humans, bots)
                SELECT match_id, event_date, count(*),
                    count(DISTINCT participant_id) FILTER (WHERE actor_type='human'),
                    count(DISTINCT participant_id) FILTER (WHERE actor_type='bot')
                FROM staged_events
                GROUP BY GROUPING SETS ((match_id), (match_id, event_date))
            ''')
        connection.execute('''UPDATE etl_runs SET status='succeeded', finished_at=now(), report=%s WHERE id=%s''', (Jsonb(report), run_id))
