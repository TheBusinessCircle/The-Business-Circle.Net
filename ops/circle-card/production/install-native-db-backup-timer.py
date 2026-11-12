#!/usr/bin/env python3
"""Prepare an independent Circle Card daily database backup systemd timer.

This file creates only a new dedicated timer after confirming that its backup
runner has produced a fresh archive. Legacy recovery files are never touched.
Run without flags to check. Run --install to create and enable the new timer.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

ROOT=Path("/opt/circle-card-native-db-backup")
HERE=Path(__file__).resolve().parent
SCRIPTS={
    "native-db-backup.py":"native-circle-card-db-backup.py",
    "pg_dump_core.py":"one-shot-safety-backup.py",
}
SERVICE="circle-card-native-db-backup.service"
TIMER="circle-card-native-db-backup.timer"
SERVICE_PATH=Path("/etc/systemd/system")/SERVICE
TIMER_PATH=Path("/etc/systemd/system")/TIMER
ARCHIVES=Path("/var/backups/circle-card-safety")

def require(value,reason):
    if not value: raise RuntimeError(reason)

def run(command,timeout=25):
    return subprocess.run(command,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL,text=True,check=False,timeout=timeout)

def sources():
    require(os.geteuid()==0,"ROOT_REQUIRED")
    require(not ROOT.exists() and not SERVICE_PATH.exists() and not TIMER_PATH.exists(),
            "TIMER_ALREADY_INSTALLED")
    require(ARCHIVES.is_dir() and not ARCHIVES.is_symlink()
            and ARCHIVES.stat().st_uid==0
            and not(stat.S_IMODE(ARCHIVES.stat().st_mode)&0o077),
            "BACKUP_DIRECTORY_NOT_PRIVATE")
    require(shutil.disk_usage(ARCHIVES).free>5*1024**3,"BACKUP_DISK_LOW")
    for path in SCRIPTS.values():
        src=HERE/path
        require(src.is_file() and not src.is_symlink() and src.stat().st_uid==0,
                "SOURCE_FILE_NOT_ROOT_OWNED")
    require(run(["systemd-analyze","calendar","*-*-* 03:15:00 Europe/London"]).returncode==0,
            "SYSTEMD_TIMEZONE_UNSUPPORTED")

def latest_archive_paths():
    return {str(x) for x in ARCHIVES.glob("circle-card-db-*.dump") if x.is_file() and not x.is_symlink()}

def install():
    sources()
    old=latest_archive_paths()
    os.umask(0o077)
    ROOT.mkdir(mode=0o700)
    for dest,source in SCRIPTS.items():
        (ROOT/dest).write_bytes((HERE/source).read_bytes())
        (ROOT/dest).chmod(0o600)
    service_content=(
        "[Unit]\nDescription=Circle Card native PostgreSQL backup\nAfter=network-online.target\n\n"
        "[Service]\nType=oneshot\nWorkingDirectory=/opt/circle-card-native-db-backup\n"
        "UMask=0077\nEnvironment=PYTHONDONTWRITEBYTECODE=1\n"
        "ExecStart=/usr/bin/python3 /opt/circle-card-native-db-backup/native-db-backup.py --backup\n"
        "TimeoutStartSec=8min\n"
    )
    timer_content=(
        "[Unit]\nDescription=Daily Circle Card PostgreSQL backup\n\n"
        "[Timer]\nOnCalendar=*-*-* 03:15:00 Europe/London\nPersistent=true\n"
        "RandomizedDelaySec=5min\nUnit=circle-card-native-db-backup.service\n\n"
        "[Install]\nWantedBy=timers.target\n"
    )
    SERVICE_PATH.write_text(service_content)
    TIMER_PATH.write_text(timer_content)
    require(run(["systemctl","daemon-reload"]).returncode==0,
            "SYSTEMD_RELOAD_FAILED")
    require(run(["systemctl","start",SERVICE],timeout=520).returncode==0,
            "FIRST_NATIVE_DATABASE_BACKUP_FAILED")
    created=latest_archive_paths()-old
    require(created,"NEW_ARCHIVE_NOT_CREATED")
    for filename in created:
        require(run(["pg_restore","--list",filename],timeout=40).returncode==0,
                "NEW_ARCHIVE_UNREADABLE")
    require(run(["systemctl","enable","--now",TIMER],timeout=35).returncode==0,
            "NEW_DATABASE_BACKUP_TIMER_NOT_ENABLED")
    require(run(["systemctl","is-active",TIMER]).stdout.strip()=="active",
            "NEW_DATABASE_BACKUP_TIMER_NOT_ACTIVE")
    print(json.dumps({"result":"NATIVE_DAILY_DATABASE_BACKUP_TIMER_ENABLED",
                      "first_backup_created_and_readable":True,
                      "new_archive_count":len(created),
                      "daily_time":"03:15 Europe/London",
                      "legacy_recovery_timer_untouched":True,
                      "automated_application_backup":False,
                      "offsite_backup":False,
                      "production_data_changed":False},indent=2))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--install",action="store_true")
    args=parser.parse_args()
    if args.install: install()
    else:
        sources()
        print(json.dumps({"result":"NATIVE_BACKUP_TIMER_PRECHECK_READY",
                          "changes_made":False},indent=2))

if __name__=="__main__":
    try:main()
    except Exception as error:
        reason=str(error) if isinstance(error,RuntimeError) else type(error).__name__.upper()
        if not re.fullmatch("[A-Z0-9_]+",reason):reason="NATIVE_TIMER_ABORTED"
        print(json.dumps({"result":"NATIVE_BACKUP_TIMER_ABORTED",
                          "reason":reason,"legacy_backup_unchanged":True},indent=2))
        sys.exit(1)
