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

    def test_backup_mode_guarded_by_precheck(self):
        self.assertFalse("database" in script.LIVE_SERVICE.lower())
        with patch.object(script, "check_live", side_effect=RuntimeError("inactive")):
            with self.assertRaises(RuntimeError):
                script.guard_environment()


if __name__ == "__main__":
    unittest.main()
