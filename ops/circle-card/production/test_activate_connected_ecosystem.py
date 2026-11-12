"""Offline safety tests for activating the already validated Circle Card candidate."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

p=Path(__file__).with_name("activate-connected-ecosystem.py")
spec=importlib.util.spec_from_file_location("circle_card_ecosystem_activate",p)
assert spec is not None and spec.loader is not None
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EcosystemActivationTests(unittest.TestCase):
    def test_pinned_release_and_rollback_service(self):
        self.assertEqual(m.STAGE.name,"circle-card-ecosystem-20261112-002058")
        self.assertEqual(m.NEW_UNIT,"circle-card-ecosystem-20261112-002058.service")
        self.assertEqual(m.OLD_UNIT,"circle-card-bransons-account-20261109-115143.service")
        self.assertNotEqual(m.NEW_UNIT,m.OLD_UNIT)
        self.assertEqual(m.SAVED_PATCH_REF,"eb668250c363376978fa9f2d9dc27b865e066032")
        self.assertTrue(m.NGINX_BACKUP.name.endswith(".conf"))

    def test_nginx_rewrite_changes_only_verified_public_port_and_release_aliases(self):
        original=(
            b"server_name circlecard.co.uk;\n"
            b"location / { proxy_pass http://127.0.0.1:3386; }\n"
            +str(m.LIVE).encode()+b"/public/;\n"
            +b"other_backend http://127.0.0.1:3000;\n"
        )
        updated=m.nginx_switched_content(original)
        self.assertEqual(updated.count(b"proxy_pass http://127.0.0.1:3387;"),1)
        self.assertNotIn(b"proxy_pass http://127.0.0.1:3386;",updated)
        self.assertIn(str(m.STAGE).encode()+b"/public/",updated)
        self.assertIn(b"127.0.0.1:3000",updated)

    def test_nginx_rewrite_rejects_unverified_double_proxy(self):
        original=b"proxy_pass http://127.0.0.1:3386;\n"*2
        with self.assertRaisesRegex(RuntimeError,"NGINX_PROXY_NO_LONGER_EXPECTED"):
            m.nginx_switched_content(original)

    def test_public_route_requires_feature_marker(self):
        good=Mock()
        good.request.return_value=(200,b"Unlimited standard links")
        self.assertTrue(m.request_checked(good,"/circle-card/pro",marker=b"Unlimited standard links"))
        bad=Mock()
        bad.request.return_value=(200,b"Something else")
        with self.assertRaisesRegex(RuntimeError,"CANDIDATE_PUBLIC_FEATURE_NOT_RENDERED"):
            m.request_checked(bad,"/circle-card/pro",marker=b"Unlimited standard links")

    def test_public_route_rejects_http_errors(self):
        bad=Mock()
        bad.request.return_value=(503,b"Down")
        with self.assertRaisesRegex(RuntimeError,"CANDIDATE_HTTP_STATUS_INVALID"):
            m.request_checked(bad,"/circle-card/pro")

    def test_atomic_nginx_write_preserves_mode(self):
        with tempfile.TemporaryDirectory() as t:
            path=Path(t)/"nginx.test"
            path.write_bytes(b"original")
            path.chmod(0o640)
            from unittest.mock import patch
            with patch.object(m.os,"chown"):
                m.nginx_write(b"replacement",path)
            self.assertEqual(path.read_bytes(),b"replacement")
            self.assertEqual(path.stat().st_mode & 0o777,0o640)

    def test_release_script_never_references_legacy_registry_write(self):
        source=p.read_text()
        self.assertNotIn("PUBLIC_VERIFIED",source)
        self.assertNotIn("prisma migrate",source)
        self.assertIn("FRESH_VERIFIED_DB_BACKUP_REQUIRED",source)
        self.assertIn("rollback_nginx",source)


if __name__=="__main__":
    unittest.main()
