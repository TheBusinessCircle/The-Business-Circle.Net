"""Offline checks for adopting the prestarted corrected Circle Card release."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch

p=Path(__file__).with_name("finish-interrupted-ecosystem-release.py")
spec=importlib.util.spec_from_file_location("circle_card_finish_interrupted",p)
assert spec is not None and spec.loader
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class InterruptedReleaseTests(unittest.TestCase):
    def test_exact_correction_and_locked_library_required(self):
        self.assertEqual(m.APPROVED_BUILD_ID,"IlUYNmvKirPq-sFwpeimH")
        source=p.read_text()
        self.assertIn('NEW_UNIT_NOT_BOUND_TO_CORRECTED_LAUNCHER',source)
        self.assertIn("CANDIDATE_NOT_LOOPBACK_ONLY",source)
        self.assertIn("EXISTING_NGINX_ROLLBACK_BACKUP_MISMATCH",source)
        self.assertIn("CORRECTED_APPROVED_BUILD_NOT_INSTALLED",source)
        self.assertIn("RELEASE_ACTIVATION_RECORD_ALREADY_PRESENT",source)
        self.assertNotIn("systemctl stop",source)
        self.assertNotIn("prisma migrate",source)
        self.assertNotIn("pg_dump --file",source)
        self.assertIn("old_rollback_unit_preserved",source)

    def test_verifies_private_listener_only(self):
        core=Mock()
        core.cmd.return_value=Mock(returncode=0,stdout="LISTEN 0 511 127.0.0.1:3387 0.0.0.0:*")
        self.assertEqual(m.listener_addresses(core),["127.0.0.1:3387"])
        core.cmd.return_value=Mock(returncode=0,stdout="LISTEN 0 511 0.0.0.0:3387 0.0.0.0:*")
        with self.assertRaisesRegex(RuntimeError,"CANDIDATE_NOT_LOOPBACK_ONLY"):
            m.listener_addresses(core)

    def _fake_core(self,temporary):
        temp=Path(temporary)
        core=Mock()
        core.DEPLOYMENT=temp/"release-activation.json"
        core.OLD_UNIT="old.service"
        core.NEW_UNIT="new.service"
        core.STAGE=temp/"candidate"
        core.LIVE=temp/"old"
        core.NGINX_BACKUP=temp/"prior-nginx.conf"
        core.SAVED_PATCH_REF="approvedpatch"
        core.NEW_UNIT_PATH=temp/"unit"
        core.PREVIOUS_APP_ARCHIVE=temp/"app.tar.gz"
        core.vhost_path.return_value=temp/"nginx.conf"
        (temp/"nginx.conf").write_bytes(b"proxy_pass http://127.0.0.1:3386;")
        core.nginx_switched_content.return_value=b"proxy_pass http://127.0.0.1:3387;"
        core.nginx_write.side_effect=lambda data,target:target.write_bytes(data)
        core.cmd.return_value=Mock(returncode=0,stdout="")
        core.expected_process.return_value=True
        core.props.side_effect=lambda unit:{"MainPID":"123" if unit==core.NEW_UNIT else "456"}
        return core

    def test_failure_after_switch_rolls_back_previous_nginx(self):
        with tempfile.TemporaryDirectory() as d:
            core=self._fake_core(d)
            original=core.vhost_path().read_bytes()
            core.rollback_nginx.side_effect=lambda target,previous:target.write_bytes(previous) or True
            context={"core":core,"target":core.vhost_path(),"original":original,
                     "db":{"latest_verified_db_dump":"/private/backup.dump",
                           "created_utc":"2026-11-12T15:58:00Z"},
                     "old_pid":"456","new_pid":"123"}
            with patch.object(m,"core_module",return_value=core),\
                 patch.object(m,"verified_existing_components",return_value=context),\
                 patch.object(m,"public_https_health",side_effect=RuntimeError("POST_SWITCH_PUBLIC_HTTPS_HEALTH_FAILED")):
                with self.assertRaisesRegex(RuntimeError,"POST_SWITCH_PUBLIC_HTTPS_HEALTH_FAILED"):
                    m.finish()
            self.assertEqual(core.vhost_path().read_bytes(),original)
            self.assertFalse(core.DEPLOYMENT.exists())

    def test_success_persists_core_rollback_compatible_receipt(self):
        with tempfile.TemporaryDirectory() as d:
            core=self._fake_core(d)
            original=core.vhost_path().read_bytes()
            context={"core":core,"target":core.vhost_path(),"original":original,
                     "db":{"latest_verified_db_dump":"/private/backup.dump",
                           "created_utc":"2026-11-12T15:58:00Z"},
                     "old_pid":"456","new_pid":"123"}
            with patch.object(m,"core_module",return_value=core),\
                 patch.object(m,"verified_existing_components",return_value=context),\
                 patch.object(m,"public_https_health"):
                with patch("builtins.print"):
                    m.finish()
            import json
            record=json.loads(core.DEPLOYMENT.read_text())
            self.assertEqual(record["result"],"CONNECTED_ECOSYSTEM_PUBLIC_RELEASE_ACTIVATED")
            self.assertEqual(record["approved_build_id"],m.APPROVED_BUILD_ID)
            self.assertEqual(record["nginx_previous_sha256"],__import__("hashlib").sha256(original).hexdigest())
            self.assertTrue(record["old_rollback_unit_preserved"])
            self.assertEqual(core.vhost_path().read_bytes(),b"proxy_pass http://127.0.0.1:3387;")


if __name__=="__main__":
    unittest.main()
