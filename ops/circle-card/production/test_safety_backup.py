"""Unit safety tests for one-shot PostgreSQL backup. Does not read VPS data."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

filename = Path(__file__).with_name("one-shot-safety-backup.py")
spec = importlib.util.spec_from_file_location("circle_safety_backup", filename)
assert spec is not None and spec.loader is not None
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)


class BackupSafetyTests(unittest.TestCase):
    def test_strips_prisma_only_query_parameter(self):
        input_url = "postgresql://example:password@localhost:5432/circlecard?schema=public&sslmode=require&connection_limit=10"
        result = script.sanitized_pg_url(input_url)
        self.assertEqual(result, "postgresql://example:password@localhost:5432/circlecard?sslmode=require")

    def test_refuses_unsupported_query_option(self):
        with self.assertRaises(RuntimeError):
            script.sanitized_pg_url("postgresql://u:p@localhost/circle?unexpected=value")

    def test_refuses_incorrect_type(self):
        with self.assertRaises(RuntimeError):
            script.sanitized_pg_url("mysql://u:p@localhost/circle")

    def test_refuses_missing_database(self):
        with self.assertRaises(RuntimeError):
            script.sanitized_pg_url("postgres://u:p@localhost/")

    def test_libpq_url_components_are_used_instead_of_database_uri(self):
        uri = "postgresql://test%40user:p%40ss%3Aword@db.internal:5543/circle_card?schema=public&sslmode=require"
        with patch.dict("os.environ", {"PGHOST": "wrong.example", "PGUSER": "root", "PGDATABASE": "wrong"}, clear=False):
            env = script.libpq_environment(uri)
        self.assertEqual(env["PGHOST"], "db.internal")
        self.assertEqual(env["PGPORT"], "5543")
        self.assertEqual(env["PGUSER"], "test@user")
        self.assertEqual(env["PGPASSWORD"], "p@ss:word")
        self.assertEqual(env["PGDATABASE"], "circle_card")
        self.assertEqual(env["PGSSLMODE"], "require")
        self.assertNotIn("schema", env)
        self.assertNotIn("postgresql://", env["PGDATABASE"])

    def test_unexpected_connection_options_still_fail_closed(self):
        with self.assertRaises(RuntimeError):
            script.libpq_environment("postgresql://user:password@host/db?rogue=1")

    def test_pg_dump_errors_are_classified_without_secret_strings(self):
        cases = {
            b"pg_dump: error: aborting because of server version mismatch": "SERVER_CLIENT_VERSION_MISMATCH",
            b"password authentication failed for user private_user": "AUTHENTICATION_FAILED",
            b"pg_dump: error: unrecognized option --bad": "POSTGRES_CLIENT_OPTION",
            b"pg_dump: error: permission denied for table customer_private_data": "BACKUP_ROLE_PERMISSION",
            b"pg_dump: error: database \"private\" does not exist": "DATABASE_NOT_FOUND",
            b"unknown detail featuring private_token_abc": "UNKNOWN_PG_DUMP_ERROR",
        }
        for message, expected in cases.items():
            with self.subTest(expected=expected):
                self.assertEqual(script.classify_pg_dump_failure(message), expected)

    def test_version_parser_and_client_inventory_are_numeric(self):
        class MockResult:
            returncode = 0
            stdout = "pg_dump (PostgreSQL) 16.11"
        with patch.object(script, "run", return_value=MockResult()):
            self.assertEqual(script.safe_version("/usr/lib/postgresql/16/bin/pg_dump"), "16.11")

    def test_backup_mode_guarded_by_precheck(self):
        self.assertFalse("database" in script.LIVE_SERVICE.lower())
        with patch.object(script, "check_live", side_effect=RuntimeError("inactive")):
            with self.assertRaises(RuntimeError):
                script.guard_environment()


if __name__ == "__main__":
    unittest.main()
