"""Environment settings shared by the command-line entry points."""

from dataclasses import dataclass
from pathlib import Path
import os


PROJECT_ROOT = Path(__file__).resolve().parents[3]
RULE_VERSION = '2026-11-06-v2'


@dataclass(frozen=True)
class Settings:
    database_url: str
    storage_endpoint: str
    storage_access_key: str
    storage_secret_key: str
    storage_bucket: str
    storage_secure: bool = False
    dataset_year: int = 2026
    spark_master: str = 'local[2]'
    spark_driver_memory: str = '512m'

    @classmethod
    def from_environment(cls):
        return cls(
            # Neon pooling cannot preserve the ETL's session advisory lock.
            database_url=os.environ.get('DATABASE_URL_UNPOOLED') or os.environ.get('DATABASE_URL', ''),
            storage_endpoint=os.environ.get('S3_ENDPOINT', 'localhost:9000'),
            storage_access_key=os.environ.get('S3_ACCESS_KEY', ''),
            storage_secret_key=os.environ.get('S3_SECRET_KEY', ''),
            storage_bucket=os.environ.get('S3_BUCKET', 'lila-gameplay'),
            storage_secure=os.environ.get('S3_SECURE', 'false').lower() == 'true',
            dataset_year=int(os.environ.get('DATASET_YEAR', '2026')),
            spark_master=os.environ.get('SPARK_MASTER', 'local[2]'),
            spark_driver_memory=os.environ.get('SPARK_DRIVER_MEMORY', '512m'),
        )
