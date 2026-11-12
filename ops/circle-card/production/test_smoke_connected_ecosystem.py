"""Unit safety tests for temporary preview of Circle Card candidate."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

path=Path(__file__).with_name("smoke-connected-ecosystem.py")
spec=importlib.util.spec_from_file_location("circle_card_ecosystem_smoke",path)
assert spec and spec.loader
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PreviewTests(unittest.TestCase):
    def test_hard_pinned_service_and_no_public_port(self):
        self.assertEqual(m.OLD_PORT,3386)
        self.assertEqual(m.PORT,3387)
        self.assertEqual(m.STAGE.name,"circle-card-ecosystem-20261112-002058")
        self.assertEqual(m.UNIT_NAME,"circle-card-ecosystem-preview-20261112-002058.service")
        self.assertEqual(m.EXPECTED_PATCH,"eb668250c363376978fa9f2d9dc27b865e066032")

    def test_accepts_standard_compiled_next_build_without_standalone(self):
        import tempfile
        with tempfile.TemporaryDirectory() as root:
            stage=Path(root)
            compiled=stage/".next"
            (compiled/"server").mkdir(parents=True)
            (compiled/"BUILD_ID").write_text("test-build-id")
            (compiled/"server/app-paths-manifest.json").write_text("{}")
            self.assertEqual(m.find_compiled_build(stage),compiled)

    def test_rejects_incomplete_compiled_build(self):
        import tempfile
        with tempfile.TemporaryDirectory() as root:
            stage=Path(root)
            compiled=stage/".next"
            compiled.mkdir()
            (compiled/"BUILD_ID").write_text("test-build-id")
            with self.assertRaisesRegex(RuntimeError,"COMPILED_NEXT_BUILD_NOT_FOUND"):
                m.find_compiled_build(stage)

    def test_rejects_incomplete_standalone_when_present(self):
        import tempfile
        with tempfile.TemporaryDirectory() as root:
            stage=Path(root)
            compiled=stage/".next"
            (compiled/"server").mkdir(parents=True)
            (compiled/"standalone").mkdir()
            (compiled/"BUILD_ID").write_text("test-build-id")
            (compiled/"server/app-paths-manifest.json").write_text("{}")
            with self.assertRaisesRegex(RuntimeError,"STANDALONE_SERVER_INCOMPLETE"):
                m.find_compiled_build(stage)

    def test_checks_reject_wrong_preconditions(self):
        with self.assertRaisesRegex(RuntimeError,"BAD_GUARD"):
            m.require(False,"BAD_GUARD")

    def test_wait_for_listener_readiness_after_systemd_start(self):
        with patch.object(m,"preview_listening_addresses",
                          side_effect=[[], [], ["127.0.0.1:3387"]]) as listing:
            with patch.object(m.time,"sleep") as sleeping:
                result=m.wait_for_safe_preview_listener(attempts=4,delay=1)
        self.assertEqual(result,["127.0.0.1:3387"])
        self.assertEqual(listing.call_count,3)
        self.assertEqual(sleeping.call_count,2)

    def test_rejects_public_or_wildcard_preview_bind(self):
        for address in ("0.0.0.0:3387","[::]:3387","*:3387","10.0.0.1:3387"):
            with self.subTest(address=address):
                with patch.object(m,"preview_listening_addresses",return_value=[address]):
                    with self.assertRaisesRegex(RuntimeError,"PREVIEW_BOUND_TO_NON_LOOPBACK_ADDRESS"):
                        m.wait_for_safe_preview_listener(attempts=1)

    def test_reports_listener_missing_after_readiness_window(self):
        with patch.object(m,"preview_listening_addresses",return_value=[]):
            with self.assertRaisesRegex(RuntimeError,"PREVIEW_NO_LISTENER_AFTER_START"):
                m.wait_for_safe_preview_listener(attempts=1)

    def test_ss_parser_checks_local_endpoint_not_peer_column(self):
        class Result:
            returncode=0
            stdout=("LISTEN 0 511 127.0.0.1:3387 0.0.0.0:*\n"
                    "LISTEN 0 511 0.0.0.0:3386 0.0.0.0:*\n")
        with patch.object(m,"run",return_value=Result()):
            self.assertEqual(m.preview_listening_addresses(),["127.0.0.1:3387"])

    def test_preview_launcher_forces_next_cli_loopback_hostname(self):
        source="childArgs=['next','start','-p','3387']"
        rewritten=m.enforce_loopback_next_start(source)
        self.assertIn("'-p','3387','-H','127.0.0.1'",rewritten)
        self.assertEqual(rewritten.count("'-H','127.0.0.1'"),1)
        self.assertEqual(m.enforce_loopback_next_start(rewritten),rewritten)

    def test_preview_launcher_refuses_public_hostname(self):
        source="childArgs=['next','start','-p','3387','-H','0.0.0.0']"
        with self.assertRaisesRegex(RuntimeError,"PREVIEW_HOSTNAME_FLAG_UNRECOGNISED"):
            m.enforce_loopback_next_start(source)

    def test_preview_launcher_refuses_conflicting_hostname(self):
        source="childArgs=['next','start','-p','3387','-H','127.0.0.1','-H','0.0.0.0']"
        with self.assertRaisesRegex(RuntimeError,"PREVIEW_UNSAFE_EXPLICIT_HOSTNAME"):
            m.enforce_loopback_next_start(source)

    def test_diagnostic_captures_only_safe_http_details(self):
        class Response:
            status=307
            def getheader(self,name):
                return "https://circlecard.co.uk/login?token=never-print-this-secret"
            def read(self,limit):
                return b"Redirecting"
        class Connection:
            closed=False
            def request(self,*args,**kwargs):
                pass
            def getresponse(self):
                return Response()
            def close(self):
                self.closed=True
        instance=Connection()
        with patch.object(m.http.client,"HTTPConnection",return_value=instance):
            result=m.preview_http_diagnosis("/login")
        self.assertEqual(result["status"],307)
        self.assertEqual(result["redirect_scope"],"public_site")
        self.assertNotIn("never-print-this-secret",str(result))
        self.assertTrue(instance.closed)

    def test_journal_classifies_errors_without_returning_raw_logs(self):
        class Result:
            returncode=0
            stdout="Error: Cannot find module secret_user/keys.json; P1001 database auth failure"
        with patch.object(m,"run",return_value=Result()):
            result=m.preview_journal_signals()
        self.assertIn("MISSING_NODE_MODULE",result)
        self.assertIn("DATABASE_CONNECTION",result)
        self.assertNotIn("secret_user",str(result))

    def test_http_diagnostic_reports_transport_error_class_only(self):
        class Connection:
            def request(self,*args,**kwargs):
                raise ConnectionRefusedError("secret-password")
            def close(self):
                pass
        with patch.object(m.http.client,"HTTPConnection",return_value=Connection()):
            result=m.preview_http_diagnosis("/login")
        self.assertIsNone(result["status"])
        self.assertEqual(result["transport_error_type"],"ConnectionRefusedError")
        self.assertNotIn("secret-password",str(result))

    def test_anonymous_get_closes_connection(self):
        class DummyResponse:
            status=200
            def read(self,limit):
                return b"ok"
        class DummyConnection:
            closed=False
            args=None
            def __init__(self,*args,**kwargs):
                self.args=args
            def request(self,method,path,headers):
                self.method=method
                self.path=path
                self.headers=headers
            def getresponse(self):
                return DummyResponse()
            def close(self):
                self.closed=True
        sample=DummyConnection()
        with patch.object(m.http.client,"HTTPConnection",return_value=sample):
            self.assertEqual(m.request("/circle-card/pro"),(200,b"ok"))
        self.assertEqual(sample.method,"GET")
        self.assertEqual(sample.path,"/circle-card/pro")
        self.assertEqual(sample.headers["Host"],"circlecard.co.uk")
        self.assertTrue(sample.closed)


if __name__=="__main__":
    unittest.main()
