#!/usr/bin/env python3
"""Native Circle Card PostgreSQL backup runner for either verified live release.

This is independent of historical PUBLIC_VERIFIED/registry manifests. It
authenticates the ACTUAL one Circle Card HTTPS proxy target and exact live
systemd service/process CWD, then delegates pg_dump to the previously tested
one-shot backup module. Production DB is read-only to this operation. It does
not claim offsite safety or full app restore.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

BASE=Path("/opt/circle-card-native-db-backup")
BACKUP_CORE=BASE/"pg_dump_core.py"
NGINX=Path("/etc/nginx/sites-enabled/circlecard.co.uk")
RELEASE_BY_PORT={
    3386:("circle-card-bransons-account-20261109-115143.service",
          "/var/www/releases/circle-card-bransons-account-20261109-115143"),
    3387:("circle-card-ecosystem-20261112-002058.service",
          "/var/www/releases/circle-card-ecosystem-20261112-002058"),
}
MIN_BACKUP_FREE_GIB=5


def require(condition,reason):
    if not condition:
        raise RuntimeError(reason)


def shell(args,timeout=20):
    return subprocess.run(args,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL,text=True,timeout=timeout,check=False)


def discover_live():
    require(os.geteuid()==0,"ROOT_REQUIRED")
    target=NGINX.resolve(strict=True)
    require(target.is_file() and str(target).startswith("/etc/nginx/"),
            "CIRCLE_CARD_NGINX_TARGET_UNEXPECTED")
    source=target.read_text()
    proxy=re.findall(r"\bproxy_pass\s+http://127\.0\.0\.1:(\d+)\s*;",source)
    require(len(proxy)==1,"CIRCLE_CARD_PROXY_NOT_UNIQUE")
    port=int(proxy[0])
    require(port in RELEASE_BY_PORT,"CIRCLE_CARD_PUBLIC_PORT_UNRECOGNISED")
    service,release=RELEASE_BY_PORT[port]
    r=shell(["systemctl","show",service,"--no-pager",
             "--property=ActiveState,MainPID,WorkingDirectory,DropInPaths"])
    props=dict(row.split("=",1) for row in r.stdout.splitlines() if "=" in row)
    require(r.returncode==0 and props.get("ActiveState")=="active"
            and props.get("WorkingDirectory")==release and not props.get("DropInPaths"),
            "CIRCLE_CARD_LIVE_SERVICE_NOT_VERIFIED")
    pid=props.get("MainPID","")
    require(pid.isdigit() and int(pid)>1 and
            (Path("/proc")/pid/"cwd").resolve(strict=True)==Path(release),
            "CIRCLE_CARD_RUNTIME_IDENTITY_NOT_VERIFIED")
    # Neither backup-creation nor the service identity checks writes to live.
    for path in ("/login","/card/hucknall-circle-hub"):
        route=shell(["curl","--noproxy","*","-sS","-o","/dev/null",
                     "-w","%{http_code}","--max-time","18",
                     "-H","Host: circlecard.co.uk",
                     "-H","X-Forwarded-Proto: https",
                     "http://127.0.0.1:"+str(port)+path],timeout=22)
        require(route.returncode==0 and route.stdout.strip()=="200",
                "CIRCLE_CARD_PUBLIC_BACKEND_UNHEALTHY")
    return port,service,release,int(pid)


def pg_core():
    require(BACKUP_CORE.is_file() and not BACKUP_CORE.is_symlink()
            and BACKUP_CORE.stat().st_uid==0
            and not (stat.S_IMODE(BACKUP_CORE.stat().st_mode)&0o077),
            "PROTECTED_POSTGRES_BACKUP_CORE_MISSING")
    spec=importlib.util.spec_from_file_location("circle_card_native_pg_dump",BACKUP_CORE)
    require(spec is not None and spec.loader is not None,"BACKUP_MODULE_NOT_LOADABLE")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for attribute in ("guard_environment","backup","check_live",
                      "property_values","extract_process_database_url"):
        require(hasattr(module,attribute),"POSTGRES_BACKUP_INTERFACE_CHANGED")
    return module


def run_backup(create=False):
    port,service,release,pid=discover_live()
    core=pg_core()
    core.LIVE_SERVICE=service
    core.LIVE_RELEASE=release

    def verified_current_live():
        new_port,new_unit,new_release,new_pid=discover_live()
        require((new_port,new_unit,new_release,new_pid)==(port,service,release,pid),
                "LIVE_BACKEND_CHANGED_DURING_BACKUP")
        return pid

    core.check_live=verified_current_live
    context=core.guard_environment()
    require(context["pid"]==pid,"POSTGRES_CONTEXT_PID_MISMATCH")
    if create:
        core.backup(context)
    else:
        print(json.dumps({
            "result":"NATIVE_CIRCLE_CARD_DB_BACKUP_PREFLIGHT_READY",
            "live_backend_port":port,
            "live_release_verified":True,
            "postgresql_backup_client_available":True,
            "disk_free_gib":context["disk_gib"],
            "writes_made":False,
            "raw_database_connection_details_printed":False,
        },indent=2))


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--backup",action="store_true",help="Make new root-private pg_dump archive and check its TOC")
    args=parser.parse_args()
    run_backup(args.backup)


if __name__=="__main__":
    try:
        main()
    except Exception as exc:
        code=str(exc) if isinstance(exc,RuntimeError) else type(exc).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",code):
            code="NATIVE_BACKUP_ABORTED"
        print(json.dumps({"result":"NATIVE_CIRCLE_CARD_DB_BACKUP_ABORTED",
                          "safe_reason":code,
                          "database_writes_made":False,
                          "secrets_printed":False},indent=2))
        sys.exit(1)
