"""Offline policies for post-legacy native Circle Card backup selection."""
import importlib.util
from pathlib import Path
from unittest.mock import patch,Mock
import unittest

p=Path(__file__).with_name("native-circle-card-db-backup.py")
spec=importlib.util.spec_from_file_location("circle_native_pg",p)
assert spec and spec.loader
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class NativeBackupPolicies(unittest.TestCase):
    def test_only_verified_release_service_pairs(self):
        self.assertEqual(set(m.RELEASE_BY_PORT),(3386,3387))
        self.assertIn("bransons-account",m.RELEASE_BY_PORT[3386][0])
        self.assertIn("ecosystem-20261112-002058",m.RELEASE_BY_PORT[3387][0])
        self.assertNotEqual(m.RELEASE_BY_PORT[3386],m.RELEASE_BY_PORT[3387])

    def test_requires_current_live_identity_even_if_pg_library_returns(self):
        fake=Mock()
        fake.guard_environment.return_value={"pid":3333,"disk_gib":7.0}
        fake.backup.return_value=None
        with patch.object(m,"discover_live",return_value=(3387,*m.RELEASE_BY_PORT[3387],3333)):
            with patch.object(m,"pg_core",return_value=fake):
                with patch("builtins.print") as say:
                    m.run_backup(create=False)
        self.assertTrue(say.called)
        fake.backup.assert_not_called()

    def test_backup_guard_rejects_changed_process(self):
        fake=Mock()
        fake.guard_environment.side_effect=lambda:{"pid":fake.check_live(),"disk_gib":7.0}
        state=[(3387,*m.RELEASE_BY_PORT[3387],3333),
               (3387,*m.RELEASE_BY_PORT[3387],4444)]
        with patch.object(m,"discover_live",side_effect=state):
            with patch.object(m,"pg_core",return_value=fake):
                with self.assertRaisesRegex(RuntimeError,"LIVE_BACKEND_CHANGED_DURING_BACKUP"):
                    m.run_backup(create=False)


if __name__=="__main__":
    unittest.main()
