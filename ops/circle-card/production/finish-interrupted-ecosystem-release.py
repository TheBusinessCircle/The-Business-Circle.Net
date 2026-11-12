#!/usr/bin/env python3
"""Finish an interrupted Circle Card first-ecosystem rollout.

This is NOT the original installer. Both pinned systemd services already exist:
old 3386 is public, corrected candidate 3387 is running privately. This tool
adopts those verified, unchanged resources and switches only the exact Nginx
vhost after verifying the corrected BUILD_ID, backup, ownership, public route
markers, private access guard, and old/new process identities.

--check is read-only. --finish writes Nginx and a rollback receipt, enables the
already-running new systemd unit only after success. It never changes either
application release, database schema, customer data, payments, or old service.
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
import stat
import subprocess
import sys

CORE_NAME="activate-connected-ecosystem.py"
APPROVED_BUILD_ID="IlUYNmvKirPq-sFwpeimH"


def need(ok,reason):
    if not ok:
        raise RuntimeError(reason)


def core_module():
    path=Path(__file__).resolve().parent/CORE_NAME
    need(path.is_file() and not path.is_symlink() and path.stat().st_uid==0,
         "PINNED_ACTIVATION_LIBRARY_MISSING")
    source=path.read_text(encoding="utf-8")
    need('APPROVED_BUILD_ID="IlUYNmvKirPq-sFwpeimH"' in source
         and "LAUNCHER_NOT_READABLE_BY_APP_USER" in source
         and "def rollback_nginx(" in source,
         "OLD_OR_UNAPPROVED_ACTIVATION_LIBRARY")
    spec=importlib.util.spec_from_file_location("circle_card_pinned_activation",path)
    need(spec is not None and spec.loader is not None,"ACTIVATION_LIBRARY_INVALID")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    need(module.APPROVED_BUILD_ID==APPROVED_BUILD_ID
         and module.STAGE.name=="circle-card-ecosystem-20261112-002058"
         and module.NEW_UNIT=="circle-card-ecosystem-20261112-002058.service"
         and module.OLD_UNIT=="circle-card-bransons-account-20261109-115143.service",
         "UNRECOGNISED_DEPLOYMENT_IDENTITIES")
    return module


def check_root_file(path,*,private=False):
    need(path.is_file() and not path.is_symlink()
         and path.stat().st_uid==0,
         "PINNED_DEPLOYMENT_ARTIFACT_MISSING_OR_UNSAFE")
    if private:
        need(not stat.S_IMODE(path.stat().st_mode)&0o077,
             "PINNED_DEPLOYMENT_ARTIFACT_NOT_PRIVATE")


def check_public_http(core,port,path,marker=None):
    import http.client
    conn=http.client.HTTPConnection("127.0.0.1",port,timeout=16)
    try:
        conn.request("GET",path,headers={
            "Host":"circlecard.co.uk","X-Forwarded-Proto":"https",
            "Cache-Control":"no-cache"
        })
        response=conn.getresponse()
        status=response.status
        data=response.read(500000)
        need(status==200,"CANDIDATE_PUBLIC_HTTP_NON_200")
        if marker is not None:
            need(marker in data,"CANDIDATE_PUBLIC_CONTENT_MISSING")
    finally:
        conn.close()


def check_private_auth(port):
    import http.client
    from urllib.parse import urlsplit
    path="/app/prepared/cmvzwzm3y000amkahigz25s8r/preview?plan=pro&presentation=custom"
    conn=http.client.HTTPConnection("127.0.0.1",port,timeout=16)
    try:
        conn.request("GET",path,headers={
            "Host":"circlecard.co.uk","X-Forwarded-Proto":"https",
            "Cache-Control":"no-cache",
        })
        res=conn.getresponse()
        redirect=res.getheader("Location") or ""
        res.read(4000)
        need(res.status in (302,303,307,308),
             "PRIVATE_PREVIEW_NOT_REDIRECTED")
        parsed=urlsplit(redirect)
        need(parsed.hostname in (None,"circlecard.co.uk")
             and "/login" in parsed.path,
             "PRIVATE_PREVIEW_NOT_REDIRECTED_TO_LOGIN")
    finally:
        conn.close()


def listener_addresses(core):
    r=core.cmd(["ss","-H","-lnt"],timeout=15)
    need(r.returncode==0,"LISTENING_SOCKET_INSPECTION_FAILED")
    addresses=[]
    for line in r.stdout.splitlines():
        fields=line.split()
        if len(fields)>=5 and fields[3].endswith(":3387"):
            addresses.append(fields[3])
    need(addresses and set(addresses)=={"127.0.0.1:3387"},
         "CANDIDATE_NOT_LOOPBACK_ONLY")
    return addresses


def verified_existing_components(core):
    need(os.geteuid()==0,"ROOT_REQUIRED")
    need(not core.DEPLOYMENT.exists() and not core.DEPLOYMENT.is_symlink(),
         "RELEASE_ACTIVATION_RECORD_ALREADY_PRESENT")
    need(core.expected_process(core.OLD_UNIT,core.LIVE),
         "OLD_LIVE_RELEASE_IDENTITY_CHANGED")
    need(core.expected_process(core.NEW_UNIT,core.STAGE),
         "CORRECTED_CANDIDATE_PROCESS_NOT_ACTIVE")
    new_pid=core.props(core.NEW_UNIT).get("MainPID")
    old_pid=core.props(core.OLD_UNIT).get("MainPID")
    need(core.health(3386,"/login") and core.health(3386,"/card/hucknall-circle-hub"),
         "EXISTING_PUBLIC_RELEASE_NOT_HEALTHY")
    listener_addresses(core)
    need(core.health(3387,"/login"),
         "EXISTING_CORRECTED_RELEASE_NOT_HEALTHY")

    # The backed-up vhost must match the ORIGINAL *currently active*
    # on-disk vhost exactly. Never overwrite an unrelated config.
    target=core.vhost_path()
    original=target.read_bytes()
    matches=re.findall(rb"\bproxy_pass\s+http://127\.0\.0\.1:3386\s*;",original)
    need(len(matches)==1 and not re.search(
        rb"\bproxy_pass\s+http://127\.0\.0\.1:3387\s*;",original),
        "PUBLIC_NGINX_ALREADY_SWITCHED_OR_UNEXPECTED")
    check_root_file(core.NGINX_BACKUP,private=True)
    need(core.NGINX_BACKUP.read_bytes()==original,
         "EXISTING_NGINX_ROLLBACK_BACKUP_MISMATCH")
    need(core.cmd(["nginx","-t"],timeout=25).returncode==0,
         "NGINX_CONFIG_NOT_VALID")

    # Verify both release identity and binaries, without requiring the
    # candidate port to be available (it IS already running).
    check_root_file(core.STATE/"stage.json",private=False)
    record=json.loads((core.STATE/"stage.json").read_text())
    need(record.get("result")=="CONNECTED_ECOSYSTEM_ISOLATED_BUILD_READY"
         and record.get("stage")==str(core.STAGE)
         and record.get("patch_ref")==core.SAVED_PATCH_REF,
         "CANDIDATE_RELEASE_RECEIPT_UNEXPECTED")
    build=core.STAGE/".runtime/circle-card/BUILD_ID"
    check_root_file(build)
    need(build.read_text().strip()==APPROVED_BUILD_ID,
         "CORRECTED_APPROVED_BUILD_NOT_INSTALLED")
    check_root_file(core.STAGE/".runtime/circle-card/server/app-paths-manifest.json")
    for artifact in (build,core.STAGE/".runtime/circle-card/server/app-paths-manifest.json"):
        need(core.cmd(["runuser","-u","circle-card-app","--","test","-r",str(artifact)]).returncode==0,
             "CORRECTED_BUILD_NOT_READABLE_TO_RUNTIME_ACCOUNT")

    check_root_file(core.NEW_UNIT_PATH,private=True)
    check_root_file(core.NEW_ENV,private=True)
    check_root_file(core.NEW_LAUNCHER)
    launcher_directory=core.NEW_LAUNCHER.parent
    need(launcher_directory.is_dir() and not launcher_directory.is_symlink()
         and launcher_directory.stat().st_uid==0,
         "NEW_LAUNCHER_DIRECTORY_UNSAFE")
    need(core.cmd(["runuser","-u","circle-card-app","--","test","-x",str(launcher_directory)]).returncode==0
         and core.cmd(["runuser","-u","circle-card-app","--","test","-r",str(core.NEW_LAUNCHER)]).returncode==0,
         "CORRECTED_LAUNCHER_NOT_ACCESSIBLE")
    unit=core.NEW_UNIT_PATH.read_text(encoding="utf-8")
    launcher=core.NEW_LAUNCHER.read_text(encoding="utf-8")
    need(str(core.NEW_LAUNCHER) in unit
         and "WorkingDirectory="+str(core.STAGE) in unit
         and "EnvironmentFile="+str(core.NEW_ENV) in unit,
         "NEW_UNIT_NOT_BOUND_TO_CORRECTED_LAUNCHER")
    need(str(core.STAGE) in launcher
         and "'-p','3387'" in launcher
         and "'-H','127.0.0.1'" in launcher
         and "validateProtectedStandaloneBilling" in launcher,
         "CORRECTED_LAUNCHER_UNEXPECTED")
    unit_props=core.cmd(["systemctl","show",core.NEW_UNIT,"--no-pager",
                         "--property=FragmentPath,DropInPaths"])
    need(unit_props.returncode==0
         and "FragmentPath="+str(core.NEW_UNIT_PATH) in unit_props.stdout
         and "DropInPaths=" in unit_props.stdout
         and "DropInPaths=\n" in unit_props.stdout,
         "NEW_SYSTEMD_UNIT_FRAGMENT_UNEXPECTED")
    need(core.PREVIOUS_APP_ARCHIVE.is_file()
         and core.checksum(core.PREVIOUS_APP_ARCHIVE)==core.PREVIOUS_APP_SHA,
         "PREVIOUS_APP_ROLLBACK_ARCHIVE_MISSING")
    fresh_db=core.fresh_db_backup()

    for route,marker in (
        ("/login",None),
        ("/circle-card/pro",b"Unlimited standard links"),
        ("/card/hucknall-circle-hub/join",b"Create your free Circle Card"),
        ("/card/hucknall-circle-hub",b"Hucknall"),
        ("/register?source=circle-card",None),
        ("/robots.txt",None),
    ):
        check_public_http(core,3387,route,marker)
    check_private_auth(3387)
    need(core.props(core.OLD_UNIT).get("MainPID")==old_pid
         and core.props(core.NEW_UNIT).get("MainPID")==new_pid
         and core.vhost_path().read_bytes()==original,
         "LIVE_PROCESSES_OR_NGINX_CHANGED_DURING_CHECK")
    existing_certificate_sha256=local_origin_certificate_sha256()
    return {
        "core":core,"target":target,"original":original,
        "db":fresh_db,"old_pid":old_pid,"new_pid":new_pid,
        "origin_cert_sha256":existing_certificate_sha256,
    }


def local_origin_certificate_sha256():
    """Pin the EXISTING origin's SNI leaf cert before and after Nginx reload.

    Origin uses a certificate chain untrusted by the VPS system CA bundle.
    This is an identity *continuity* check, not public CA validation.
    """
    import socket
    import ssl
    context=ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.check_hostname=False
    context.verify_mode=ssl.CERT_NONE
    with socket.create_connection(("127.0.0.1",443),timeout=12) as sock:
        with context.wrap_socket(sock,server_hostname="circlecard.co.uk") as tls:
            certificate=tls.getpeercert(binary_form=True)
            need(isinstance(certificate,bytes) and len(certificate)>100,
                 "ORIGIN_CERTIFICATE_UNAVAILABLE")
            return hashlib.sha256(certificate).hexdigest()


def local_origin_https_health(core,paths):
    """Check Nginx->Next HTTPS locally, without claiming public TLS trust.

    --insecure is used ONLY with --resolve pinned to loopback. A pre/post
    certificate SHA256 guard verifies that the existing origin certificate
    was not replaced by the deployment. Public CA trust must be tested
    separately from an external client or trusted edge.
    """
    for route in paths:
        r=core.cmd([
            "curl","--noproxy","*","--insecure","-sS",
            "--resolve","circlecard.co.uk:443:127.0.0.1",
            "--max-time","20","-o","/dev/null","-w","%{http_code}",
            "https://circlecard.co.uk"+route,
        ],timeout=26)
        need(r.returncode==0 and r.stdout.strip()=="200",
             "POST_SWITCH_ORIGIN_HTTPS_HEALTH_FAILED")


def finish():
    ctx=verified_existing_components(core_module())
    core=ctx["core"]
    target=ctx["target"]
    original=ctx["original"]
    need(target.read_bytes()==original,"NGINX_CHANGED_BEFORE_SWITCH")
    candidate=core.nginx_switched_content(original)
    # Revalidate and atomically switch, but NEVER stop the old 3386 service.
    try:
        core.nginx_write(candidate,target)
        need(core.cmd(["nginx","-t"],timeout=25).returncode==0,
             "NEW_NGINX_CONFIGURATION_INVALID")
        need(core.cmd(["systemctl","reload","nginx"],timeout=25).returncode==0,
             "NEW_NGINX_RELOAD_FAILED")
        need(local_origin_certificate_sha256()==ctx["origin_cert_sha256"],
             "NGINX_ORIGIN_CERTIFICATE_CHANGED")
        local_origin_https_health(core,(
            "/login","/circle-card/pro","/card/hucknall-circle-hub/join",
            "/card/hucknall-circle-hub",
        ))
        need(core.expected_process(core.NEW_UNIT,core.STAGE)
             and core.expected_process(core.OLD_UNIT,core.LIVE)
             and core.props(core.NEW_UNIT).get("MainPID")==ctx["new_pid"]
             and core.props(core.OLD_UNIT).get("MainPID")==ctx["old_pid"]
             and target.read_bytes()==candidate,
             "POST_SWITCH_SERVICE_OR_CONFIG_CHANGED")
        need(core.cmd(["systemctl","enable",core.NEW_UNIT],timeout=25).returncode==0,
             "NEW_UNIT_BOOT_ENABLE_FAILED")
        record={
            "result":"CONNECTED_ECOSYSTEM_PUBLIC_RELEASE_ACTIVATED",
            "created_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
            "release_resumed_from_prestarted_service":True,
            "new_release":str(core.STAGE),"new_service":core.NEW_UNIT,
            "new_port":3387,"old_release":str(core.LIVE),
            "old_service":core.OLD_UNIT,"old_port":3386,
            "nginx_path":str(target),
            "nginx_previous_backup":str(core.NGINX_BACKUP),
            "nginx_previous_sha256":hashlib.sha256(original).hexdigest(),
            "nginx_new_sha256":hashlib.sha256(candidate).hexdigest(),
            "patch_ref":core.SAVED_PATCH_REF,
            "approved_build_id":APPROVED_BUILD_ID,
            "newest_verified_db_dump":ctx["db"]["latest_verified_db_dump"],
            "newest_db_dump_full_restore_test":False,
            "newest_database_dump_created_utc":ctx["db"]["created_utc"],
            "older_database_dump_isolated_restore_verified":True,
            "production_migrations_run":False,
            "old_rollback_unit_preserved":True,
            "authenticated_and_billing_write_tests_performed":False,
            "automatic_recovery_timer_repaired":False,
            "origin_certificate_fingerprint_unchanged":True,
            "post_switch_local_https_routes_healthy":True,
            "external_public_certificate_chain_verified":False,
        }
        need(not core.DEPLOYMENT.exists(),"RECORD_CREATED_BY_CONCURRENT_OPERATION")
        temporary=core.DEPLOYMENT.parent/(".resumed-activation-"+str(os.getpid())+".json")
        need(not temporary.exists(),"TEMPORARY_RECEIPT_ALREADY_EXISTS")
        try:
            with temporary.open("x",encoding="utf-8") as stream:
                json.dump(record,stream,indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            temporary.chmod(0o600)
            os.replace(temporary,core.DEPLOYMENT)
        finally:
            if temporary.exists(): temporary.unlink()
        print(json.dumps(record,indent=2))
    except BaseException:
        if target.read_bytes()!=original:
            if not core.rollback_nginx(target,original):
                raise RuntimeError("ROLLBACK_FAILED_MANUAL_ATTENTION_REQUIRED") from None
        # Keep both old and new services intact for inspection and retry.
        raise


def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check",action="store_true",
                       help="Read-only adoption checks for pre-started candidate")
    group.add_argument("--finish",action="store_true",
                       help="Guarded Nginx switch to verified candidate and rollback receipt")
    args=parser.parse_args()
    if args.check:
        context=verified_existing_components(core_module())
        print(json.dumps({
            "result":"INTERRUPTED_CIRCLE_CARD_RELEASE_READY_TO_FINISH",
            "approved_build_id":APPROVED_BUILD_ID,
            "old_live_healthy":True,
            "new_candidate_healthy":True,
            "nginx_original_backup_matches":True,
            "all_public_candidate_smoke_routes_passed":True,
            "private_card_redirect_protected":True,
            "existing_origin_certificate_fingerprint_recorded_for_switch":True,
            "external_public_certificate_chain_verified":False,
            "fresh_verified_database_backup":context["db"],
            "old_rollback_service_remains_running":True,
            "live_website_changed":False,
            "database_schema_or_billing_changed":False,
        },indent=2))
    else:
        finish()


if __name__=="__main__":
    try:
        main()
    except Exception as error:
        reason=str(error) if isinstance(error,RuntimeError) else type(error).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",reason):
            reason="INTERRUPTED_RELEASE_ABORTED"
        print(json.dumps({
            "result":"INTERRUPTED_CIRCLE_CARD_RELEASE_ABORTED",
            "safe_reason":reason,
            "database_or_customer_data_modified":False,
            "secrets_printed":False,
        },indent=2))
        sys.exit(1)
