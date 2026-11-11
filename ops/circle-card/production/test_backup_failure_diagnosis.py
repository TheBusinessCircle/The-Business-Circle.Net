"""Safe unit tests for read-only PostgreSQL backup failure diagnosis."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

filename = Path(__file__).with_name("backup-failure-diagnosis.py")
spec = importlib.util.spec_from_file_location("circle_backup_failure_diag", filename)
assert spec is not None and spec.loader is not None
diag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(diag)


class DiagnosticTests(unittest.TestCase):
    def test_error_signals_no_raw_text_or_secrets(self):
        raw = b'pg_dump: error: FATAL password authentication failed for user "secret_identity"'
        flags = diag.error_signals(raw)
        self.assertIn("password_or_authentication", flags)
        self.assertIn("postgres_fatal", flags)
        self.assertFalse(any("secret_identity" in flag for flag in flags))

    def test_schema_probe_does_not_write_output_to_disk(self):
        class Result:
            returncode = 0
            stderr = b""
        with patch.object(diag.subprocess, "run", return_value=Result()) as mocked:
            output = diag.probe_schema_dump("postgresql://u:p@localhost/test", "pg_dump")
        self.assertEqual(output["result"], "SCHEMA_ONLY_SUCCESS")
        argv = mocked.call_args.args[0]
        self.assertIn("--schema-only", argv)
        self.assertIn("--file=/dev/null", argv)
        self.assertNotIn("--data-only", argv)
        self.assertEqual(mocked.call_args.kwargs["env"]["PGDATABASE"],
                         "postgresql://u:p@localhost/test")

    def test_query_version_accepts_numeric_result_only(self):
        class Result:
            returncode = 0
            stdout = b"160010\n"
            stderr = b""
        with patch.object(diag.subprocess, "run", return_value=Result()):
            output = diag.query_version("postgresql://u:p@localhost/test", "psql")
        self.assertEqual(output["server_major"], 16)
        self.assertEqual(output["server_version_num"], 160010)


if __name__ == "__main__":
    unittest.main()
