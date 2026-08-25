#!/usr/bin/env python3
"""Value-free tests for the Phase F1 atomic identity exchange utility."""

from __future__ import annotations

import argparse
import contextlib
import ctypes
import hashlib
import importlib.util
import io
import os
import re
import shutil
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


UTILITY = Path(__file__).with_name("atomic-identity-exchange.py")
SPEC = importlib.util.spec_from_file_location(
    "phase_f1_atomic_identity_exchange", UTILITY
)
assert SPEC and SPEC.loader
exchange = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = exchange
SPEC.loader.exec_module(exchange)

SYNTHETIC_OLD_PREFIX = b"PHASE-F1-SYNTHETIC-HISTORICAL-IDENTITY\n"
SYNTHETIC_NEW_PREFIX = b"PHASE-F1-SYNTHETIC-CORRECTED-IDENTITY\n"
SYNTHETIC_OLD = SYNTHETIC_OLD_PREFIX + b"H" * (
    exchange.PRODUCTION_IDENTITY_SIZE - len(SYNTHETIC_OLD_PREFIX)
)
SYNTHETIC_NEW = SYNTHETIC_NEW_PREFIX + b"C" * (
    exchange.PRODUCTION_IDENTITY_SIZE - len(SYNTHETIC_NEW_PREFIX)
)
assert len(SYNTHETIC_OLD) == exchange.PRODUCTION_IDENTITY_SIZE
assert len(SYNTHETIC_NEW) == exchange.PRODUCTION_IDENTITY_SIZE
SYNTHETIC_READINESS_OLD = (
    b'{"schemaVersion":"phase-f1-environment-readiness-v1",'
    b'"operationsCommit":"' + (b"b" * 40) + b'"}\n'
)
SYNTHETIC_READINESS_NEW = (
    b'{"schemaVersion":"phase-f1-environment-readiness-v1",'
    b'"operationsCommit":"' + (b"a" * 40) + b'"}\n'
)
assert len(SYNTHETIC_READINESS_OLD) == len(SYNTHETIC_READINESS_NEW)


def digest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def write_protected(path: Path, payload: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.write(descriptor, payload)
        os.fchmod(descriptor, 0o600)
        if getattr(os, "geteuid", lambda: -1)() == 0:
            os.fchown(descriptor, 0, 0)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def renameat2_available() -> bool:
    if not sys.platform.startswith("linux"):
        return False
    try:
        exchange._load_renameat2()
    except exchange.PrecheckFailure:
        return False
    return True


LINUX_ROOT_EXCHANGE = (
    sys.platform.startswith("linux")
    and getattr(os, "geteuid", lambda: -1)() == 0
    and renameat2_available()
)


class ContractTests(unittest.TestCase):
    def test_parser_requires_explicit_modes_and_arguments(self) -> None:
        parser = exchange._parser()
        with self.assertRaises(SystemExit):
            parser.parse_args([])
        with self.assertRaises(SystemExit):
            parser.parse_args(["exchange"])
        parsed = parser.parse_args(
            [
                "exchange",
                "--authority",
                exchange.AUTHORITATIVE_IDENTITY,
                "--exchange-slot",
                f"{exchange.APPROVED_PARENT}/"
                ".approved-phase-f1-pack.exchange-"
                + ("a" * 40)
                + ".json",
                "--preserved-history",
                f"{exchange.APPROVED_HISTORY_ROOT}/"
                + ("b" * 40)
                + "/approved-phase-f1-pack.json",
                "--pre-authority-sha256",
                "1" * 64,
                "--pre-slot-sha256",
                "2" * 64,
                "--preserved-history-sha256",
                "1" * 64,
                "--post-authority-sha256",
                "2" * 64,
                "--post-slot-sha256",
                "1" * 64,
                "--expected-parent",
                exchange.APPROVED_PARENT,
                "--expected-size",
                "851",
            ]
        )
        self.assertEqual(parsed.mode, "exchange")
        self.assertEqual(parsed.expected_size, 851)
        readiness = parser.parse_args(
            [
                "readiness-exchange",
                "--authority",
                exchange.READINESS_AUTHORITY,
                "--exchange-slot",
                f"{exchange.READINESS_PARENT}/"
                ".environment-readiness.exchange-"
                + ("a" * 40)
                + ".json",
                "--preserved-history",
                f"{exchange.READINESS_PARENT}/"
                "environment-readiness-preserved-"
                + ("b" * 40)
                + ".json",
                "--pre-authority-sha256",
                "1" * 64,
                "--pre-slot-sha256",
                "2" * 64,
                "--preserved-history-sha256",
                "1" * 64,
                "--post-authority-sha256",
                "2" * 64,
                "--post-slot-sha256",
                "1" * 64,
                "--expected-parent",
                exchange.READINESS_PARENT,
                "--expected-size",
                str(len(SYNTHETIC_READINESS_OLD)),
            ]
        )
        self.assertEqual(readiness.mode, "readiness-exchange")
        cache_readiness = parser.parse_args(
            [
                "offline-npm-cache-readiness-exchange",
                "--authority",
                exchange.OFFLINE_NPM_CACHE_READINESS_AUTHORITY,
                "--exchange-slot",
                f"{exchange.READINESS_PARENT}/"
                ".offline-npm-cache-readiness.exchange-"
                + ("a" * 40)
                + ".json",
                "--preserved-history",
                f"{exchange.READINESS_PARENT}/"
                "offline-npm-cache-readiness-preserved-"
                + ("b" * 40)
                + ".json",
                "--pre-authority-sha256",
                "1" * 64,
                "--pre-slot-sha256",
                "2" * 64,
                "--preserved-history-sha256",
                "1" * 64,
                "--post-authority-sha256",
                "2" * 64,
                "--post-slot-sha256",
                "1" * 64,
                "--expected-parent",
                exchange.READINESS_PARENT,
                "--expected-size",
                str(len(SYNTHETIC_READINESS_OLD)),
            ]
        )
        self.assertEqual(
            cache_readiness.mode,
            "offline-npm-cache-readiness-exchange",
        )

    def test_relative_and_noncanonical_paths_are_rejected(self) -> None:
        for path in (
            "relative/identity.json",
            "/var/lib/thebusinesscircle/../thebusinesscircle/identity.json",
        ):
            with self.assertRaises(exchange.PrecheckFailure):
                exchange._require_absolute_canonical_path(path, "fixture")

    def test_hash_contract_rejects_non_lowercase_or_malformed_values(self) -> None:
        for value in ("", "A" * 64, "1" * 63, "not-a-hash"):
            with self.assertRaises(exchange.PrecheckFailure):
                exchange._require_hash(value, "fixture")
        self.assertEqual(exchange._require_hash("a" * 64, "fixture"), "a" * 64)

    def test_different_filesystem_states_are_rejected(self) -> None:
        base = exchange.FileState(
            "/synthetic/a", 1, 1, 0, 0, 0o600, 1, 851, "a" * 64
        )
        other = exchange.FileState(
            "/synthetic/b", 2, 2, 0, 0, 0o600, 1, 851, "b" * 64
        )
        with self.assertRaises(exchange.PrecheckFailure):
            exchange._require_same_filesystem(base, other, base)

    def test_unavailable_renameat2_is_a_precheck_failure(self) -> None:
        with mock.patch.object(ctypes, "CDLL", return_value=object()):
            with self.assertRaisesRegex(
                exchange.PrecheckFailure, "renameat2 is unavailable"
            ):
                exchange._load_renameat2()

    def test_syscall_failure_reports_errno_without_retry(self) -> None:
        calls = []

        class FakeFunction:
            argtypes = None
            restype = None

            def __call__(self, *arguments):
                calls.append(arguments)
                ctypes.set_errno(18)
                return -1

        fake_function = FakeFunction()
        fake_library = argparse.Namespace(renameat2=fake_function)
        with mock.patch.object(ctypes, "CDLL", return_value=fake_library):
            function = exchange._load_renameat2()
            with self.assertRaises(exchange.ExchangeSyscallFailure) as caught:
                function(b"/synthetic/a", b"/synthetic/b")
        self.assertEqual(caught.exception.error_number, 18)
        self.assertEqual(len(calls), 1)

    def test_existing_and_symlinked_probe_directories_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as parent:
            existing = Path(parent, "existing")
            existing.mkdir()
            with self.assertRaises(exchange.PrecheckFailure):
                exchange.run_probe(argparse.Namespace(directory=str(existing)))
            target = Path(parent, "target")
            target.mkdir()
            linked = Path(parent, "linked")
            try:
                linked.symlink_to(target, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("directory symlinks are unavailable")
            with self.assertRaises(exchange.PrecheckFailure):
                exchange.run_probe(argparse.Namespace(directory=str(linked)))

    def test_probe_refuses_real_authority_and_parent_paths(self) -> None:
        for path in (
            exchange.AUTHORITATIVE_IDENTITY,
            exchange.APPROVED_PARENT,
        ):
            with self.assertRaises(exchange.PrecheckFailure):
                exchange.run_probe(argparse.Namespace(directory=path))

    def test_source_contains_no_weaker_or_raw_syscall_fallback(self) -> None:
        body = UTILITY.read_text(encoding="utf-8")
        self.assertIn("library.renameat2", body)
        self.assertIn("RENAME_EXCHANGE", body)
        self.assertNotRegex(body, r"\bos\.rename\s*\(")
        self.assertNotRegex(body, r"\bos\.replace\s*\(")
        self.assertNotRegex(body, r"\bshutil\.")
        self.assertNotRegex(body, r"\blibrary\.syscall\b")
        self.assertNotIn("subprocess", body)
        self.assertNotIn("json.", body)


@unittest.skipUnless(
    LINUX_ROOT_EXCHANGE,
    "requires Linux, root ownership and libc renameat2; skip is not deployment evidence",
)
class LinuxRootBehaviorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.mkdtemp(prefix="phase-f1-exchange-test-")
        self.addCleanup(shutil.rmtree, self.temporary, ignore_errors=True)
        self.parent = Path(self.temporary, "thebusinesscircle")
        self.parent.mkdir(mode=0o755)
        self.history_root = self.parent / "phase-f1-identity-history"
        self.history_root.mkdir(mode=0o700)
        self.history_dir = self.history_root / ("b" * 40)
        self.history_dir.mkdir(mode=0o700)
        self.authority = self.parent / "approved-phase-f1-pack.json"
        self.slot = (
            self.parent
            / (".approved-phase-f1-pack.exchange-" + ("a" * 40) + ".json")
        )
        self.history = self.history_dir / "approved-phase-f1-pack.json"
        write_protected(self.authority, SYNTHETIC_OLD)
        write_protected(self.slot, SYNTHETIC_NEW)
        write_protected(self.history, SYNTHETIC_OLD)
        self.patches = [
            mock.patch.object(exchange, "APPROVED_PARENT", str(self.parent)),
            mock.patch.object(
                exchange, "AUTHORITATIVE_IDENTITY", str(self.authority)
            ),
            mock.patch.object(
                exchange, "APPROVED_HISTORY_ROOT", str(self.history_root)
            ),
            mock.patch.object(
                exchange,
                "SLOT_PATTERN",
                re.compile(
                    "^"
                    + re.escape(str(self.parent))
                    + r"/\.approved-phase-f1-pack\.exchange-"
                    + r"([0-9a-f]{40})\.json$"
                ),
            ),
            mock.patch.object(
                exchange,
                "HISTORY_PATTERN",
                re.compile(
                    "^"
                    + re.escape(str(self.history_root))
                    + r"/([0-9a-f]{40})/approved-phase-f1-pack\.json$"
                ),
            ),
        ]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def arguments(
        self,
        *,
        pre_authority: str | None = None,
        pre_slot: str | None = None,
        history: str | None = None,
        post_authority: str | None = None,
        post_slot: str | None = None,
    ) -> argparse.Namespace:
        return argparse.Namespace(
            authority=str(self.authority),
            exchange_slot=str(self.slot),
            preserved_history=str(self.history),
            pre_authority_sha256=pre_authority or digest(SYNTHETIC_OLD),
            pre_slot_sha256=pre_slot or digest(SYNTHETIC_NEW),
            preserved_history_sha256=history or digest(SYNTHETIC_OLD),
            post_authority_sha256=post_authority or digest(SYNTHETIC_NEW),
            post_slot_sha256=post_slot or digest(SYNTHETIC_OLD),
            expected_parent=str(self.parent),
            expected_size=exchange.PRODUCTION_IDENTITY_SIZE,
        )

    def test_successful_forward_and_reverse_exchange(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exchange.run_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_NEW)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_OLD)
        self.assertEqual(self.history.read_bytes(), SYNTHETIC_OLD)

        reverse = self.arguments(
            pre_authority=digest(SYNTHETIC_NEW),
            pre_slot=digest(SYNTHETIC_OLD),
            post_authority=digest(SYNTHETIC_OLD),
            post_slot=digest(SYNTHETIC_NEW),
        )
        with contextlib.redirect_stdout(output):
            exchange.run_exchange(reverse)
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_OLD)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_NEW)
        printed = output.getvalue()
        self.assertNotIn(SYNTHETIC_OLD.decode(), printed)
        self.assertNotIn(SYNTHETIC_NEW.decode(), printed)

    def test_directory_fsync_runs_after_exchange(self) -> None:
        fsync_paths = []
        exchange.run_exchange(
            self.arguments(), fsync_impl=lambda path: fsync_paths.append(path)
        )
        self.assertEqual(fsync_paths, [str(self.parent)])

    def test_wrong_hashes_and_size_fail_before_exchange(self) -> None:
        for arguments in (
            self.arguments(pre_authority="0" * 64),
            self.arguments(pre_slot="0" * 64),
            self.arguments(history="0" * 64),
        ):
            with self.assertRaises(exchange.PrecheckFailure):
                exchange.run_exchange(arguments)
        wrong_size = self.arguments()
        wrong_size.expected_size = 850
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(wrong_size)
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_OLD)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_NEW)

    def test_mode_hardlink_symlink_and_non_regular_inputs_are_rejected(self) -> None:
        os.chmod(self.slot, 0o640)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(self.arguments())
        os.chmod(self.slot, 0o600)

        hardlink = self.parent / "synthetic-hardlink"
        os.link(self.slot, hardlink)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(self.arguments())
        hardlink.unlink()

        self.slot.unlink()
        self.slot.symlink_to(self.authority)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(self.arguments())
        self.slot.unlink()
        self.slot.mkdir()
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(self.arguments())

    def test_wrong_owner_and_group_are_rejected(self) -> None:
        os.chown(self.slot, 1, 1)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(self.arguments())

    def test_different_parent_is_rejected(self) -> None:
        other = Path(self.temporary, "other")
        other.mkdir()
        moved_slot = other / self.slot.name
        self.slot.rename(moved_slot)
        arguments = self.arguments()
        arguments.exchange_slot = str(moved_slot)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_exchange(arguments)

    def test_wrong_post_hash_reports_uncertain_exchange_and_preserves_state(
        self,
    ) -> None:
        with self.assertRaises(exchange.PostExchangeFailure):
            exchange.run_exchange(
                self.arguments(post_authority="0" * 64)
            )
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_NEW)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_OLD)
        self.assertEqual(self.history.read_bytes(), SYNTHETIC_OLD)

    def test_probe_exchanges_back_and_cleans_up(self) -> None:
        probe = Path(self.temporary, "new-probe")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exchange.run_probe(argparse.Namespace(directory=str(probe)))
        self.assertFalse(probe.exists())
        self.assertIn("probe_cleanup=complete", output.getvalue())

    def test_probe_retains_safe_evidence_after_simulated_failure(self) -> None:
        probe = Path(self.temporary, "failed-probe")
        calls = 0

        def exchange_then_fail(first: str, second: str) -> None:
            nonlocal calls
            calls += 1
            exchange._rename_exchange(first, second)
            if calls == 1:
                raise exchange.PostExchangeFailure(
                    "synthetic post-exchange fixture failure"
                )

        error_output = io.StringIO()
        with contextlib.redirect_stderr(error_output):
            with self.assertRaises(exchange.PostExchangeFailure):
                exchange.run_probe(
                    argparse.Namespace(directory=str(probe)),
                    exchange_impl=exchange_then_fail,
                )
        self.assertTrue(probe.is_dir())
        self.assertEqual(len(list(probe.iterdir())), 2)
        self.assertIn("evidence_retained=", error_output.getvalue())


@unittest.skipUnless(
    LINUX_ROOT_EXCHANGE,
    "requires Linux, root ownership and libc renameat2; skip is not deployment evidence",
)
class LinuxRootReadinessExchangeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.mkdtemp(prefix="phase-f1-readiness-exchange-")
        self.addCleanup(shutil.rmtree, self.temporary, ignore_errors=True)
        self.parent = Path(self.temporary, "deployment-state")
        self.parent.mkdir(mode=0o700)
        self.authority = self.parent / "environment-readiness.json"
        self.slot = self.parent / (
            ".environment-readiness.exchange-" + ("a" * 40) + ".json"
        )
        self.history = self.parent / (
            "environment-readiness-preserved-" + ("b" * 40) + ".json"
        )
        write_protected(self.authority, SYNTHETIC_READINESS_OLD)
        write_protected(self.slot, SYNTHETIC_READINESS_NEW)
        write_protected(self.history, SYNTHETIC_READINESS_OLD)
        self.patches = [
            mock.patch.object(exchange, "READINESS_PARENT", str(self.parent)),
            mock.patch.object(exchange, "READINESS_AUTHORITY", str(self.authority)),
            mock.patch.object(
                exchange,
                "READINESS_SLOT_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/\.environment-readiness\.exchange-([0-9a-f]{40})\.json$"
                ),
            ),
            mock.patch.object(
                exchange,
                "READINESS_HISTORY_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/environment-readiness-preserved-([0-9a-f]{40})\.json$"
                ),
            ),
        ]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def arguments(self) -> argparse.Namespace:
        return argparse.Namespace(
            authority=str(self.authority),
            exchange_slot=str(self.slot),
            preserved_history=str(self.history),
            pre_authority_sha256=digest(SYNTHETIC_READINESS_OLD),
            pre_slot_sha256=digest(SYNTHETIC_READINESS_NEW),
            preserved_history_sha256=digest(SYNTHETIC_READINESS_OLD),
            post_authority_sha256=digest(SYNTHETIC_READINESS_NEW),
            post_slot_sha256=digest(SYNTHETIC_READINESS_OLD),
            expected_parent=str(self.parent),
            expected_size=len(SYNTHETIC_READINESS_OLD),
        )

    def test_readiness_exchange_is_atomic_and_preserves_source(self) -> None:
        exchange.run_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_NEW)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_READINESS_OLD)
        self.assertEqual(self.history.read_bytes(), SYNTHETIC_READINESS_OLD)

    def test_readiness_exchange_rejects_paths_metadata_hashes_and_size(self) -> None:
        bad_path = self.arguments()
        bad_path.authority = str(self.parent / "arbitrary-readiness.json")
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_readiness_exchange(bad_path)
        bad_hash = self.arguments()
        bad_hash.pre_authority_sha256 = "0" * 64
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_readiness_exchange(bad_hash)
        bad_size = self.arguments()
        bad_size.expected_size = 0
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_readiness_exchange(bad_size)
        os.chmod(self.slot, 0o640)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_OLD)


@unittest.skipUnless(
    LINUX_ROOT_EXCHANGE,
    "requires Linux, root ownership and libc renameat2; skip is not deployment evidence",
)
class LinuxRootGitAuthReadinessExchangeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.mkdtemp(prefix="phase-f1-git-auth-readiness-exchange-")
        self.addCleanup(shutil.rmtree, self.temporary, ignore_errors=True)
        self.parent = Path(self.temporary, "deployment-state")
        self.parent.mkdir(mode=0o700)
        self.authority = self.parent / "git-auth-readiness.json"
        self.slot = self.parent / (
            ".git-auth-readiness.exchange-" + ("a" * 40) + ".json"
        )
        self.history = self.parent / (
            "git-auth-readiness-preserved-" + ("b" * 40) + ".json"
        )
        write_protected(self.authority, SYNTHETIC_READINESS_OLD)
        write_protected(self.slot, SYNTHETIC_READINESS_NEW)
        write_protected(self.history, SYNTHETIC_READINESS_OLD)
        self.patches = [
            mock.patch.object(exchange, "READINESS_PARENT", str(self.parent)),
            mock.patch.object(
                exchange, "GIT_AUTH_READINESS_AUTHORITY", str(self.authority)
            ),
            mock.patch.object(
                exchange,
                "GIT_AUTH_READINESS_SLOT_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/\.git-auth-readiness\.exchange-([0-9a-f]{40})\.json$"
                ),
            ),
            mock.patch.object(
                exchange,
                "GIT_AUTH_READINESS_HISTORY_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/git-auth-readiness-preserved-([0-9a-f]{40})\.json$"
                ),
            ),
        ]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def arguments(self) -> argparse.Namespace:
        return argparse.Namespace(
            authority=str(self.authority),
            exchange_slot=str(self.slot),
            preserved_history=str(self.history),
            pre_authority_sha256=digest(SYNTHETIC_READINESS_OLD),
            pre_slot_sha256=digest(SYNTHETIC_READINESS_NEW),
            preserved_history_sha256=digest(SYNTHETIC_READINESS_OLD),
            post_authority_sha256=digest(SYNTHETIC_READINESS_NEW),
            post_slot_sha256=digest(SYNTHETIC_READINESS_OLD),
            expected_parent=str(self.parent),
            expected_size=len(SYNTHETIC_READINESS_OLD),
        )

    def test_git_auth_readiness_exchange_is_atomic_and_preserves_source(self) -> None:
        exchange.run_git_auth_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_NEW)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_READINESS_OLD)
        self.assertEqual(self.history.read_bytes(), SYNTHETIC_READINESS_OLD)

    def test_git_auth_readiness_exchange_rejects_arbitrary_paths(self) -> None:
        bad_path = self.arguments()
        bad_path.preserved_history = str(self.parent / "arbitrary.json")
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_git_auth_readiness_exchange(bad_path)
        os.chmod(self.slot, 0o640)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_git_auth_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_OLD)


@unittest.skipUnless(
    LINUX_ROOT_EXCHANGE,
    "requires Linux, root ownership and libc renameat2; skip is not deployment evidence",
)
class LinuxRootOfflineNpmCacheReadinessExchangeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.mkdtemp(
            prefix="phase-f1-offline-cache-readiness-exchange-"
        )
        self.addCleanup(shutil.rmtree, self.temporary, ignore_errors=True)
        self.parent = Path(self.temporary, "deployment-state")
        self.parent.mkdir(mode=0o700)
        self.authority = self.parent / "offline-npm-cache-readiness.json"
        self.slot = self.parent / (
            ".offline-npm-cache-readiness.exchange-" + ("a" * 40) + ".json"
        )
        self.history = self.parent / (
            "offline-npm-cache-readiness-preserved-" + ("b" * 40) + ".json"
        )
        write_protected(self.authority, SYNTHETIC_READINESS_OLD)
        write_protected(self.slot, SYNTHETIC_READINESS_NEW)
        write_protected(self.history, SYNTHETIC_READINESS_OLD)
        self.patches = [
            mock.patch.object(exchange, "READINESS_PARENT", str(self.parent)),
            mock.patch.object(
                exchange,
                "OFFLINE_NPM_CACHE_READINESS_AUTHORITY",
                str(self.authority),
            ),
            mock.patch.object(
                exchange,
                "OFFLINE_NPM_CACHE_READINESS_SLOT_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/\.offline-npm-cache-readiness\.exchange-"
                    + r"([0-9a-f]{40})\.json$"
                ),
            ),
            mock.patch.object(
                exchange,
                "OFFLINE_NPM_CACHE_READINESS_HISTORY_PATTERN",
                re.compile(
                    "^" + re.escape(str(self.parent))
                    + r"/offline-npm-cache-readiness-preserved-"
                    + r"([0-9a-f]{40})\.json$"
                ),
            ),
        ]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def arguments(self) -> argparse.Namespace:
        return argparse.Namespace(
            authority=str(self.authority),
            exchange_slot=str(self.slot),
            preserved_history=str(self.history),
            pre_authority_sha256=digest(SYNTHETIC_READINESS_OLD),
            pre_slot_sha256=digest(SYNTHETIC_READINESS_NEW),
            preserved_history_sha256=digest(SYNTHETIC_READINESS_OLD),
            post_authority_sha256=digest(SYNTHETIC_READINESS_NEW),
            post_slot_sha256=digest(SYNTHETIC_READINESS_OLD),
            expected_parent=str(self.parent),
            expected_size=len(SYNTHETIC_READINESS_OLD),
        )

    def test_cache_readiness_exchange_is_atomic_and_preserves_source(self) -> None:
        exchange.run_offline_npm_cache_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_NEW)
        self.assertEqual(self.slot.read_bytes(), SYNTHETIC_READINESS_OLD)
        self.assertEqual(self.history.read_bytes(), SYNTHETIC_READINESS_OLD)

    def test_cache_readiness_exchange_rejects_paths_metadata_and_hashes(
        self,
    ) -> None:
        bad_path = self.arguments()
        bad_path.exchange_slot = str(self.parent / "arbitrary.json")
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_offline_npm_cache_readiness_exchange(bad_path)
        bad_hash = self.arguments()
        bad_hash.pre_authority_sha256 = "0" * 64
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_offline_npm_cache_readiness_exchange(bad_hash)
        os.chmod(self.history, 0o640)
        with self.assertRaises(exchange.PrecheckFailure):
            exchange.run_offline_npm_cache_readiness_exchange(self.arguments())
        self.assertEqual(self.authority.read_bytes(), SYNTHETIC_READINESS_OLD)


if __name__ == "__main__":
    unittest.main(verbosity=2)
