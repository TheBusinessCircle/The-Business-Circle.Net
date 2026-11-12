"""Offline policy checks for staged-only runtime permission repair."""
import importlib.util
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch,Mock

source=Path(__file__).with_name("repair-staged-build-permissions.py")
spec=importlib.util.spec_from_file_location("circle_card_runtime_access_repair",source)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PermissionRepairTests(unittest.TestCase):
    def test_stage_scope_is_pinned_and_different_from_live(self):
        self.assertEqual(module.STAGE.name,"circle-card-ecosystem-20261112-002058")
        self.assertEqual(module.BUILD,module.STAGE/".runtime/circle-card")
        self.assertEqual(module.BUILD.parent,module.BUILD_PARENT)
        self.assertNotEqual(module.STAGE,module.LIVE)
        self.assertEqual(module.APP_USER,"circle-card-app")

    def test_group_reader_bits_only_for_regular_compiled_file(self):
        with tempfile.TemporaryDirectory() as root:
            target=Path(root)/"compiled.js"
            target.write_text("compiled")
            target.chmod(0o600)
            st=target.lstat()
            fake=Mock(pw_uid=st.st_uid)
            with patch.object(module.pwd,"getpwnam",return_value=fake):
                with patch.object(module.os,"chown") as chown:
                    module.grant_group_only(target,st.st_gid)
            chown.assert_not_called()
            mode=stat.S_IMODE(target.stat().st_mode)
            self.assertTrue(mode & stat.S_IRGRP)
            self.assertFalse(mode & stat.S_IWGRP)
            self.assertFalse(mode & stat.S_IROTH)

    def test_group_directory_gets_traverse_but_not_write(self):
        with tempfile.TemporaryDirectory() as root:
            target=Path(root)/"build"
            target.mkdir()
            target.chmod(0o700)
            st=target.lstat()
            fake=Mock(pw_uid=st.st_uid)
            with patch.object(module.pwd,"getpwnam",return_value=fake):
                module.grant_group_only(target,st.st_gid)
            mode=stat.S_IMODE(target.stat().st_mode)
            self.assertTrue(mode & stat.S_IXGRP)
            self.assertTrue(mode & stat.S_IRGRP)
            self.assertFalse(mode & stat.S_IWGRP)

    def test_cache_may_be_writable_by_runtime_group(self):
        with tempfile.TemporaryDirectory() as root:
            cache=Path(root)/"cache"
            cache.mkdir()
            cache.chmod(0o700)
            st=cache.lstat()
            fake=Mock(pw_uid=st.st_uid)
            with patch.object(module.pwd,"getpwnam",return_value=fake):
                module.grant_group_only(cache,st.st_gid,writable=True)
            self.assertTrue(stat.S_IMODE(cache.stat().st_mode) & stat.S_IWGRP)

    def test_rejects_symlink_even_when_target_is_readable(self):
        with tempfile.TemporaryDirectory() as root:
            real=Path(root)/"real"
            real.write_text("secret")
            link=Path(root)/"link"
            link.symlink_to(real)
            with self.assertRaisesRegex(RuntimeError,"STAGE_TARGET_OWNERSHIP_CHANGED_DURING_REPAIR"):
                module.grant_group_only(link,os.getgid())

    def test_runtime_read_uses_dedicated_service_account(self):
        result=Mock(returncode=0)
        with patch.object(module,"command",return_value=result) as command:
            self.assertTrue(module.runtime_can_read(Path("/tmp/example")))
        self.assertEqual(command.call_args.args[0][0:4],
                         ["runuser","-u","circle-card-app","--"])


if __name__=="__main__":
    unittest.main()
