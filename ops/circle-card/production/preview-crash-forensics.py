#!/usr/bin/env python3
"""Read-only, redacted forensics for failed Circle Card isolated preview.

Never prints raw journald messages, environment variables, file contents,
hostnames, routes, passwords, database addresses or source code. Does not start,
stop, enable or modify services. Examines the previous 3h of the pinned
preview systemd unit and compares root-owned build file readability to the
dedicated runtime account, without reading private file contents.
"""
from __future__ import annotations

from collections import Counter
import datetime as dt
import json
import os
from pathlib import Path
import pwd
import re
import subprocess
import sys

UNIT = "circle-card-ecosystem-preview-20261112-002058.service"
LIVE_UNIT = "circle-card-bransons-account-20261109-115143.service"
LIVE = Path("/var/www/releases/circle-card-bransons-account-20261109-115143")
STAGE = Path("/var/www/releases/circle-card-ecosystem-20261112-002058")
BUILDS = (".runtime/circle-card", ".next")
SAFE_CODES = {
    "NODE_MISSING_BUILD": r"could not find a production build|couldn.t find a production build|production build not found",
    "NODE_MODULE_NOT_FOUND": r"cannot find module|err_module_not_found|module_not_found",
    "NODE_UNKNOWN_OPTION": r"unknown option|unknown argument|unknown or unexpected option",
    "FILESYSTEM_PERMISSION_DENIED": r"eacces|eperm|permission denied|operation not permitted",
    "FILESYSTEM_MISSING": r"enoent|no such file or directory",
    "DATABASE_UNAVAILABLE": r"econnrefused|p1001|could not connect to database|unable to connect to database",
    "DATABASE_AUTHENTICATION": r"p1000|password authentication failed|authentication failed",
    "DATABASE_SCHEMA_MISMATCH": r"p2022|relation .*does not exist|column .*does not exist",
    "APPLICATION_AUTH_CONFIGURATION": r"untrustedhost|autherror|nextauth_url|secret must be provided",
    "BILLING_VALIDATION": r"validateprotectedstandalonebilling|billing configuration|stripe.*configuration",
    "REQUIRED_ENVIRONMENT_MISSING": r"missing .*environment|environment variable .*not set|no .*secret provided",
    "JAVASCRIPT_SYNTAX_ERROR": r"syntaxerror|unexpected token|unexpected identifier",
    "JAVASCRIPT_REFERENCE_ERROR": r"referenceerror|not defined",
    "JAVASCRIPT_TYPE_ERROR": r"typeerror|is not a function|cannot read properties",
    "PROCESS_UNHANDLED_EXCEPTION": r"uncaught exception|unhandledrejection|unhandled rejection|fatal error",
    "PROCESS_OUT_OF_MEMORY": r"heap out of memory|javascript heap out of memory|oom|out of memory",
    "PORT_ALREADY_IN_USE": r"eaddrinuse|address already in use",
    "PROCESS_ABORT_SIGNAL": r"signal=abrt|signal=segv|sigabrt|sigsegv",
    "SYSTEMD_PROCESS_EXITED": r"main process exited|control process exited",
    "SYSTEMD_RESTART_SCHEDULED": r"scheduled restart job|restart counter",
    "SYSTEMD_UNIT_FAILED": r"failed with result|failed to start",
    "SYSTEMD_SERVICE_STARTED": r"started .*circle.card|started circle.card",
    "HTTP_RUNTIME_ERROR": r"get /login 500|internal server error",
    "RUNTIME_READY": r"ready in [0-9]|listening on|local:\s+http",
}
CODE_PATTERNS = {
    "EXIT_1": r"(?:status|code)=1(?:/|\b)",
    "EXIT_2": r"(?:status|code)=2(?:/|\b)",
    "EXIT_9": r"(?:status|code)=9(?:/|\b)",
    "EXIT_137": r"(?:status|code)=137(?:/|\b)",
    "EXIT_143": r"(?:status|code)=143(?:/|\b)",
}
MAX_EVENTS = 25


def command(args, *, timeout=18):
    return subprocess.run(args, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          timeout=timeout, check=False, text=True)


def relevant_categories(message):
    low=message.lower()
    result=[name for name,pattern in SAFE_CODES.items() if re.search(pattern,low)]
    result.extend(name for name,pattern in CODE_PATTERNS.items() if re.search(pattern,low))
    return sorted(set(result))


def event_time(entry):
    raw=entry.get("__REALTIME_TIMESTAMP")
    try:
        stamp=int(raw)/1000000
        return dt.datetime.fromtimestamp(stamp,dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, TypeError, OverflowError, OSError):
        return None


def journal_summary():
    result=command(["journalctl","--unit",UNIT,"--since=-3h",
                    "--no-pager","--output=json","--lines=650"],timeout=30)
    if result.returncode not in (0,):
        return {"result":"JOURNAL_NOT_ACCESSIBLE"}
    total=0
    counts=Counter()
    events=[]
    for line in result.stdout.splitlines():
        try:
            entry=json.loads(line)
        except (ValueError, TypeError):
            continue
        total+=1
        message=entry.get("MESSAGE","")
        if not isinstance(message,str):
            continue
        categories=relevant_categories(message)
        for code in categories:
            counts[code]+=1
        if categories:
            events.append({"utc":event_time(entry),"categories":categories})
    return {
        "result":"READ_ONLY_JOURNAL_CLASSIFICATION",
        "journal_records_examined":total,
        "recognised_error_and_lifecycle_categories":dict(sorted(counts.items())),
        "last_recognised_events":events[-MAX_EVENTS:],
        "raw_journal_messages_printed":False,
    }


def unit_status():
    proc=command(["systemctl","show",LIVE_UNIT,"--no-pager",
                  "--property=ActiveState,MainPID,WorkingDirectory"],timeout=12)
    props=dict(line.split("=",1) for line in proc.stdout.splitlines() if "=" in line)
    pid=props.get("MainPID","")
    valid=(proc.returncode==0 and props.get("ActiveState")=="active"
           and props.get("WorkingDirectory")==str(LIVE)
           and pid.isdigit() and int(pid)>1)
    if valid:
        try:
            valid=(Path("/proc")/pid/"cwd").resolve(strict=True)==LIVE
        except (OSError,RuntimeError):
            valid=False
    return {"expected_production_active_and_unchanged":valid}


def stage_file_access():
    try:
        account=pwd.getpwnam("circle-card-app")
    except KeyError:
        return {"result":"EXPECTED_PREVIEW_RUNTIME_ACCOUNT_NOT_FOUND"}
    files={
        "stage_directory":STAGE,
        "package_json":STAGE/"package.json",
        "node_next_cli":STAGE/"node_modules/next/dist/bin/next",
    }
    for rel in BUILDS:
        files["compiled_build_"+rel.replace("/","_").replace(".","_")]=STAGE/rel/"BUILD_ID"
        files["compiled_server_manifest_"+rel.replace("/","_").replace(".","_")]=STAGE/rel/"server/app-paths-manifest.json"
    output={}
    for label,path in files.items():
        if not path.exists():
            output[label]={"exists":False}
            continue
        stat=command(["runuser","-u",account.pw_name,"--","test","-r",str(path)])
        traverse=command(["runuser","-u",account.pw_name,"--","test","-x",str(path.parent)])
        output[label]={
            "exists":True,
            "readable_by_preview_user":stat.returncode==0,
            "parent_traversable_by_preview_user":traverse.returncode==0,
        }
    return output


def main():
    if os.geteuid()!=0:
        raise RuntimeError("ROOT_REQUIRED")
    report={
        "result":"ISOLATED_PREVIEW_CRASH_FORENSICS",
        "pinned_preview_unit":UNIT,
        "production":unit_status(),
        "journal":journal_summary(),
        "staged_file_access":stage_file_access(),
        "actions":"READ_ONLY",
        "live_service_modified":False,
        "site_routing_modified":False,
        "raw_server_log_lines_printed":False,
        "secrets_printed":False,
    }
    print(json.dumps(report,indent=2))


if __name__=="__main__":
    try:
        main()
    except Exception as error:
        name=type(error).__name__
        print(json.dumps({
            "result":"PREVIEW_CRASH_FORENSICS_ABORTED",
            "exception_type":name,
            "secrets_printed":False,
        },indent=2))
        sys.exit(1)
