"""Date-organized uploads, immutable source archives, and per-run output files."""

from datetime import datetime
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import time
from uuid import NAMESPACE_URL, uuid5

from minio import Minio
from minio.error import S3Error

from .config import Settings


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def collection_date(source_path: str, year: int):
    folder = PurePosixPath(source_path).parts[0]
    try:
        return datetime.strptime(folder, '%Y-%m-%d').date()
    except ValueError:
        return datetime.strptime(f'{year}_{folder}', '%Y_%B_%d').date()


def source_identity(bucket: str, object_key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f'lila-source:{bucket}/{object_key}'))


def recording_identity(source_path: str) -> tuple[str, str]:
    if '..' in PurePosixPath(source_path).parts:
        raise ValueError(f'Invalid source path: {source_path}')
    filename = PurePosixPath(source_path).name
    if '_' not in filename or not filename.endswith(('.nakama-0', '.parquet')):
        raise ValueError(f'Invalid recording filename: {filename}')
    actor_id, match_id = filename.split('_', 1)
    return actor_id, match_id.removesuffix('.parquet')


class ObjectStore:
    def __init__(self, settings: Settings):
        self.bucket = settings.storage_bucket
        self.client = Minio(
            settings.storage_endpoint,
            access_key=settings.storage_access_key,
            secret_key=settings.storage_secret_key,
            secure=settings.storage_secure,
        )

    def ensure_bucket(self):
        # Check real S3 access, including credentials, before declaring readiness.
        for attempt in range(30):
            try:
                if not self.client.bucket_exists(self.bucket):
                    self.client.make_bucket(self.bucket)
                return
            except Exception:
                if attempt == 29:
                    raise
                time.sleep(2)

    def upload_sources(self, directory: Path) -> dict:
        """Optional local/demo loader. Production uploaders can write to S3 directly."""
        existing = {item.object_name for item in self.client.list_objects(self.bucket, prefix='landing/', recursive=True)}
        uploaded = skipped = 0
        for path in sorted(directory.rglob('*')):
            if not path.is_file() or path.suffix not in ('.nakama-0', '.parquet'):
                continue
            relative_path = path.relative_to(directory).as_posix()
            key = f'landing/{relative_path}'
            if key in existing and self.object_hash(key) == file_hash(path):
                skipped += 1
                continue
            self.client.fput_object(self.bucket, key, str(path), content_type='application/octet-stream')
            uploaded += 1
        return {'uploaded_files': uploaded, 'unchanged_files': skipped}

    def object_hash(self, key: str) -> str:
        response = self.client.get_object(self.bucket, key)
        try:
            digest = hashlib.sha256()
            for block in response.stream(1024 * 1024):
                digest.update(block)
            return digest.hexdigest()
        finally:
            response.close()
            response.release_conn()

    def list_landing_sources(self, year: int) -> list[dict]:
        files = []
        for item in self.client.list_objects(self.bucket, prefix='landing/', recursive=True):
            if not item.object_name.endswith(('.nakama-0', '.parquet')):
                continue
            source_path = item.object_name.removeprefix('landing/')
            if len(PurePosixPath(source_path).parts) < 2:
                raise ValueError(f'Landing recordings need a date folder: {item.object_name}')
            recording_identity(source_path)
            files.append({
                'id': source_identity(self.bucket, item.object_name),
                'object_key': item.object_name,
                'source_path': source_path,
                'folder_date': collection_date(source_path, year).isoformat(),
                'etag': item.etag,
                'size_bytes': item.size,
            })
        return files

    def download_landing(self, source: dict, directory: Path) -> Path:
        path = directory / f"{source['id']}.parquet"
        # Reject a concurrent replacement instead of checking one version and
        # archiving another. All subsequent work uses these exact local bytes.
        self.client.fget_object(self.bucket, source['object_key'], str(path),
                               request_headers={'If-Match': f'"{source["etag"]}"'})
        if path.stat().st_size != source['size_bytes']:
            raise ValueError(f"Landing object size changed: {source['object_key']}")
        return path

    def read_landing_manifest(self) -> dict:
        try:
            response = self.client.get_object(self.bucket, 'manifests/landing.json')
        except S3Error as error:
            if error.code == 'NoSuchKey':
                return {'files': {}}
            raise
        try:
            return json.loads(response.read())
        finally:
            response.close()
            response.release_conn()

    def write_landing_manifest(self, manifest: dict):
        self.write_json('manifests/landing.json', manifest)

    def list_sources(self) -> list[dict]:
        files = []
        for item in self.client.list_objects(self.bucket, prefix='raw/', recursive=True):
            parts = item.object_name.split('/', 2)
            if len(parts) != 3 or len(parts[1]) != 64:
                raise ValueError(f'Unexpected raw object key: {item.object_name}. Use the upload command.')
            source_path = parts[2]
            actor_id, match_id = recording_identity(source_path)
            files.append({
                'id': source_identity(self.bucket, item.object_name),
                'bucket': self.bucket,
                'object_key': item.object_name,
                'source_path': source_path,
                'content_hash': parts[1],
                'etag': item.etag,
                'size_bytes': item.size,
                'expected_user_id': actor_id,
                'expected_match_id': match_id,
            })
        return files

    def download(self, source: dict, directory: Path) -> Path:
        path = directory / f"{source['id']}.parquet"
        self.client.fget_object(self.bucket, source['object_key'], str(path))
        if file_hash(path) != source['content_hash']:
            raise ValueError(f"Object contents no longer match its hash: {source['source_path']}")
        return path

    def upload_directory(self, directory: Path, prefix: str):
        for path in sorted(directory.rglob('*')):
            if path.is_file() and not path.name.startswith('.'):
                key = f'{prefix}/{path.relative_to(directory).as_posix()}'
                self.client.fput_object(self.bucket, key, str(path))

    def write_report(self, run_id: str, report: dict):
        self.write_json(f'reports/{run_id}.json', report)

    def write_json(self, key: str, value: dict):
        content = json.dumps(value, indent=2, default=str).encode()
        self.client.put_object(self.bucket, key, io.BytesIO(content), len(content), content_type='application/json')
