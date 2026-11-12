#!/usr/bin/env python3
"""Safely stage Circle Card features against the ACTUAL live release.

Default mode is read-only. --prepare copies, patches and compiles a separate
candidate. This tool never changes live code, Nginx, systemd or databases.
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, re, shutil, socket, subprocess, sys, urllib.request
from pathlib import Path

LIVE=Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
UNIT="circle-card-bransons-account-20261109-115143.service"
PATCH_REF="eb668250c363376978fa9f2d9dc27b865e066032"
PATCH_URL="https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net/"+PATCH_REF+"/ops/circle-card/production/one-connected-ecosystem-features.patch"
FILES={
"src/app/(public)/circle-card/pro/page.tsx",
"src/app/(public)/card/hucknall-circle-hub/join/page.tsx",
"src/components/circle-card/circle-card-plan-panel.tsx",
"src/lib/circle-card/plan-policy.test.ts",
"src/lib/circle-card/plans.test.ts",
"src/lib/circle-card/plans.ts",
"src/lib/circle-card/pricing.ts",
"src/server/circle-card/billing-access.service.test.ts",
}
BACKUPS=[
("/var/backups/circle-card-safety/circle-card-db-20261111T232300Z.dump","1cc9b8cc72d8da831c17cda6c77eb51e2a459714e0f95c18773950fee796dad7"),
("/var/backups/circle-card-safety/circle-card-app-20261111T235024Z.tar.gz","cafc513a55025975187296e95dec3515382816c7e1e0eb51c6dc80939d57380c"),
]


def need(value,code):
    if not value: raise RuntimeError(code)


def cmd(args,**kwargs):
    return subprocess.run(args,check=False,stdin=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL,**kwargs)


def sha(file):
    h=hashlib.sha256()
    with Path(file).open("rb") as fp:
        for data in iter(lambda:fp.read(1024*1024),b""):
            h.update(data)
    return h.hexdigest()


def live():
    need(os.geteuid()==0,"ROOT_REQUIRED")
    a=cmd(["systemctl","show",UNIT,"--no-pager","--property=ActiveState,MainPID,WorkingDirectory,DropInPaths"],
          stdout=subprocess.PIPE)
    need(a.returncode==0,"LIVE_UNIT_UNAVAILABLE")
    p=dict(line.split("=",1) for line in a.stdout.decode().splitlines() if "=" in line)
    need(p.get("ActiveState")=="active" and p.get("WorkingDirectory")==str(LIVE)
         and not p.get("DropInPaths"),"LIVE_UNIT_CHANGED")
    pid=int(p.get("MainPID") or 0)
    need(pid>1 and (Path("/proc")/str(pid)/"cwd").resolve(strict=True)==LIVE,
         "LIVE_CWD_CHANGED")
    need(not LIVE.is_symlink() and LIVE.is_dir(),"LIVE_RELEASE_UNAVAILABLE")
    for name in FILES:
        path=LIVE/name
        need(path.is_file() and not path.is_symlink(),"MISSING_LIVE_SOURCE_FILE")
    health=cmd(["curl","--noproxy","*","-sS","-o","/dev/null","-w","%{http_code}",
                "--max-time","15","-H","Host: circlecard.co.uk",
                "-H","X-Forwarded-Proto: https","http://127.0.0.1:3386/login"],
               stdout=subprocess.PIPE)
    need(health.returncode==0 and health.stdout.strip()==b"200","LIVE_HTTP_UNHEALTHY")
    with socket.socket() as sock:
        try: sock.bind(("127.0.0.1",3387))
        except OSError: raise RuntimeError("STAGING_PORT_OCCUPIED") from None
    return pid


def archive_guard():
    for name,digest in BACKUPS:
        path=Path(name)
        need(path.is_file() and not path.is_symlink() and path.stat().st_uid==0,
             "PINNED_BACKUP_UNAVAILABLE")
        need(sha(path)==digest,"PINNED_BACKUP_HASH_MISMATCH")
    need(shutil.disk_usage("/var/www/releases").free >= 6*1024**3,
         "INSUFFICIENT_FREE_DISK_FOR_STAGING")
    info=Path("/proc/meminfo").read_text()
    m=re.search(r"^MemAvailable:\s+(\d+)\s+kB",info,re.M)
    need(m is not None and int(m.group(1))>=5400*1024,
         "INSUFFICIENT_AVAILABLE_MEMORY_FOR_BUILD")


def patch_data():
    with urllib.request.urlopen(PATCH_URL,timeout=35) as response:
        data=response.read(100001)
    need(1000<=len(data)<=100000,"FEATURE_PATCH_SIZE_INVALID")
    text=data.decode("utf8")
    p=re.findall(r"(?m)^diff --git a/(.+) b/(.+)$",text)
    need(len(p)==len(FILES) and {a for a,b in p if a==b}==FILES,
         "FEATURE_PATCH_TARGETS_INVALID")
    need("Number.MAX_SAFE_INTEGER" in text and "Create your free Circle Card" in text,
         "FEATURE_PATCH_SIGNATURE_MISSING")
    return data


def git_apply(where,data,check):
    args=["git","apply"]
    if check: args.append("--check")
    args.extend(["--whitespace=nowarn","-"])
    return subprocess.run(args,cwd=where,input=data,
                          stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
                          timeout=35,check=False).returncode==0


def build_env(pid,stage):
    env=dict(os.environ)
    for bit in (Path("/proc")/str(pid)/"environ").read_bytes().split(b"\x00"):
        k,sep,v=bit.partition(b"=")
        if sep: env[os.fsdecode(k)]=os.fsdecode(v)
    for key in ("INVOCATION_ID","NOTIFY_SOCKET","JOURNAL_STREAM",
                "LISTEN_PID","LISTEN_FDS","WATCHDOG_PID","WATCHDOG_USEC"):
        env.pop(key,None)
    for k,v in list(env.items()):
        if v.startswith(str(LIVE)+"/"): env[k]=str(stage)+v[len(str(LIVE)):]
    env.update({"PORT":"3387","HOSTNAME":"127.0.0.1","NODE_ENV":"production",
                "NODE_OPTIONS":"--max-old-space-size=3072",
                "NEXT_TELEMETRY_DISABLED":"1","PWD":str(stage)})
    return env


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--prepare",action="store_true",
                        help="Copy and build isolated candidate without switching production traffic")
    opts=parser.parse_args()
    pid=live()
    archive_guard()
    patch=patch_data()
    need(git_apply(LIVE,patch,True),"PATCH_NOT_COMPATIBLE_WITH_REAL_LIVE_SOURCE")
    scripts=json.loads((LIVE/"package.json").read_text())["scripts"]
    build=scripts.get("build")
    need(build in ("next build",
                  "next build && node scripts/verify-circle-card-action-build.mjs"),
         "UNRECOGNISED_BUILD_SCRIPT")
    if not opts.prepare:
        print(json.dumps({"result":"ISOLATED_FEATURE_STAGE_PREFLIGHT_READY",
                          "live_source_patch_compatible":True,
                          "backups_sha256_verified":True,
                          "available_disk_gib":round(shutil.disk_usage("/var/www/releases").free/1024**3,2),
                          "writes_made":False},indent=2))
        return
    os.umask(0o077)
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
    stage=Path("/var/www/releases")/("circle-card-ecosystem-"+stamp)
    state=Path("/var/lib/circle-card-ecosystem-stage")/stamp
    need(not stage.exists() and not state.exists(),"STAGE_ALREADY_EXISTS")
    state.mkdir(mode=0o700,parents=True)
    stage.mkdir(mode=0o755)
    stage.chmod(0o755)
    print("Copying live release to isolated staging directory.",flush=True)
    copy=cmd(["cp","-a","--reflink=auto",str(LIVE)+"/.",str(stage)],timeout=300)
    need(copy.returncode==0,"ISOLATED_STAGE_COPY_FAILED_LIVE_UNCHANGED")
    need((stage/"package.json").read_bytes()==(LIVE/"package.json").read_bytes(),
         "STAGE_PACKAGE_DIFFERS_FROM_LIVE")
    need(git_apply(stage,patch,False),"STAGE_PATCH_FAILED_LIVE_UNCHANGED")
    for name in (".next",".runtime/circle-card"):
        output=stage/name
        if output.is_symlink(): output.unlink()
        elif output.is_dir(): shutil.rmtree(output)
    log=state/"build.log"
    print("Building candidate only; live remains on port 3386.",flush=True)
    with log.open("wb") as stream:
        result=cmd(["node","node_modules/next/dist/bin/next","build"],
                   cwd=stage,env=build_env(pid,stage),
                   stdout=stream,timeout=720)
        if result.returncode==0 and "verify-circle-card-action-build.mjs" in build:
            result=cmd(["node","scripts/verify-circle-card-action-build.mjs"],
                       cwd=stage,env=build_env(pid,stage),
                       stdout=stream,timeout=120)
    need(result.returncode==0,"STAGING_BUILD_FAILED_LOG_PRIVATE_LIVE_UNCHANGED")
    need(live()==pid,"LIVE_CHANGED_DURING_STAGING")
    record={"result":"CONNECTED_ECOSYSTEM_ISOLATED_BUILD_READY",
            "stage":str(stage),"private_build_log":str(log),
            "patch_ref":PATCH_REF,"live_port":3386,"stage_port":3387,
            "preview_service_started":False,"nginx_switched":False,
            "database_migrated":False}
    (state/"stage.json").write_text(json.dumps(record,indent=2))
    print(json.dumps(record,indent=2))


if __name__=="__main__":
    try: main()
    except BaseException as error:
        code=str(error) if isinstance(error,RuntimeError) else type(error).__name__.upper()
        if not re.fullmatch("[A-Z_0-9]+",code): code="STAGING_ABORTED"
        print(json.dumps({"result":"ISOLATED_STAGE_ABORTED","reason":code,
                          "live_code_changed":False,
                          "production_traffic_switched":False},indent=2))
        sys.exit(1)
