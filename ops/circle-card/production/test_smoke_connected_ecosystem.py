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

    def test_checks_reject_wrong_preconditions(self):
        with self.assertRaisesRegex(RuntimeError,"BAD_GUARD"):
            m.require(False,"BAD_GUARD")

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
