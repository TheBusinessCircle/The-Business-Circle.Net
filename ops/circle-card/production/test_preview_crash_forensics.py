"""Offline checks for redacted Circle Card preview crash forensics."""
import importlib.util
from pathlib import Path
import unittest

script=Path(__file__).with_name("preview-crash-forensics.py")
spec=importlib.util.spec_from_file_location("preview_crash_forensics",script)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CrashForensicsTests(unittest.TestCase):
    def test_classifies_build_and_systemd_crash(self):
        self.assertIn("NODE_MISSING_BUILD",module.relevant_categories(
            "Error: Could not find a production build in the .next directory"))
        self.assertIn("SYSTEMD_PROCESS_EXITED",module.relevant_categories(
            "Main process exited, code=exited, status=1/FAILURE"))

    def test_classifies_database_and_permission_failure(self):
        result=module.relevant_categories("P1001 EACCES /private/secret/credentials")
        self.assertIn("DATABASE_UNAVAILABLE",result)
        self.assertIn("FILESYSTEM_PERMISSION_DENIED",result)
        self.assertFalse(any("private" in item for item in result))
        self.assertFalse(any("credentials" in item for item in result))

    def test_classifies_runtime_errors_without_quoting_secrets(self):
        flags=module.relevant_categories(
            "TypeError: Cannot read properties of undefined (reading secretToken) at /srv/private")
        self.assertIn("JAVASCRIPT_TYPE_ERROR",flags)
        self.assertFalse(any("secretToken" in value for value in flags))

    def test_unknown_message_is_not_repeated(self):
        self.assertEqual(module.relevant_categories("sensitive internal message"),[])

    def test_pins_only_temporary_preview_unit(self):
        self.assertEqual(module.UNIT,"circle-card-ecosystem-preview-20261112-002058.service")
        self.assertEqual(module.STAGE.name,"circle-card-ecosystem-20261112-002058")

if __name__=="__main__":
    unittest.main()
