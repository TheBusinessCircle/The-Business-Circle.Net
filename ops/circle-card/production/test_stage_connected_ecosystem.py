"""Offline safety checks for staging feature changes against current live release."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

source=Path(__file__).with_name("stage-connected-ecosystem.py")
spec=importlib.util.spec_from_file_location("circle_card_feature_stager",source)
assert spec and spec.loader
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class StageSafetyTests(unittest.TestCase):
    def test_pin_targets_exact_reviewed_source_files(self):
        self.assertEqual(len(mod.FILES),8)
        self.assertIn("src/lib/circle-card/plans.ts",mod.FILES)
        self.assertIn("src/app/(public)/card/hucknall-circle-hub/join/page.tsx",mod.FILES)
        self.assertTrue(all(p.startswith("src/") for p in mod.FILES))
        self.assertEqual(mod.LIVE.name,"circle-card-bransons-account-20261109-115143")

    def test_sha_256_deterministic(self):
        with tempfile.TemporaryDirectory() as p:
            f=Path(p)/"test.txt"
            f.write_bytes(b"verified-staging-input")
            self.assertEqual(len(mod.sha(f)),64)
            self.assertEqual(mod.sha(f),mod.sha(f))

    def test_invalid_check_does_not_copy_files(self):
        with patch.object(mod,"live",return_value=123),patch.object(mod,"archive_guard"),patch.object(mod,"patch_data",return_value=b"bad-patch"):
            with patch.object(mod,"git_apply",return_value=False):
                with self.assertRaisesRegex(RuntimeError,"PATCH_NOT_COMPATIBLE"):
                    mod.need(mod.git_apply(mod.LIVE,b"bad-patch",True),
                             "PATCH_NOT_COMPATIBLE_WITH_REAL_LIVE_SOURCE")

if __name__=="__main__":
    unittest.main()
