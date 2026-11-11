"""Portable safety checks for live application archiving."""
import importlib.util
from pathlib import Path
import tarfile
import unittest
from unittest.mock import patch

p=Path(__file__).with_name("live-app-safety-archive.py")
spec=importlib.util.spec_from_file_location("circle_card_app_safety_archive",p)
assert spec and spec.loader
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class LiveAppArchiveTests(unittest.TestCase):
    def test_pinned_release_identity(self):
        self.assertEqual(m.LIVE.name, "circle-card-bransons-account-20261109-115143")
        self.assertEqual(m.RECEIPT.name, "deployment.json")
        self.assertEqual(m.SERVICE, "circle-card-bransons-account-20261109-115143.service")
        self.assertTrue(m.ROOT.name == "circle-card-safety")

    def test_filter_rejects_special_files(self):
        for typ in (tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.FIFOTYPE):
            with self.subTest(type=typ):
                info=tarfile.TarInfo(name="unsafe")
                info.type=typ
                with self.assertRaises(RuntimeError):
                    m.filter_item(info)

    def test_filter_allows_regular_files_and_symlinks(self):
        for typ in (tarfile.REGTYPE,tarfile.SYMTYPE):
            info=tarfile.TarInfo(name="regular")
            info.type=typ
            self.assertIs(m.filter_item(info), info)

    def test_check_is_pinned_to_actually_live_service(self):
        with patch.object(m.os, "geteuid", return_value=0):
            with patch.object(m, "status", return_value={"ActiveState":"inactive",
                           "MainPID":"0","WorkingDirectory":str(m.LIVE)}):
                with self.assertRaisesRegex(RuntimeError,"LIVE_SERVICE_MISMATCH"):
                    m.sources()


if __name__=="__main__":
    unittest.main()
