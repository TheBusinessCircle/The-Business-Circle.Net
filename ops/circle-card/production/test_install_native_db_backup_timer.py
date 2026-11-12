"""Offline boundaries for independent native Circle Card daily DB backup timer."""
import importlib.util
from pathlib import Path
from unittest.mock import patch,Mock
import unittest

p=Path(__file__).with_name("install-native-db-backup-timer.py")
spec=importlib.util.spec_from_file_location("circle_native_db_timer",p)
assert spec and spec.loader
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class TimerSafetyTests(unittest.TestCase):
    def test_old_timer_is_not_changed_by_new_timer_installer(self):
        text=p.read_text()
        self.assertNotIn("disable --now circle-card-recovery.timer",text)
        self.assertNotIn("systemctl stop circle-card-recovery.timer",text)
        self.assertIn("legacy_recovery_timer_untouched",text)
        self.assertNotIn("PUBLIC_VERIFIED",text)

    def test_pins_native_runner_to_known_paths(self):
        self.assertEqual(m.TIMER,"circle-card-native-db-backup.timer")
        self.assertEqual(m.SERVICE,"circle-card-native-db-backup.service")
        self.assertEqual(m.SCRIPTS["pg_dump_core.py"],"one-shot-safety-backup.py")
        self.assertTrue(str(m.ROOT).startswith("/opt/"))

    def test_private_root_guard_must_pass_before_writes(self):
        with patch.object(m,"sources",side_effect=RuntimeError("TEST_PREFLIGHT_FAIL")):
            with self.assertRaisesRegex(RuntimeError,"TEST_PREFLIGHT_FAIL"):
                m.install()


if __name__=="__main__":
    unittest.main()
