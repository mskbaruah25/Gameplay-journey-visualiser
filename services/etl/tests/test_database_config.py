"""Keep ingestion on a persistent session when the web app uses Neon pooling."""

import os
import unittest
from unittest.mock import patch

from lila_etl.config import Settings
from lila_etl.database import connect


POOLED = 'postgresql://example:example@ep-example-pooler.us-east-2.aws.neon.tech/lila?sslmode=require'
DIRECT = 'postgresql://example:example@ep-example.us-east-2.aws.neon.tech/lila?sslmode=require'
LOCAL = 'postgresql://lila:example@postgres:5432/lila'


class DatabaseConfigurationTests(unittest.TestCase):
    def test_ingestion_uses_direct_url_when_web_uses_pooling(self):
        with patch.dict(os.environ, {'DATABASE_URL': POOLED, 'DATABASE_URL_UNPOOLED': DIRECT}, clear=True):
            self.assertEqual(Settings.from_environment().database_url, DIRECT)

    def test_local_database_does_not_require_a_second_url(self):
        with patch.dict(os.environ, {'DATABASE_URL': LOCAL, 'DATABASE_URL_UNPOOLED': ''}, clear=True):
            self.assertEqual(Settings.from_environment().database_url, LOCAL)

    def test_pooled_neon_url_is_rejected_before_opening_a_session(self):
        with patch('lila_etl.database.psycopg.connect') as open_connection:
            with self.assertRaisesRegex(ValueError, 'DATABASE_URL_UNPOOLED'):
                connect(POOLED)
            open_connection.assert_not_called()
