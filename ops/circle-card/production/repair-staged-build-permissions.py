#!/usr/bin/env python3
"""Repair private preview READ permissions solely inside a pinned staged build.

Default mode is read-only. With --repair, only group ownership and group
access bits on the generated staging build plus its immediate parent may change.
No live paths, Nginx, systemd, database, backup or source files are modified.
Generated build files stay root-owned and non-writable by the app group; only
the Next.js cache subtree (if any) gets group write permission.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import pwd
import re
import socket
import stat
import subprocess
import sys

STAGE=Path("/var/www/releases/circle-card-ecosystem-20261112-002058")
LIVE=Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
STATE=Path("/var/lib/circle-card-ecosystem-stage/20261112-002058/stage.json")
BUILD_PARENT=STAGE/".runtime"
BUILD=BUILD_PARENT/"circle-card"
BUILD_MARKER=BUILD/"BUILD_ID"
MANIFEST=BUILD/"server/app-paths-manifest.json"
APP_USER="circle-card-app"
LIVE_SERVICE="circle-card-bransons-account-20261109-115143.service"
PREVIEW_SERVICE="circle-card-ecosystem-preview-20261112-002058.service"
EXPECTED_PATCH="eb668250c363376978fa9f2d9dc27b865e066032"
EXPECTED_ROOT=Path("/var/www/releases")
MAX_ENTRIES=200000
MAX_BYTES=5*1024**3


def need(value,reason):
    if not value:
        raise RuntimeError(reason)


def command(args, *, timeout=18):
    return subprocess.run(args, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
                          timeout=timeout,text=True,check=False)


def safe_native_dir(path):
    need(path.is_dir() and not path.is_symlink(),"STAGED_PATH_UNAVAILABLE_OR_SYMLINK")
    need(path.resolve(strict=True)==path,"STAGED_PATH_ESCAPES_EXPECTED_LOCATION")


def validate():
    need(os.geteuid()==0,"ROOT_REQUIRED")
    safe_native_dir(EXPECTED_ROOT)
    safe_native_dir(STAGE)
    safe_native_dir(BUILD_PARENT)
    safe_native_dir(BUILD)
    need(STAGE.parent==EXPECTED_ROOT and BUILD.parent==BUILD_PARENT,
         "STAGE_PATH_OUTSIDE_ALLOWED_SCOPE")
    need(STATE.is_file() and not STATE.is_symlink(),
         "STAGING_RECEIPT_UNAVAILABLE")
    receipt=json.loads(STATE.read_text(encoding="utf8"))
    need(receipt.get("result")=="CONNECTED_ECOSYSTEM_ISOLATED_BUILD_READY"
         and receipt.get("stage")==str(STAGE)
         and receipt.get("patch_ref")==EXPECTED_PATCH
         and receipt.get("live_port")==3386
         and receipt.get("stage_port")==3387,
         "STAGING_RECEIPT_NOT_EXPECTED")
    for required in (BUILD_MARKER,MANIFEST):
        need(required.is_file() and not required.is_symlink(),
             "COMPILED_BUILD_MARKER_UNAVAILABLE")
        need(required.resolve(strict=True).is_relative_to(BUILD),
             "COMPILED_BUILD_MARKER_ESCAPES_SCOPE")
    try:
        user=pwd.getpwnam(APP_USER)
    except KeyError:
        raise RuntimeError("APPLICATION_RUNTIME_USER_NOT_FOUND") from None
    info=command(["systemctl","show",LIVE_SERVICE,"--no-pager",
                  "--property=ActiveState,MainPID,WorkingDirectory,DropInPaths"])
    props=dict(row.split("=",1) for row in info.stdout.splitlines() if "=" in row)
    need(info.returncode==0 and props.get("ActiveState")=="active"
         and props.get("WorkingDirectory")==str(LIVE)
         and not props.get("DropInPaths"),
         "PRODUCTION_RELEASE_HAS_CHANGED")
    pid=props.get("MainPID","0")
    need(pid.isdigit() and int(pid)>1
         and (Path("/proc")/pid/"cwd").resolve(strict=True)==LIVE,
         "PRODUCTION_PROCESS_HAS_CHANGED")
    site=command(["curl","--noproxy","*","-sS","-o","/dev/null",
                  "-w","%{http_code}","-H","Host: circlecard.co.uk",
                  "-H","X-Forwarded-Proto: https","--max-time","12",
                  "http://127.0.0.1:3386/login"],timeout=16)
    need(site.returncode==0 and site.stdout.strip()=="200",
         "PRODUCTION_HTTP_UNHEALTHY")
    preview=command(["systemctl","is-active",PREVIEW_SERVICE])
    need(preview.stdout.strip() not in ("active","activating","reloading"),
         "PREVIEW_MUST_BE_STOPPED_BEFORE_REPAIR")
    sock=socket.socket()
    try:
        sock.bind(("127.0.0.1",3387))
    except OSError:
        raise RuntimeError("PREVIEW_PORT_OCCUPIED") from None
    finally:
        sock.close()
    need(BUILD.stat().st_dev==STAGE.stat().st_dev,
         "STAGE_BUILD_CROSSES_FILESYSTEM")
    parent=BUILD_PARENT.lstat()
    need(stat.S_ISDIR(parent.st_mode) and parent.st_uid==0,
         "BUILD_PARENT_NOT_ROOT_OWNED")
    entries=[]
    bytes_total=0
    dir_count=file_count=0
    for root,dirs,files in os.walk(BUILD,topdown=True,followlinks=False):
        for name in dirs+files:
            item=Path(root)/name
            meta=item.lstat()
            need(not stat.S_ISLNK(meta.st_mode),
                 "BUILD_HAS_SYMLINK_REQUIRING_SEPARATE_REVIEW")
            need(meta.st_dev==BUILD.stat().st_dev,
                 "BUILD_FILE_ON_DIFFERENT_FILESYSTEM")
            need(meta.st_uid in (0,user.pw_uid),
                 "BUILD_HAS_UNEXPECTED_OWNER")
            need(meta.st_nlink==1 or stat.S_ISDIR(meta.st_mode),
                 "BUILD_HAS_HARDLINK_REQUIRING_SEPARATE_REVIEW")
            need(stat.S_ISDIR(meta.st_mode) or stat.S_ISREG(meta.st_mode),
                 "BUILD_CONTAINS_SPECIAL_FILE")
            if stat.S_ISREG(meta.st_mode):
                bytes_total+=meta.st_size
                file_count+=1
            else:
                dir_count+=1
            need(bytes_total<=MAX_BYTES and len(entries)<MAX_ENTRIES,
                 "STAGE_BUILD_OUTSIDE_SIZE_LIMITS")
            entries.append((item,meta))
    need(file_count>100 and bytes_total>1024*1024,
         "UNEXPECTEDLY_SMALL_COMPILED_BUILD")
    return user,entries,dir_count,file_count


def runtime_can_read(path):
    p=command(["runuser","-u",APP_USER,"--","test","-r",str(path)])
    return p.returncode==0


def runtime_can_write(path):
    p=command(["runuser","-u",APP_USER,"--","test","-w",str(path)])
    return p.returncode==0


def grant_group_only(path,group_id, *, writable=False):
    meta=path.lstat()
    need(not stat.S_ISLNK(meta.st_mode) and meta.st_uid in (0,pwd.getpwnam(APP_USER).pw_uid),
         "STAGE_TARGET_OWNERSHIP_CHANGED_DURING_REPAIR")
    if meta.st_gid!=group_id:
        os.chown(path,-1,group_id,follow_symlinks=False)
    mode=stat.S_IMODE(meta.st_mode)
    if stat.S_ISDIR(meta.st_mode):
        add=stat.S_IRGRP|stat.S_IXGRP
        if writable: add|=stat.S_IWGRP
    else:
        add=stat.S_IRGRP
        if writable: add|=stat.S_IWGRP
    if mode | add != mode:
        os.chmod(path,mode|add,follow_symlinks=False)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--repair",action="store_true",
                        help="Allow the existing circle-card-app group into the isolated compiled build only")
    args=parser.parse_args()
    user,entries,dirs,files=validate()
    readable_before=runtime_can_read(BUILD_MARKER) and runtime_can_read(MANIFEST)
    output={
        "result":"STAGED_BUILD_PERMISSION_PREFLIGHT_READY",
        "staged_build_files":files,
        "staged_build_directories":dirs,
        "runtime_user":APP_USER,
        "compiled_build_readable_before":readable_before,
        "changes_to_live_release":False,
        "production_site_healthy":True,
    }
    if not args.repair:
        output["writes_made"]=False
        print(json.dumps(output,indent=2))
        return
    # The immediate .runtime parent stays root-owned and is only searchable
    # by the isolated application runtime group. This does not change other
    # release files, including environment files, secrets, or the live app.
    if BUILD_PARENT.stat().st_gid!=user.pw_gid:
        os.chown(BUILD_PARENT,-1,user.pw_gid,follow_symlinks=False)
    mode=stat.S_IMODE(BUILD_PARENT.stat().st_mode)
    if not mode&stat.S_IXGRP:
        os.chmod(BUILD_PARENT,mode|stat.S_IXGRP,follow_symlinks=False)
    cache_prefix=BUILD/"cache"
    for item,meta in [(BUILD,BUILD.lstat()),*entries]:
        allow_cache=item==cache_prefix or cache_prefix in item.parents
        grant_group_only(item,user.pw_gid,writable=allow_cache)
    need(runtime_can_read(BUILD_MARKER) and runtime_can_read(MANIFEST),
         "RUNTIME_STILL_CANNOT_READ_COMPILED_BUILD")
    if cache_prefix.is_dir():
        need(runtime_can_write(cache_prefix),
             "RUNTIME_CACHE_DIRECTORY_NOT_WRITABLE")
    output.update({
        "result":"STAGED_BUILD_RUNTIME_PERMISSIONS_REPAIRED",
        "compiled_build_readable_after":True,
        "preview_can_be_retried":True,
        "live_code_modified":False,
        "production_database_modified":False,
        "nginx_or_systemd_changed":False,
        "other_release_directories_modified":False,
    })
    print(json.dumps(output,indent=2))


if __name__=="__main__":
    try:
        main()
    except Exception as exc:
        reason=str(exc) if isinstance(exc,RuntimeError) else type(exc).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",reason):
            reason="PERMISSION_REPAIR_ABORTED"
        print(json.dumps({"result":"STAGED_PERMISSION_REPAIR_ABORTED",
                          "safe_reason":reason,
                          "production_release_unchanged":True,
                          "nginx_and_systemd_unchanged":True,
                          "secrets_printed":False},indent=2))
        sys.exit(1)
