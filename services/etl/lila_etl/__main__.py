"""Run with python -m lila_etl. Commands do one visible job each."""

import argparse
import json
import logging
from pathlib import Path

from .config import Settings
from .database import connect, migrate
from .pipeline import run_pipeline
from .storage import ObjectStore


def main():
    parser = argparse.ArgumentParser(description='LILA gameplay ingestion')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('init-storage', help='Wait for S3 access and create the private bucket if absent')
    commands.add_parser('migrate', help='Create the six tables and seed map configuration')
    upload = commands.add_parser('upload', help='Upload original Parquet files to date folders in Landing')
    upload.add_argument('directory', type=Path)
    run = commands.add_parser('run', help='Process new files and rebuild affected matches')
    run.add_argument('--rebuild', action='store_true', help='Reprocess all matches under the current rules')
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')
    settings = Settings.from_environment()
    if args.command == 'migrate':
        with connect(settings.database_url) as connection:
            migrate(connection)
        result = {'status': 'migrated'}
    elif args.command == 'init-storage':
        ObjectStore(settings).ensure_bucket()
        result = {'status': 'ready', 'bucket': settings.storage_bucket}
    elif args.command == 'upload':
        if not args.directory.is_dir():
            parser.error(f'Input directory does not exist: {args.directory}')
        store = ObjectStore(settings)
        store.ensure_bucket()
        result = store.upload_sources(args.directory)
    else:
        result = run_pipeline(settings, args.rebuild)
    print(json.dumps(result, indent=2, default=str))


if __name__ == '__main__':
    main()
