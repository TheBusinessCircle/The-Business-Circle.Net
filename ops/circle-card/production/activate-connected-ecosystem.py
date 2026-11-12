#!/usr/bin/env python3
"""Circle Card first ecosystem release: guarded preflight, activation, rollback.

Imports the version-pinned smoke-connected-ecosystem.py from the SAME private
download directory. Never deploy without a fresh, verified PostgreSQL dump and
confirmed healthy current service. No migrations, customer record writes or
billing changes. Old port 3386 service stays running for safe rollback.

Usage:
  python3 activate-connected-ecosystem.py --check
  python3 activate-connected-ecosystem.py --deploy
  python3 activate-connected-ecosystem.py --status
  python3 activate-connected-ecosystem.py --rollback

The current historical recovery timer is NOT repaired by this tool.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import socket
import stat
import subprocess
import sys
import time

LIVE=Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
STAGE=Path("/var/www/releases/circle-card-ecosystem-20261112-002058")
OLD_UNIT="circle-card-bransons-account-20261109-115143.service"
NEW_UNIT="circle-card-ecosystem-20261112-002058.service"
NEW_UNIT_PATH=Path("/etc/systemd/system")/NEW_UNIT
NEW_LAUNCHER=Path("/opt/thebusinesscircle/circle-card-launchers/ecosystem-20261112-002058/launch.mjs")
NEW_ENV=Path("/var/lib/circle-card-ecosystem-stage/20261112-002058/release.env")
STATE=Path("/var/lib/circle-card-ecosystem-stage/20261112-002058")
DEPLOYMENT=STATE/"release-activation.json"
NGINX_LINK=Path("/etc/nginx/sites-enabled/circlecard.co.uk")
NGINX_BACKUP=STATE/"nginx.before-ecosystem-release.conf"
BACKUP_DIR=Path("/var/backups/circle-card-safety")
PREVIOUS_APP_ARCHIVE=BACKUP_DIR/"circle-card-app-20261111T235024Z.tar.gz"
PREVIOUS_APP_SHA="cafc513a55025975187296e95dec3515382816c7e1e0eb51c6dc80939d57380c"
FRESH_BACKUP_MAX_AGE_SECONDS=7200
SAVED_PATCH_REF="eb668250c363376978fa9f2d9dc27b865e066032"
APPROVED_BUILD_ID="IlUYNmvKirPq-sFwpeimH"
PREVIEW_BASENAME="smoke-connected-ecosystem.py"


def need(ok,code):
    if not ok:
        raise RuntimeError(code)


def cmd(args,*,timeout=25):
    return subprocess.run(args,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
                          stderr=subprocess.DEVNULL,check=False,text=True,timeout=timeout)


def checksum(path):
    h=hashlib.sha256()
    with path.open("rb") as fp:
        for b in iter(lambda:fp.read(1024*1024),b""):
            h.update(b)
    return h.hexdigest()


def smoke_module():
    path=Path(__file__).resolve().parent/PREVIEW_BASENAME
    need(path.is_file() and not path.is_symlink() and path.stat().st_uid==0,
         "PINNED_PREVIEW_HELPER_MISSING")
    spec=importlib.util.spec_from_file_location("circle_card_pinned_preview",path)
    need(spec is not None and spec.loader is not None,"PREVIEW_MODULE_IMPORT_FAILED")
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    need(mod.LIVE==LIVE and mod.STAGE==STAGE and mod.LIVE_UNIT==OLD_UNIT
         and mod.PORT==3387 and mod.OLD_PORT==3386,
         "PREVIEW_HELPER_IDENTITIES_CHANGED")
    return mod


def vhost_path():
    target=NGINX_LINK.resolve(strict=True)
    need(target.is_file() and not target.is_symlink()
         and str(target).startswith("/etc/nginx/"),
         "NGINX_ACTIVE_VHOST_UNEXPECTED")
    return target


def props(unit):
    r=cmd(["systemctl","show",unit,"--no-pager",
           "--property=ActiveState,MainPID,WorkingDirectory,DropInPaths"])
    need(r.returncode==0,"SERVICE_IDENTITY_UNAVAILABLE")
    return dict(line.split("=",1) for line in r.stdout.splitlines() if "=" in line)


def expected_process(unit,path):
    data=props(unit)
    pid=data.get("MainPID","0")
    if (data.get("ActiveState")!="active" or data.get("WorkingDirectory")!=str(path)
            or data.get("DropInPaths") or not pid.isdigit() or int(pid)<2):
        return False
    try:
        return (Path("/proc")/pid/"cwd").resolve(strict=True)==path
    except (OSError,RuntimeError):
        return False


def health(port,path):
    r=cmd([
        "curl","--noproxy","*","-sS","-o","/dev/null",
        "-w","%{http_code}","--max-time","15",
        "-H","Host: circlecard.co.uk",
        "-H","X-Forwarded-Proto: https",
        "http://127.0.0.1:"+str(port)+path
    ],timeout=20)
    return r.returncode==0 and r.stdout.strip()=="200"


def fresh_db_backup():
    need(BACKUP_DIR.is_dir() and not BACKUP_DIR.is_symlink()
         and BACKUP_DIR.stat().st_uid==0
         and not (stat.S_IMODE(BACKUP_DIR.stat().st_mode)&0o077),
         "PRIVATE_DB_BACKUP_ROOT_NOT_VERIFIED")
    now=dt.datetime.now(dt.timezone.utc)
    matches=[]
    for meta in sorted(BACKUP_DIR.glob("circle-card-db-*.json"),reverse=True)[:20]:
        if meta.is_symlink() or not meta.is_file():
            continue
        try:
            content=json.loads(meta.read_text())
            if content.get("result")!="DATABASE_ARCHIVE_CREATED_AND_READABLE" or not content.get("archive_list_verified"):
                continue
            timestamp=dt.datetime.strptime(content["created_utc"],"%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
            age=(now-timestamp).total_seconds()
            if age<0 or age>FRESH_BACKUP_MAX_AGE_SECONDS:
                continue
            archive=Path(content["path"])
            if archive.name!="circle-card-db-"+content["created_utc"]+".dump" or archive.parent!=BACKUP_DIR:
                continue
            if archive.is_symlink() or not archive.is_file() or archive.stat().st_uid!=0:
                continue
            if archive.stat().st_size<1024 or checksum(archive)!=content["sha256"]:
                continue
            matches.append((timestamp,archive))
        except (KeyError,ValueError,TypeError,OSError):
            continue
    need(bool(matches),"FRESH_VERIFIED_DB_BACKUP_REQUIRED")
    best=max(matches,key=lambda x:x[0])
    return {"latest_verified_db_dump":str(best[1]),
            "created_utc":best[0].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "full_restore_test_of_latest_dump":False}


def validate():
    need(os.geteuid()==0,"ROOT_REQUIRED")
    need(not DEPLOYMENT.exists(),"ALREADY_ACTIVATED_USE_STATUS_OR_ROLLBACK")
    need(not NEW_UNIT_PATH.exists() and not NEW_UNIT_PATH.is_symlink()
         and not NEW_LAUNCHER.exists() and not NEW_ENV.exists()
         and not NEW_LAUNCHER.parent.exists() and not NGINX_BACKUP.exists(),
         "RELEASE_ARTIFACTS_ALREADY_EXIST")
    mod=smoke_module()
    context=mod.files_and_build()
    need(expected_process(OLD_UNIT,LIVE),"OLD_PRODUCTION_IDENTITY_CHANGED")
    need(health(3386,"/login") and health(3386,"/card/hucknall-circle-hub"),
         "PREVIOUS_PRODUCTION_UNHEALTHY")
    need(PREVIOUS_APP_ARCHIVE.is_file() and checksum(PREVIOUS_APP_ARCHIVE)==PREVIOUS_APP_SHA,
         "VERIFIED_APP_ROLLBACK_ARCHIVE_MISSING_OR_CHANGED")
    backup=fresh_db_backup()
    need(STAGE.is_dir() and not STAGE.is_symlink() and STATE.is_dir(),"STAGING_STATE_MISSING")
    receipt=json.loads((STATE/"stage.json").read_text())
    need(receipt.get("result")=="CONNECTED_ECOSYSTEM_ISOLATED_BUILD_READY"
         and receipt.get("patch_ref")==SAVED_PATCH_REF
         and receipt.get("stage")==str(STAGE),"CANDIDATE_RECEIPT_INVALID")
    build_id=context["dist"]/"BUILD_ID"
    need(build_id.is_file() and not build_id.is_symlink()
         and build_id.read_text(encoding="utf-8").strip()==APPROVED_BUILD_ID,
         "CORRECTED_APPROVED_BUILD_ID_MISMATCH")
    for path in (build_id,context["dist"]/"server/app-paths-manifest.json"):
        need(cmd(["runuser","-u","circle-card-app","--","test","-r",str(path)]).returncode==0,
             "STAGED_RUNTIME_PERMISSIONS_INSUFFICIENT")
    config=vhost_path().read_bytes()
    new=b"proxy_pass http://127.0.0.1:3387;"
    hits=list(re.finditer(rb"\bproxy_pass\s+http://127\.0\.0\.1:3386\s*;",config))
    need(len(hits)==1 and new not in config,"UNEXPECTED_EXISTING_PROXY_CONFIGURATION")
    need(shutil.disk_usage(STATE).free>=2*1024**3,"LOW_DISK_ABORT_DEPLOYMENT")
    require_private=STATE.stat()
    need(require_private.st_uid==0 and not stat.S_IMODE(require_private.st_mode)&0o077,
         "DEPLOYMENT_STATE_IS_NOT_PRIVATE")
    # Retain source Nginx vhost bytes for exact rollback.
    return mod,context,config,backup


def nginx_write(data, dest):
    oldmeta=dest.stat()
    candidate=dest.with_name(".circlecard-ecosystem-candidate-"+str(os.getpid())+".tmp")
    need(not candidate.exists() and not candidate.is_symlink(),"NGINX_TEMP_PATH_OCCUPIED")
    try:
        with candidate.open("xb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(candidate,stat.S_IMODE(oldmeta.st_mode))
        os.chown(candidate,oldmeta.st_uid,oldmeta.st_gid)
        os.replace(candidate,dest)
    finally:
        if candidate.exists():
            candidate.unlink()


def nginx_switched_content(original):
    found=list(re.finditer(rb"\bproxy_pass\s+http://127\.0\.0\.1:3386\s*;",original))
    need(len(found)==1,"NGINX_PROXY_NO_LONGER_EXPECTED")
    a,b=found[0].span()
    updated=(original[:a]+b"proxy_pass http://127.0.0.1:3387;"+original[b:])
    updated=updated.replace(str(LIVE).encode(),str(STAGE).encode())
    need(updated!=original,"NGINX_RELEASE_SWITCH_EMPTY")
    need(updated.count(b"proxy_pass http://127.0.0.1:3387;")==1,
         "NGINX_NEW_PROXY_TARGET_INVALID")
    return updated


def rollback_nginx(target,previous_bytes):
    nginx_write(previous_bytes,target)
    tested=cmd(["nginx","-t"],timeout=25).returncode==0
    reloaded=cmd(["systemctl","reload","nginx"],timeout=25).returncode==0 if tested else False
    return tested and reloaded and health(3386,"/login")


def request_checked(mod,path,expected=200,marker=None):
    code,data=mod.request(path)
    need(code==expected,"CANDIDATE_HTTP_STATUS_INVALID")
    if marker is not None:
        need(marker in data,"CANDIDATE_PUBLIC_FEATURE_NOT_RENDERED")
    return True


def smoke_new_service(mod,oldpid):
    mod.wait_for_safe_preview_listener(attempts=40,delay=1)
    for index in range(40):
        try:
            if request_checked(mod,"/login"):
                break
        except (OSError,RuntimeError,ValueError):
            time.sleep(1)
    else:
        raise RuntimeError("CANDIDATE_LOGIN_NOT_READY")
    for path,marker in (
        ("/circle-card/pro",b"Unlimited standard links"),
        ("/card/hucknall-circle-hub/join",b"Create your free Circle Card"),
        ("/card/hucknall-circle-hub",b"Hucknall"),
    ):
        request_checked(mod,path,marker=marker)
    request_checked(mod,"/register?source=circle-card")
    request_checked(mod,"/robots.txt")
    # The existing owned-card preview must remain behind login.
    private="/app/prepared/cmvzwzm3y000amkahigz25s8r/preview?plan=pro&presentation=custom"
    response=mod.preview_http_diagnosis(private)
    need(response.get("status") in (302,303,307,308)
         and response.get("redirect_scope") in ("relative","public_site"),
         "PRIVATE_CARD_PREVIEW_AUTH_GUARD_FAILED")
    need(expected_process(OLD_UNIT,LIVE)
         and props(OLD_UNIT).get("MainPID")==str(oldpid),
         "OLD_PRODUCTION_CHANGED_DURING_VALIDATION")
    return True


def write_launch_components(ctx,mod):
    newlauncher=ctx["launcher"].replace(str(mod.LAUNCHER_FILE),str(NEW_LAUNCHER))
    # The launcher source itself already contains the stage path and loopback host.
    need(str(STAGE) in newlauncher,"PREPARED_LAUNCHER_MISSING_STAGE")
    unit=ctx["unit"].replace(str(mod.LAUNCHER_FILE),str(NEW_LAUNCHER))
    unit=unit.replace(str(mod.ENV_FILE),str(NEW_ENV))
    need(str(NEW_LAUNCHER) in unit and "EnvironmentFile="+str(NEW_ENV) in unit,
         "PREPARED_SERVICE_UNIT_NOT_PINNED")
    NEW_LAUNCHER.parent.mkdir(mode=0o755)
    # deploy() sets umask 0077, which would otherwise create a 0700
    # directory unreadable to the unprivileged service account.
    NEW_LAUNCHER.parent.chmod(0o755)
    need(not NEW_LAUNCHER.parent.is_symlink()
         and NEW_LAUNCHER.parent.stat().st_uid==0,
         "LAUNCHER_DIRECTORY_UNSAFE")
    NEW_LAUNCHER.write_text(newlauncher)
    NEW_LAUNCHER.chmod(0o644)
    need(cmd(["runuser","-u","circle-card-app","--","test","-x",str(NEW_LAUNCHER.parent)]).returncode==0
         and cmd(["runuser","-u","circle-card-app","--","test","-r",str(NEW_LAUNCHER)]).returncode==0,
         "LAUNCHER_NOT_READABLE_BY_APP_USER")
    need(cmd(["node","--check",str(NEW_LAUNCHER)]).returncode==0,
         "PINNED_LAUNCHER_SYNTAX_FAILED")
    NEW_ENV.write_text("PORT=3387\nHOSTNAME=127.0.0.1\n")
    NEW_ENV.chmod(0o600)
    NEW_UNIT_PATH.write_text(unit)
    NEW_UNIT_PATH.chmod(0o600)
    need(cmd(["systemctl","daemon-reload"],timeout=25).returncode==0,
         "NEW_SERVICE_DAEMON_RELOAD_FAILED")


def deploy():
    mod,ctx,original,db=validate()
    oldpid=props(OLD_UNIT).get("MainPID")
    target=vhost_path()
    need(target.read_bytes()==original,"NGINX_CHANGED_SINCE_PREFLIGHT")
    status="not_started"
    switched=False
    started=False
    saved=False
    try:
        os.umask(0o077)
        with NGINX_BACKUP.open("xb") as fp:
            fp.write(original)
            fp.flush()
            os.fsync(fp.fileno())
        saved=True
        need(checksum(NGINX_BACKUP)==hashlib.sha256(original).hexdigest(),
             "NGINX_BACKUP_HASH_MISMATCH")
        write_launch_components(ctx,mod)
        start_result=cmd(["systemctl","start",NEW_UNIT],timeout=60)
        started=True
        need(start_result.returncode==0,"NEW_RELEASE_SERVICE_FAILED_TO_START")
        smoke_new_service(mod,oldpid)
        need(vhost_path().read_bytes()==original,"NGINX_CHANGED_DURING_PREVIEW")
        candidate=nginx_switched_content(original)
        nginx_write(candidate,target)
        # Rollback is mandatory if any test or reload fails.
        need(cmd(["nginx","-t"],timeout=30).returncode==0,
             "NEW_NGINX_CONFIGURATION_INVALID")
        need(cmd(["systemctl","reload","nginx"],timeout=30).returncode==0,
             "NGINX_RELOAD_FAILED")
        switched=True
        for route in ("/login", "/circle-card/pro", "/card/hucknall-circle-hub/join"):
            public=cmd(["curl","--noproxy","*","-sS",
                        "--resolve","circlecard.co.uk:443:127.0.0.1",
                        "--max-time","20","-o","/dev/null","-w","%{http_code}",
                        "https://circlecard.co.uk"+route],timeout=25)
            need(public.returncode==0 and public.stdout.strip()=="200",
                 "PUBLIC_HTTPS_CHECK_FAILED")
        need(vhost_path().read_bytes()==candidate
             and expected_process(NEW_UNIT,STAGE)
             and expected_process(OLD_UNIT,LIVE),
             "NEW_RELEASE_OR_OLD_ROLLBACK_NOT_HEALTHY")
        need(cmd(["systemctl","enable",NEW_UNIT],timeout=25).returncode==0,
             "NEW_RELEASE_BOOT_ENABLE_FAILED")
        status="live"
        record={
            "result":"CONNECTED_ECOSYSTEM_PUBLIC_RELEASE_ACTIVATED",
            "created_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
            "new_release":str(STAGE),
            "new_service":NEW_UNIT,
            "new_port":3387,
            "old_release":str(LIVE),
            "old_service":OLD_UNIT,
            "old_port":3386,
            "nginx_path":str(target),
            "nginx_previous_backup":str(NGINX_BACKUP),
            "nginx_previous_sha256":hashlib.sha256(original).hexdigest(),
            "nginx_new_sha256":hashlib.sha256(candidate).hexdigest(),
            "patch_ref":SAVED_PATCH_REF,
            "approved_build_id":APPROVED_BUILD_ID,
            "newest_verified_db_dump":db["latest_verified_db_dump"],
            "newest_db_dump_full_restore_test":False,
            "newest_database_dump_created_utc":db["created_utc"],
            "older_database_dump_isolated_restore_verified":True,
            "production_migrations_run":False,
            "old_rollback_unit_preserved":True,
            "authenticated_and_billing_write_tests_performed":False,
            "automatic_recovery_timer_repaired":False,
        }
        DEPLOYMENT.write_text(json.dumps(record,indent=2))
        DEPLOYMENT.chmod(0o600)
        print(json.dumps(record,indent=2))
    except BaseException:
        if saved and target.read_bytes()!=original:
            if not rollback_nginx(target,original):
                raise RuntimeError("DEPLOYMENT_FAILED_ROLLBACK_REQUIRES_MANUAL_INTERVENTION")
        if started:
            cmd(["systemctl","disable",NEW_UNIT],timeout=20)
            cmd(["systemctl","stop",NEW_UNIT],timeout=35)
        # preserve new unit/launcher/previous config and do not delete backups
        raise


def rollback():
    need(os.geteuid()==0,"ROOT_REQUIRED")
    need(DEPLOYMENT.is_file() and not DEPLOYMENT.is_symlink(),
         "VERIFIED_PUBLIC_DEPLOYMENT_RECORD_MISSING")
    record=json.loads(DEPLOYMENT.read_text())
    need(record.get("result")=="CONNECTED_ECOSYSTEM_PUBLIC_RELEASE_ACTIVATED"
         and record.get("new_service")==NEW_UNIT
         and record.get("new_release")==str(STAGE)
         and record.get("old_service")==OLD_UNIT,
         "DEPLOYMENT_RECORD_NOT_EXPECTED")
    target=vhost_path()
    need(checksum(target)==record["nginx_new_sha256"],
         "PUBLIC_NGINX_HAS_CHANGED_DO_NOT_OVERWRITE")
    need(NGINX_BACKUP.is_file() and checksum(NGINX_BACKUP)==record["nginx_previous_sha256"],
         "EXACT_PREVIOUS_NGINX_BACKUP_MISSING")
    need(expected_process(OLD_UNIT,LIVE) and health(3386,"/login"),
         "ROLLBACK_SERVICE_NOT_HEALTHY")
    need(rollback_nginx(target,NGINX_BACKUP.read_bytes()),
         "ROLLBACK_NGINX_RESTORE_FAILED")
    cmd(["systemctl","disable",NEW_UNIT],timeout=20)
    cmd(["systemctl","stop",NEW_UNIT],timeout=35)
    record["result"]="CONNECTED_ECOSYSTEM_RELEASE_ROLLED_BACK"
    record["rollback_utc"]=dt.datetime.now(dt.timezone.utc).isoformat()
    DEPLOYMENT.write_text(json.dumps(record,indent=2))
    print(json.dumps({"result":record["result"],
                      "public_proxy_port":3386,
                      "old_release_kept":True,
                      "database_unchanged":True,
                      "backup_archives_preserved":True},indent=2))


def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check",action="store_true",help="Read-only production release gate")
    group.add_argument("--deploy",action="store_true",help="Start and verify candidate, switch Nginx with rollback on error")
    group.add_argument("--status",action="store_true",help="Read-only release status")
    group.add_argument("--rollback",action="store_true",help="Restore verified previous vhost if current release is pinned")
    args=parser.parse_args()
    if args.rollback:
        rollback()
    elif args.status:
        print(json.dumps({"result":"CONNECTED_ECOSYSTEM_RELEASE_STATUS",
                          "live_old_unit":expected_process(OLD_UNIT,LIVE),
                          "live_new_unit":expected_process(NEW_UNIT,STAGE),
                          "deployment_record_exists":DEPLOYMENT.is_file(),
                          "production_changes":False},indent=2))
    elif args.check:
        mod,ctx,nginx,backup=validate()
        print(json.dumps({"result":"CONNECTED_ECOSYSTEM_LIVE_DEPLOYMENT_GATE_READY",
                          "current_site_service_healthy":True,
                          "repaired_candidate_build_and_launcher_verified":True,
                          "exact_approved_corrected_build_id":APPROVED_BUILD_ID,
                          "fresh_pg_backup":backup,
                          "nginx_config_stable_and_pinned":True,
                          "rollback_service_verified":True,
                          "authenticated_billing_test_not_performed":True,
                          "automatic_recovery_timer_still_requires_repair":True,
                          "writes_made":False},indent=2))
    else:
        deploy()


if __name__=="__main__":
    try:
        main()
    except Exception as e:
        reason=str(e) if isinstance(e,RuntimeError) else type(e).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",reason):
            reason="DEPLOYMENT_ABORTED"
        print(json.dumps({"result":"CONNECTED_ECOSYSTEM_RELEASE_ABORTED",
                          "safe_reason":reason,
                          "user_data_or_billing_modified_by_script":False},indent=2))
        sys.exit(1)
