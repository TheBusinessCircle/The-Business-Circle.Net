#!/usr/bin/env python3
"""Fail-closed Phase F1 authoritative identity exchange using renameat2."""

from __future__ import annotations

import argparse
import ctypes
import errno
import hashlib
import os
import re
import stat
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Sequence


AT_FDCWD = -100
RENAME_EXCHANGE = 2
APPROVED_PARENT = "/var/lib/thebusinesscircle"
AUTHORITATIVE_IDENTITY = (
    "/var/lib/thebusinesscircle/approved-phase-f1-pack.json"
)
APPROVED_HISTORY_ROOT = (
    "/var/lib/thebusinesscircle/phase-f1-identity-history"
)
PRODUCTION_IDENTITY_SIZE = 851
PRECHECK_EXIT = 10
SYSCALL_EXIT = 20
POST_EXCHANGE_EXIT = 30
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
SLOT_PATTERN = re.compile(
    r"^/var/lib/thebusinesscircle/"
    r"\.approved-phase-f1-pack\.exchange-([0-9a-f]{40})\.json$"
)
HISTORY_PATTERN = re.compile(
    r"^/var/lib/thebusinesscircle/phase-f1-identity-history/"
    r"([0-9a-f]{40})/approved-phase-f1-pack\.json$"
)
READINESS_PARENT = "/var/lib/thebusinesscircle/deployment-state"
READINESS_AUTHORITY = (
    "/var/lib/thebusinesscircle/deployment-state/environment-readiness.json"
)
READINESS_SLOT_PATTERN = re.compile(
    r"^/var/lib/thebusinesscircle/deployment-state/"
    r"\.environment-readiness\.exchange-([0-9a-f]{40})\.json$"
)
READINESS_HISTORY_PATTERN = re.compile(
    r"^/var/lib/thebusinesscircle/deployment-state/"
    r"environment-readiness-preserved-([0-9a-f]{40})\.json$"
)


class PrecheckFailure(RuntimeError):
    """The exchange has not been attempted."""


class ExchangeSyscallFailure(RuntimeError):
    """renameat2 returned an error and no weaker primitive was attempted."""

    def __init__(self, error_number: int):
        self.error_number = error_number
        name = errno.errorcode.get(error_number, "UNKNOWN")
        super().__init__(
            f"renameat2 failed errno_name={name} errno_number={error_number}"
        )


class PostExchangeFailure(RuntimeError):
    """The syscall returned success but post-exchange state is not accepted."""


@dataclass(frozen=True)
class FileState:
    path: str
    device: int
    inode: int
    uid: int
    gid: int
    mode: int
    links: int
    size: int
    sha256: str


def _require_absolute_canonical_path(path: str, label: str) -> str:
    if (
        not path
        or not os.path.isabs(path)
        or os.path.normpath(path) != path
        or os.path.realpath(path) != path
    ):
        raise PrecheckFailure(f"{label} must be an absolute canonical path")
    return path


def _require_hash(value: str, label: str) -> str:
    if not SHA256_PATTERN.fullmatch(value or ""):
        raise PrecheckFailure(f"{label} must be a lowercase SHA-256 identity")
    return value


def _read_hash_from_descriptor(descriptor: int) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    while True:
        block = os.read(descriptor, 1024 * 1024)
        if not block:
            break
        size += len(block)
        digest.update(block)
    return size, digest.hexdigest()


def _inspect_file(
    path: str,
    expected_hash: str,
    expected_size: int,
    label: str,
    *,
    require_root: bool = True,
) -> FileState:
    _require_absolute_canonical_path(path, label)
    expected_hash = _require_hash(expected_hash, f"{label} expected hash")
    try:
        before = os.lstat(path)
    except OSError as error:
        raise PrecheckFailure(f"{label} is unavailable") from error
    if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
        raise PrecheckFailure(f"{label} must be a regular non-symlink file")

    flags = os.O_RDONLY
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    try:
        descriptor = os.open(path, flags)
    except OSError as error:
        raise PrecheckFailure(f"{label} could not be opened safely") from error
    try:
        current = os.fstat(descriptor)
        if (before.st_dev, before.st_ino) != (current.st_dev, current.st_ino):
            raise PrecheckFailure(f"{label} changed during validation")
        actual_size, actual_hash = _read_hash_from_descriptor(descriptor)
    finally:
        os.close(descriptor)

    mode = stat.S_IMODE(current.st_mode)
    if require_root and (current.st_uid != 0 or current.st_gid != 0):
        raise PrecheckFailure(f"{label} must be owned by root:root")
    if mode != 0o600:
        raise PrecheckFailure(f"{label} must have mode 0600")
    if current.st_nlink != 1:
        raise PrecheckFailure(f"{label} must have link count one")
    if current.st_size != expected_size or actual_size != expected_size:
        raise PrecheckFailure(f"{label} has the wrong byte size")
    if actual_hash != expected_hash:
        raise PrecheckFailure(f"{label} SHA-256 identity mismatch")
    return FileState(
        path=path,
        device=current.st_dev,
        inode=current.st_ino,
        uid=current.st_uid,
        gid=current.st_gid,
        mode=mode,
        links=current.st_nlink,
        size=current.st_size,
        sha256=actual_hash,
    )


def _validate_protected_parent(parent: str) -> FileState:
    _require_absolute_canonical_path(parent, "expected parent")
    try:
        details = os.lstat(parent)
    except OSError as error:
        raise PrecheckFailure("expected parent is unavailable") from error
    if (
        stat.S_ISLNK(details.st_mode)
        or not stat.S_ISDIR(details.st_mode)
        or details.st_uid != 0
        or details.st_gid != 0
        or stat.S_IMODE(details.st_mode) & 0o022
    ):
        raise PrecheckFailure("expected parent protection is invalid")
    return FileState(
        path=parent,
        device=details.st_dev,
        inode=details.st_ino,
        uid=details.st_uid,
        gid=details.st_gid,
        mode=stat.S_IMODE(details.st_mode),
        links=details.st_nlink,
        size=details.st_size,
        sha256="",
    )


def _validate_history_path(path: str) -> None:
    if not HISTORY_PATTERN.fullmatch(path):
        raise PrecheckFailure(
            "preserved history path is outside the approved history root"
        )
    _require_absolute_canonical_path(APPROVED_HISTORY_ROOT, "history root")
    if os.path.commonpath([APPROVED_HISTORY_ROOT, path]) != APPROVED_HISTORY_ROOT:
        raise PrecheckFailure(
            "preserved history path is outside the approved history root"
        )


def _validate_exchange_inputs(
    *,
    authority: str,
    slot: str,
    history: str,
    authority_hash: str,
    slot_hash: str,
    history_hash: str,
    expected_parent: str,
    expected_size: int,
) -> tuple[FileState, FileState, FileState]:
    if getattr(os, "geteuid", lambda: -1)() != 0:
        raise PrecheckFailure("production identity exchange requires root")
    if expected_parent != APPROVED_PARENT:
        raise PrecheckFailure("unexpected production parent")
    if authority != AUTHORITATIVE_IDENTITY:
        raise PrecheckFailure("unexpected authoritative identity path")
    if not SLOT_PATTERN.fullmatch(slot):
        raise PrecheckFailure("unexpected exchange-slot path")
    _validate_history_path(history)
    if expected_size != PRODUCTION_IDENTITY_SIZE:
        raise PrecheckFailure("production identity size must be exactly 851")

    authority_parent = os.path.dirname(authority)
    slot_parent = os.path.dirname(slot)
    if authority_parent != expected_parent or slot_parent != expected_parent:
        raise PrecheckFailure("exchange operands must have the expected parent")
    if authority_parent != slot_parent:
        raise PrecheckFailure("exchange operands must share one parent")
    parent_state = _validate_protected_parent(expected_parent)
    authority_state = _inspect_file(
        authority, authority_hash, expected_size, "authoritative identity"
    )
    slot_state = _inspect_file(
        slot, slot_hash, expected_size, "exchange slot"
    )
    history_state = _inspect_file(
        history, history_hash, expected_size, "preserved history identity"
    )
    _require_same_filesystem(authority_state, slot_state, parent_state)
    return authority_state, slot_state, history_state


def _require_same_filesystem(
    authority_state: FileState,
    slot_state: FileState,
    parent_state: FileState,
) -> None:
    if (
        authority_state.device != slot_state.device
        or authority_state.device != parent_state.device
    ):
        raise PrecheckFailure(
            "exchange operands and parent must be on one filesystem"
        )


def _validate_readiness_exchange_inputs(
    *,
    authority: str,
    slot: str,
    history: str,
    authority_hash: str,
    slot_hash: str,
    history_hash: str,
    expected_parent: str,
    expected_size: int,
) -> tuple[FileState, FileState, FileState]:
    if getattr(os, "geteuid", lambda: -1)() != 0:
        raise PrecheckFailure("readiness exchange requires root")
    if expected_parent != READINESS_PARENT:
        raise PrecheckFailure("unexpected readiness parent")
    if authority != READINESS_AUTHORITY:
        raise PrecheckFailure("unexpected environment-readiness authority path")
    if not READINESS_SLOT_PATTERN.fullmatch(slot):
        raise PrecheckFailure("unexpected environment-readiness exchange slot")
    if not READINESS_HISTORY_PATTERN.fullmatch(history):
        raise PrecheckFailure("unexpected preserved environment-readiness path")
    if expected_size <= 0 or expected_size > 65536:
        raise PrecheckFailure("environment-readiness size is outside the approved bound")
    if (
        os.path.dirname(authority) != expected_parent
        or os.path.dirname(slot) != expected_parent
        or os.path.dirname(history) != expected_parent
    ):
        raise PrecheckFailure("readiness exchange operands must share the approved parent")
    parent_state = _validate_protected_parent(expected_parent)
    authority_state = _inspect_file(
        authority, authority_hash, expected_size, "environment-readiness authority"
    )
    slot_state = _inspect_file(
        slot, slot_hash, expected_size, "environment-readiness exchange slot"
    )
    history_state = _inspect_file(
        history, history_hash, expected_size, "preserved environment-readiness"
    )
    _require_same_filesystem(authority_state, slot_state, parent_state)
    if history_state.device != parent_state.device:
        raise PrecheckFailure("preserved readiness must share the approved filesystem")
    return authority_state, slot_state, history_state


def _load_renameat2() -> Callable[[bytes, bytes], None]:
    library = ctypes.CDLL(None, use_errno=True)
    try:
        function = library.renameat2
    except AttributeError as error:
        raise PrecheckFailure("libc renameat2 is unavailable") from error
    function.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    function.restype = ctypes.c_int

    def exchange(first: bytes, second: bytes) -> None:
        ctypes.set_errno(0)
        result = function(
            AT_FDCWD,
            first,
            AT_FDCWD,
            second,
            RENAME_EXCHANGE,
        )
        if result != 0:
            raise ExchangeSyscallFailure(ctypes.get_errno())

    return exchange


def _rename_exchange(first: str, second: str) -> None:
    function = _load_renameat2()
    function(os.fsencode(first), os.fsencode(second))


def _fsync_directory(directory: str) -> None:
    flags = os.O_RDONLY
    flags |= getattr(os, "O_DIRECTORY", 0)
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(directory, flags)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def run_exchange(
    arguments: argparse.Namespace,
    *,
    exchange_impl: Callable[[str, str], None] = _rename_exchange,
    fsync_impl: Callable[[str], None] = _fsync_directory,
) -> None:
    parameters = {
        "authority": arguments.authority,
        "slot": arguments.exchange_slot,
        "history": arguments.preserved_history,
        "expected_parent": arguments.expected_parent,
        "expected_size": arguments.expected_size,
    }
    _validate_exchange_inputs(
        **parameters,
        authority_hash=arguments.pre_authority_sha256,
        slot_hash=arguments.pre_slot_sha256,
        history_hash=arguments.preserved_history_sha256,
    )
    # Repeat every metadata and content check immediately before the one syscall.
    _validate_exchange_inputs(
        **parameters,
        authority_hash=arguments.pre_authority_sha256,
        slot_hash=arguments.pre_slot_sha256,
        history_hash=arguments.preserved_history_sha256,
    )

    exchange_impl(arguments.authority, arguments.exchange_slot)
    try:
        fsync_impl(arguments.expected_parent)
        authority_state, slot_state, history_state = (
            _validate_exchange_inputs(
                **parameters,
                authority_hash=arguments.post_authority_sha256,
                slot_hash=arguments.post_slot_sha256,
                history_hash=arguments.preserved_history_sha256,
            )
        )
    except Exception as error:
        raise PostExchangeFailure(
            "post-exchange verification failed; exchange may have occurred"
        ) from error

    print("IDENTITY_EXCHANGE_OK")
    print(f"authority_path={authority_state.path}")
    print(f"authority_sha256={authority_state.sha256}")
    print(f"exchange_slot_path={slot_state.path}")
    print(f"exchange_slot_sha256={slot_state.sha256}")
    print(f"preserved_history_path={history_state.path}")
    print(f"preserved_history_sha256={history_state.sha256}")


def run_readiness_exchange(
    arguments: argparse.Namespace,
    *,
    exchange_impl: Callable[[str, str], None] = _rename_exchange,
    fsync_impl: Callable[[str], None] = _fsync_directory,
) -> None:
    parameters = {
        "authority": arguments.authority,
        "slot": arguments.exchange_slot,
        "history": arguments.preserved_history,
        "expected_parent": arguments.expected_parent,
        "expected_size": arguments.expected_size,
    }
    for _ in range(2):
        _validate_readiness_exchange_inputs(
            **parameters,
            authority_hash=arguments.pre_authority_sha256,
            slot_hash=arguments.pre_slot_sha256,
            history_hash=arguments.preserved_history_sha256,
        )
    exchange_impl(arguments.authority, arguments.exchange_slot)
    try:
        fsync_impl(arguments.expected_parent)
        authority_state, slot_state, history_state = (
            _validate_readiness_exchange_inputs(
                **parameters,
                authority_hash=arguments.post_authority_sha256,
                slot_hash=arguments.post_slot_sha256,
                history_hash=arguments.preserved_history_sha256,
            )
        )
    except Exception as error:
        raise PostExchangeFailure(
            "post-exchange readiness verification failed; exchange may have occurred"
        ) from error
    print("READINESS_EXCHANGE_OK")
    print(f"authority_path={authority_state.path}")
    print(f"authority_sha256={authority_state.sha256}")
    print(f"exchange_slot_path={slot_state.path}")
    print(f"exchange_slot_sha256={slot_state.sha256}")
    print(f"preserved_history_path={history_state.path}")
    print(f"preserved_history_sha256={history_state.sha256}")


def _probe_payload(marker: bytes) -> bytes:
    prefix = b"PHASE-F1-SYNTHETIC-ATOMIC-EXCHANGE-PROBE-" + marker + b"\n"
    return prefix + (b"!" * (PRODUCTION_IDENTITY_SIZE - len(prefix)))


def _write_probe_file(path: str, payload: bytes) -> FileState:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags, 0o600)
    try:
        offset = 0
        while offset < len(payload):
            written = os.write(descriptor, payload[offset:])
            if written <= 0:
                raise PrecheckFailure("probe write made no forward progress")
            offset += written
        os.fchmod(descriptor, 0o600)
        if getattr(os, "geteuid", lambda: -1)() == 0:
            os.fchown(descriptor, 0, 0)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    return _inspect_file(
        path,
        hashlib.sha256(payload).hexdigest(),
        len(payload),
        "synthetic probe file",
        require_root=getattr(os, "geteuid", lambda: -1)() == 0,
    )


def _same_inode(path: str, state: FileState) -> bool:
    try:
        details = os.lstat(path)
    except OSError:
        return False
    return (
        stat.S_ISREG(details.st_mode)
        and not stat.S_ISLNK(details.st_mode)
        and details.st_dev == state.device
        and details.st_ino == state.inode
    )


def run_probe(
    arguments: argparse.Namespace,
    *,
    exchange_impl: Callable[[str, str], None] = _rename_exchange,
    fsync_impl: Callable[[str], None] = _fsync_directory,
) -> None:
    directory = arguments.directory
    if (
        not directory
        or not os.path.isabs(directory)
        or os.path.normpath(directory) != directory
        or directory in (AUTHORITATIVE_IDENTITY, APPROVED_PARENT)
    ):
        raise PrecheckFailure(
            "probe directory must be a new approved absolute path"
        )
    parent = os.path.dirname(directory)
    _require_absolute_canonical_path(parent, "probe parent")
    try:
        os.lstat(directory)
    except FileNotFoundError:
        pass
    except OSError as error:
        raise PrecheckFailure("probe directory could not be validated") from error
    else:
        raise PrecheckFailure("probe directory must not already exist")

    # Fail before creating evidence if the required primitive is unavailable.
    if exchange_impl is _rename_exchange:
        _load_renameat2()

    os.mkdir(directory, 0o700)
    first = os.path.join(directory, "synthetic-probe-a.identity")
    second = os.path.join(directory, "synthetic-probe-b.identity")
    first_payload = _probe_payload(b"A")
    second_payload = _probe_payload(b"B")
    first_hash = hashlib.sha256(first_payload).hexdigest()
    second_hash = hashlib.sha256(second_payload).hexdigest()
    first_created: FileState | None = None
    second_created: FileState | None = None
    stage = "probe-files"
    try:
        first_created = _write_probe_file(first, first_payload)
        second_created = _write_probe_file(second, second_payload)
        fsync_impl(directory)

        stage = "first-exchange"
        exchange_impl(first, second)
        try:
            fsync_impl(directory)
            _inspect_file(
                first,
                second_hash,
                PRODUCTION_IDENTITY_SIZE,
                "first exchanged probe file",
                require_root=getattr(os, "geteuid", lambda: -1)() == 0,
            )
            _inspect_file(
                second,
                first_hash,
                PRODUCTION_IDENTITY_SIZE,
                "second exchanged probe file",
                require_root=getattr(os, "geteuid", lambda: -1)() == 0,
            )
        except Exception as error:
            raise PostExchangeFailure(
                "probe first exchange may have occurred"
            ) from error

        stage = "reverse-exchange"
        exchange_impl(first, second)
        try:
            fsync_impl(directory)
            first_restored = _inspect_file(
                first,
                first_hash,
                PRODUCTION_IDENTITY_SIZE,
                "restored first probe file",
                require_root=getattr(os, "geteuid", lambda: -1)() == 0,
            )
            second_restored = _inspect_file(
                second,
                second_hash,
                PRODUCTION_IDENTITY_SIZE,
                "restored second probe file",
                require_root=getattr(os, "geteuid", lambda: -1)() == 0,
            )
        except Exception as error:
            raise PostExchangeFailure(
                "probe reverse exchange may have occurred"
            ) from error

        stage = "cleanup"
        if not _same_inode(first, first_restored) or not _same_inode(
            second, second_restored
        ):
            raise PostExchangeFailure(
                "probe cleanup refused changed synthetic evidence"
            )
        os.unlink(first)
        os.unlink(second)
        fsync_impl(directory)
        if list(os.scandir(directory)):
            raise PostExchangeFailure(
                "probe cleanup refused unexpected directory entries"
            )
        os.rmdir(directory)
        fsync_impl(parent)
    except Exception as error:
        print(
            f"PROBE_FAILED evidence_retained={directory} stage={stage}",
            file=sys.stderr,
        )
        raise

    print("IDENTITY_EXCHANGE_PROBE_OK")
    print(f"probe_directory={directory}")
    print("probe_cleanup=complete")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Atomic Phase F1 authoritative identity exchange; no fallback "
            "rename primitive is permitted."
        )
    )
    subparsers = parser.add_subparsers(dest="mode", required=True)
    exchange = subparsers.add_parser("exchange")
    exchange.add_argument("--authority", required=True)
    exchange.add_argument("--exchange-slot", required=True)
    exchange.add_argument("--preserved-history", required=True)
    exchange.add_argument("--pre-authority-sha256", required=True)
    exchange.add_argument("--pre-slot-sha256", required=True)
    exchange.add_argument("--preserved-history-sha256", required=True)
    exchange.add_argument("--post-authority-sha256", required=True)
    exchange.add_argument("--post-slot-sha256", required=True)
    exchange.add_argument("--expected-parent", required=True)
    exchange.add_argument("--expected-size", required=True, type=int)
    readiness_exchange = subparsers.add_parser("readiness-exchange")
    readiness_exchange.add_argument("--authority", required=True)
    readiness_exchange.add_argument("--exchange-slot", required=True)
    readiness_exchange.add_argument("--preserved-history", required=True)
    readiness_exchange.add_argument("--pre-authority-sha256", required=True)
    readiness_exchange.add_argument("--pre-slot-sha256", required=True)
    readiness_exchange.add_argument("--preserved-history-sha256", required=True)
    readiness_exchange.add_argument("--post-authority-sha256", required=True)
    readiness_exchange.add_argument("--post-slot-sha256", required=True)
    readiness_exchange.add_argument("--expected-parent", required=True)
    readiness_exchange.add_argument("--expected-size", required=True, type=int)
    probe = subparsers.add_parser("probe")
    probe.add_argument("--directory", required=True)
    return parser


def main(arguments: Sequence[str] | None = None) -> int:
    try:
        parsed = _parser().parse_args(arguments)
        if parsed.mode == "exchange":
            run_exchange(parsed)
        elif parsed.mode == "readiness-exchange":
            run_readiness_exchange(parsed)
        elif parsed.mode == "probe":
            run_probe(parsed)
        else:
            raise PrecheckFailure("unsupported operation mode")
        return 0
    except PostExchangeFailure as error:
        print(
            "POST_EXCHANGE_VERIFICATION_FAILED "
            f"exchange_may_have_occurred=true detail={error}",
            file=sys.stderr,
        )
        return POST_EXCHANGE_EXIT
    except ExchangeSyscallFailure as error:
        print(f"EXCHANGE_SYSCALL_FAILED {error}", file=sys.stderr)
        return SYSCALL_EXIT
    except (PrecheckFailure, OSError, ValueError) as error:
        print(
            "EXCHANGE_PRECHECK_FAILED exchange_attempted=false "
            f"detail={error}",
            file=sys.stderr,
        )
        return PRECHECK_EXIT


if __name__ == "__main__":
    raise SystemExit(main())
