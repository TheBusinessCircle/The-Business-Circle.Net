"""Offline unit tests for full-stream application archive verification."""
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

path = Path(__file__).with_name("verify-app-archive-stream.py")
spec = importlib.util.spec_from_file_location("circle_app_archive_verifier", path)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArchiveStreamTests(unittest.TestCase):
    def test_rejects_tar_path_traversal(self):
        for value in ("/etc/passwd", "../outside", "var/../../etc/passwd", "a\\b", ""):
            with self.subTest(path=value):
                self.assertFalse(module.safe_member_path(value))
        self.assertTrue(module.safe_member_path("var/www/releases/circle-card-bransons-account-20261109-115143/package.json"))

    def test_archive_identity_is_pinned(self):
        self.assertEqual(len(module.EXPECTED_SHA256), 64)
        self.assertEqual(module.ARCHIVE.name, "circle-card-app-20261111T235024Z.tar.gz")
        self.assertEqual(len(module.EXPECTED_ROOTS), 5)

    def test_rejects_unknown_entry_before_reading_content(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "bad.tar.gz"
            with tarfile.open(archive, "w:gz") as dst:
                member = tarfile.TarInfo("../unexpected.txt")
                value = b"private payload"
                member.size = len(value)
                dst.addfile(member, io.BytesIO(value))
            with self.assertRaisesRegex(RuntimeError, "UNSAFE_ARCHIVE_PATH"):
                module.inspect_archive(archive)

    def test_rejects_unexpected_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "bad.tar.gz"
            with tarfile.open(archive, "w:gz") as dst:
                member = tarfile.TarInfo("var/backups/something-else")
                value = b"x"
                member.size = len(value)
                dst.addfile(member, io.BytesIO(value))
            with self.assertRaisesRegex(RuntimeError, "UNEXPECTED_ARCHIVE_PATH"):
                module.inspect_archive(archive)


if __name__ == "__main__":
    unittest.main()
