"""Safety checks for the temporary, no-network Circle Card PostgreSQL restore."""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

target=Path(__file__).with_name("isolated-restore-check.py")
spec=importlib.util.spec_from_file_location("isolated_circle_card_restore", target)
assert spec is not None and spec.loader is not None
restore=importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


class IsolatedRestoreSafetyTests(unittest.TestCase):
    def test_archive_is_exact_and_pinned(self):
        self.assertEqual(restore.ARCHIVE.name, "circle-card-db-20261111T232300Z.dump")
        self.assertEqual(len(restore.EXPECTED_HASH), 64)
        self.assertEqual(restore.PG_BIN, Path("/usr/lib/postgresql/14/bin"))
        self.assertNotEqual(restore.RESTORE_NAME, "circle_card")

    def test_sandbox_environment_drops_all_inherited_pg_credentials(self):
        with patch.dict(os.environ, {
            "PGHOST": "production-sensitive-host",
            "PGPASSWORD": "production-secret",
            "PGDATABASE": "production-sensitive-db",
            "UNRELATED_SAFE": "1",
        }, clear=True):
            env=restore.local_environment(Path("/var/tmp/private-test/socket"))
        self.assertEqual(env["PGHOST"], "/var/tmp/private-test/socket")
        self.assertEqual(env["PGPORT"], restore.PG_PORT)
        self.assertEqual(env["PGUSER"], "postgres")
        self.assertEqual(env["PGDATABASE"], "postgres")
        self.assertEqual(env["UNRELATED_SAFE"], "1")
        self.assertNotIn("PGPASSWORD", env)
        self.assertNotIn("production-sensitive-host", str(env))

    def test_live_release_guard_is_read_only(self):
        self.assertTrue(restore.EXPECTED_SERVICE.endswith(".service"))
        self.assertTrue(restore.RESTORE_NAME.startswith("circle_card_restore_"))


if __name__=="__main__":
    unittest.main()
