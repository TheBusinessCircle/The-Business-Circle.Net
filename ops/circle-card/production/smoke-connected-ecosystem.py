#!/usr/bin/env python3
"""Check and optionally smoke-test the staged ecosystem release on loopback 3387.

Default --check is read-only. --smoke creates a disabled temporary systemd unit,
starts a private preview on 127.0.0.1:3387, tests anonymous GET routes, stops
it and removes the temporary service. NEVER rewrites nginx or production.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time

LIVE=Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
LIVE_UNIT="circle-card-bransons-account-20261109-115143.service"
STAGE=Path("/var/www/releases/circle-card-ecosystem-20261112-002058")
STATE=Path("/var/lib/circle-card-ecosystem-stage/20261112-002058")
RECEIPT=STATE/"stage.json"
UNIT_NAME="circle-card-ecosystem-preview-20261112-002058.service"
UNIT_FILE=Path("/etc/systemd/system")/UNIT_NAME
LAUNCHER_DIR=Path("/opt/thebusinesscircle/circle-card-launchers/ecosystem-preview-20261112-002058")
LAUNCHER_FILE=LAUNCHER_DIR/"launch.mjs"
ENV_FILE=STATE/"preview.env"
VHOST=Path("/etc/nginx/sites-enabled/circlecard.co.uk")
OLD_PORT=3386
PORT=3387
EXPECTED_PATCH="eb668250c363376978fa9f2d9dc27b865e066032"

def require(ok, reason):
    if not ok: raise RuntimeError(reason)

def run(args, *, timeout=20):
    return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
                          stdin=subprocess.DEVNULL,text=True,check=False,timeout=timeout)

def props(unit):
    p=run(["systemctl","show",unit,"--no-pager",
           "--property=ActiveState,MainPID,WorkingDirectory,DropInPaths,FragmentPath,User"])
    require(p.returncode==0,"SYSTEMD_IDENTITY_CHECK_FAILED")
    return dict(line.split("=",1) for line in p.stdout.splitlines() if "=" in line)

def files_and_build():
    require(os.geteuid()==0,"ROOT_REQUIRED")
    p=props(LIVE_UNIT)
    require(p.get("ActiveState")=="active" and p.get("WorkingDirectory")==str(LIVE)
            and not p.get("DropInPaths"),"LIVE_RELEASE_NOT_EXPECTED")
    pid=int(p.get("MainPID") or "0")
    require(pid>1 and (Path("/proc")/str(pid)/"cwd").resolve(strict=True)==LIVE,
            "LIVE_CWD_CHECK_FAILED")
    require(STAGE.is_dir() and not STAGE.is_symlink(),"STAGED_RELEASE_MISSING")
    require(RECEIPT.is_file() and not RECEIPT.is_symlink(),"STAGING_BUILD_RECEIPT_MISSING")
    record=json.loads(RECEIPT.read_text())
    require(record.get("result")=="CONNECTED_ECOSYSTEM_ISOLATED_BUILD_READY"
            and record.get("stage")==str(STAGE)
            and record.get("patch_ref")==EXPECTED_PATCH
            and record.get("live_port")==OLD_PORT
            and record.get("stage_port")==PORT,
            "STAGING_BUILD_RECEIPT_MISMATCH")
    require((STAGE/"src/lib/circle-card/plans.ts").is_file()
            and "Number.MAX_SAFE_INTEGER" in
            (STAGE/"src/lib/circle-card/plans.ts").read_text(),
            "STAGED_LINK_POLICY_MISSING")
    require("Create your free Circle Card" in
            (STAGE/"src/app/(public)/card/hucknall-circle-hub/join/page.tsx").read_text(),
            "STAGED_HUCKNALL_SIGNUP_MISSING")
    dist=None
    for rel in (".runtime/circle-card",".next"):
        candidate=STAGE/rel
        if (candidate/"BUILD_ID").is_file() and (candidate/"standalone/server.js").is_file():
            dist=candidate
            break
    require(dist is not None,"PROTECTED_STANDALONE_BUILD_NOT_FOUND")
    require(dist.resolve().is_relative_to(STAGE),"BUILD_OUTPUT_NOT_IN_STAGE")
    nginx=VHOST.resolve(strict=True)
    require(str(nginx).startswith("/etc/nginx/"),"NGINX_VHOST_UNEXPECTED")
    vhost_before=nginx.read_bytes()
    require(vhost_before.count(b"proxy_pass http://127.0.0.1:3386;")==1,
            "LIVE_PROXY_TARGET_UNEXPECTED")
    with socket.socket() as test:
        try: test.bind(("127.0.0.1",PORT))
        except OSError: raise RuntimeError("STAGE_PREVIEW_PORT_IN_USE") from None
    require(not UNIT_FILE.exists() and not UNIT_FILE.is_symlink()
            and not LAUNCHER_DIR.exists() and not ENV_FILE.exists(),
            "PREVIEW_ARTIFACT_ALREADY_EXISTS")
    unitpath=Path(p.get("FragmentPath") or "")
    require(unitpath.is_file() and str(unitpath).startswith("/etc/systemd/system/"),
            "LIVE_SERVICE_FRAGMENT_UNEXPECTED")
    unit_source=unitpath.read_text()
    require(unit_source.count("WorkingDirectory="+str(LIVE))==1,
            "LIVE_UNIT_WORKDIR_UNEXPECTED")
    require(not re.search(r"(?m)^\s*(?:ExecStop|PIDFile|ExecStartPre|ExecStartPost)\s*=",unit_source),
            "LIVE_UNIT_CUSTOM_LIFECYCLE_NOT_SUPPORTED")
    found=re.findall(r"/opt/thebusinesscircle/circle-card-launchers/[^\s\"']+/launch\.mjs",unit_source)
    require(len(set(found))==1 and len(found)>=1,"PROTECTED_LAUNCHER_NOT_FOUND")
    original=Path(found[0])
    require(original.is_file(),"PROTECTED_LAUNCHER_MISSING")
    launcher=original.read_text()
    required=("process.getuid()===0","process.env.USER!=='circle-card-app'",
              "process.env.LOGNAME!=='circle-card-app'",
              "realpathSync(process.cwd())!==","readEnvironmentJson",
              "validateProtectedStandaloneBilling")
    require(all(part in launcher for part in required),
            "PROTECTED_LAUNCHER_VALIDATIONS_CHANGED")
    require(launcher.count(str(LIVE))>=1
            and launcher.count("'PORT':'3386'")==0,
            "LAUNCHER_PATH_OR_PORT_UNEXPECTED")
    replacements=[("'-p','3386'","'-p','3387'"),("PORT:'3386'","PORT:'3387'")]
    require(all(launcher.count(before)==1 for before,after in replacements),
            "LAUNCHER_PORT_FORMAT_CHANGED")
    cloned_launcher=launcher.replace(str(LIVE),str(STAGE))
    for before,after in replacements:
        cloned_launcher=cloned_launcher.replace(before,after)
    cloned_unit=unit_source.replace(str(LIVE),str(STAGE)).replace(str(original),str(LAUNCHER_FILE))
    require(cloned_unit!=unit_source,"UNIT_NOT_CLONED")
    cloned_unit += "\n[Service]\nEnvironmentFile="+str(ENV_FILE)+"\n"
    return {"pid":pid,"dist":dist,"nginx":nginx,"vhost":vhost_before,
            "unit":cloned_unit,"launcher":cloned_launcher}

def request(path):
    conn=http.client.HTTPConnection("127.0.0.1",PORT,timeout=15)
    try:
        conn.request("GET",path,headers={"Host":"circlecard.co.uk",
                                         "X-Forwarded-Proto":"https",
                                         "Cache-Control":"no-cache"})
        res=conn.getresponse()
        data=res.read(500000)
        return res.status,data
    finally:
        conn.close()

def smoke(ctx):
    created=[]
    started=False
    try:
        dist=ctx["dist"]
        standalone=dist/"standalone"
        require(not standalone.is_symlink(),"STANDALONE_DIRECTORY_UNSAFE")
        for source,destination in (
            (STAGE/"public",standalone/"public"),
            (dist/"static",standalone/dist.relative_to(STAGE)/"static"),
        ):
            if source.is_dir():
                require(not source.is_symlink() and not destination.is_symlink(),
                        "STATIC_SOURCE_OR_TARGET_SYMLINK_UNSAFE")
                shutil.copytree(source,destination,dirs_exist_ok=True,symlinks=True)
        LAUNCHER_DIR.mkdir(mode=0o755)
        created.append("launcher_directory")
        LAUNCHER_FILE.write_text(ctx["launcher"])
        LAUNCHER_FILE.chmod(0o644)
        require(run(["node","--check",str(LAUNCHER_FILE)]).returncode==0,
                "PREVIEW_LAUNCHER_SYNTAX_FAILED")
        ENV_FILE.write_text("PORT=3387\nHOSTNAME=127.0.0.1\n")
        ENV_FILE.chmod(0o600)
        UNIT_FILE.write_text(ctx["unit"])
        UNIT_FILE.chmod(0o600)
        created.append("service")
        require(run(["systemctl","daemon-reload"],timeout=30).returncode==0,
                "SYSTEMD_PREVIEW_RELOAD_FAILED")
        require(run(["systemctl","start",UNIT_NAME],timeout=65).returncode==0,
                "PREVIEW_SERVICE_START_FAILED")
        started=True
        listeners=run(["ss","-H","-lnt"],timeout=8)
        require(listeners.returncode==0,"PREVIEW_LISTENER_INSPECTION_FAILED")
        local_lines=[line for line in listeners.stdout.splitlines()
                     if re.search(r"(?<!\d):3387(?!\d)",line)]
        require(local_lines and all("127.0.0.1:3387" in line for line in local_lines),
                "PREVIEW_LISTENING_NOT_RESTRICTED_TO_LOOPBACK")
        page_results={}
        for attempt in range(35):
            try:
                status,data=request("/login")
                if status==200: break
            except (OSError,http.client.HTTPException):
                pass
            time.sleep(1.2)
        else:
            raise RuntimeError("PREVIEW_LOGIN_NOT_HEALTHY")
        for route,expected_marker in [
            ("/circle-card/pro",b"Unlimited standard links"),
            ("/card/hucknall-circle-hub/join",b"Create your free Circle Card"),
        ]:
            status,body=request(route)
            require(status==200,"PREVIEW_ROUTE_NON_200")
            require(expected_marker in body,
                    "PREVIEW_FEATURE_MARKER_NOT_RENDERED")
            page_results[route]={"status":status,"feature_marker_present":True}
        require(ctx["nginx"].read_bytes()==ctx["vhost"],"NGINX_VHOST_CHANGED")
        require(props(LIVE_UNIT).get("MainPID")==str(ctx["pid"]),
                "LIVE_PROCESS_CHANGED")
        passed={
            "result":"ISOLATED_ECOSYSTEM_PREVIEW_SMOKE_PASSED",
            "preview_port":PORT,"live_port":OLD_PORT,
            "anonymous_routes":page_results,
            "billing_or_authenticated_actions_tested":False,
            "production_site_switched":False,
            "nginx_configuration_unchanged":True,
        }
    finally:
        if created:
            stop=run(["systemctl","stop",UNIT_NAME],timeout=45)
            listeners=run(["ss","-H","-lnt"],timeout=8)
            still_open=(listeners.returncode!=0 or any(
                re.search(r"(?<!\\d):3387(?!\\d)",line)
                for line in listeners.stdout.splitlines()
            ))
            if stop.returncode!=0 or still_open:
                # Keep the unit and launcher so an operator can investigate
                # or stop this exact transient unit; do not sever the service
                # while the preview could still be running.
                raise RuntimeError("PREVIEW_STOP_NOT_CONFIRMED_ARTIFACTS_PRESERVED")
            run(["systemctl","reset-failed",UNIT_NAME],timeout=25)
            if UNIT_FILE.exists(): UNIT_FILE.unlink()
            if ENV_FILE.exists(): ENV_FILE.unlink()
            if LAUNCHER_FILE.exists(): LAUNCHER_FILE.unlink()
            if LAUNCHER_DIR.is_dir():
                try: LAUNCHER_DIR.rmdir()
                except OSError: pass
            require(run(["systemctl","daemon-reload"],timeout=25).returncode==0,
                    "PREVIEW_CLEANUP_DAEMON_RELOAD_FAILED")
    print(json.dumps(passed,indent=2))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--smoke",action="store_true",
                        help="Start and stop a disabled private preview, test public routes only")
    opts=parser.parse_args()
    ctx=files_and_build()
    if opts.smoke: smoke(ctx)
    else:
        print(json.dumps({"result":"ISOLATED_PREVIEW_PRECHECK_READY",
                          "protected_launcher_clone_compatible":True,
                          "staged_compiled_standalone_present":True,
                          "live_service_preserved":True,
                          "writes_made":False},indent=2))

if __name__=="__main__":
    try: main()
    except Exception as exc:
        reason=str(exc) if isinstance(exc,RuntimeError) else type(exc).__name__.upper()
        if not re.fullmatch(r"[A-Z0-9_]+",reason):
            reason="PREVIEW_VALIDATION_ABORTED"
        print(json.dumps({"result":"ISOLATED_PREVIEW_ABORTED","safe_reason":reason,
                          "nginx_not_changed_by_this_script":True,
                          "live_service_not_switched":True},indent=2))
        sys.exit(1)
