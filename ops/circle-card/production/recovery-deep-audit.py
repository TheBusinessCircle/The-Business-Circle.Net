#!/usr/bin/env python3
"""Read-only Circle Card recovery diagnosis, withholding credentials and log text.

Reports timer/service state, recovery executable metadata, categorized recent
errors, nearby backup filenames+sizes and available resources. No writes.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
import shlex
import subprocess

SERVICE="circle-card-recovery.service"
TIMER="circle-card-recovery.timer"

def run(argv, timeout=15):
    try:
        p=subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
        return p.stdout if p.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""

def unit_props(name, fields):
    raw=run(["systemctl","show",name,"--no-pager","--property="+",".join(fields)])
    return {k:v for line in raw.splitlines() for k,sep,v in [line.partition("=")] if sep and k in fields}

def recovery_entrypoint():
    p=Path("/etc/systemd/system/circle-card-recovery.service")
    if not p.is_file():
        return {"exists":False}
    try:
        data=p.read_text(errors="replace")
        matches=re.findall(r"(?m)^\s*ExecStart\s*=\s*(.+)$",data)
        entries=[]
        for raw in matches[:3]:
            try:
                args=shlex.split(raw)
            except ValueError:
                args=[]
            # Do not show shell arguments, passwords, URLs or tokens.
            file_tokens=[t for t in args if t.startswith("/") and not any(x in t for x in ("=", "://", "@"))]
            safe_paths=[]
            for token in file_tokens[:3]:
                file=Path(token)
                stat={}
                try:
                    if file.is_file() and not file.is_symlink():
                        stat={"file_exists":True,"size_bytes":file.stat().st_size,
                              "sha256":hashlib.sha256(file.read_bytes()[:2*1024*1024]).hexdigest()}
                    else:
                        stat={"file_exists":False}
                except OSError:
                    stat={"file_read_error":True}
                safe_paths.append({"path":token,**stat})
            entries.append({"executables_or_script_paths":safe_paths,"arguments_redacted":True})
        return {"exists":True,"entries":entries,"working_directory_line_present":bool(re.search(r"(?m)^\s*WorkingDirectory\s*=",data)),
                "environment_variables_redacted":True}
    except OSError:
        return {"exists":True,"read_error":True}

def recent_journal_categories():
    raw=run(["journalctl","-u",SERVICE,"--no-pager","-o","cat","-n","180"])
    patt={
        "release_or_process_discovery":r"release|systemctl|working.directory|process.cwd|active server|service",
        "missing_file_or_directory":r"no such file|not found|missing|does not exist",
        "permission_issue":r"permission denied|operation not permitted",
        "disk_capacity":r"no space left|disk full|not enough.*disk",
        "postgres_or_database":r"postgres|pg_dump|psycopg|prisma|database|sqlite",
        "backup_creation":r"backup|archive|snapshot|dump",
        "failed_assertion":r"assertionerror|assert failed",
        "python_traceback":r"traceback \(most recent call last\)",
        "uncaught_error":r"exception|error|failed|failure",
        "timeout":r"timed out|timeout",
    }
    matched={k:bool(re.search(v,raw,re.I)) for k,v in patt.items()}
    exception_types=sorted(set(re.findall(r"\b([A-Za-z_][A-Za-z_0-9.]*(?:Error|Exception))\b",raw)))[:20]
    traceback_files=[]
    for value in re.findall(r'File "([^"]+)", line (\d+)',raw)[-15:]:
        # File basenames only, no traceback code, environment or log text.
        traceback_files.append({"basename":Path(value[0]).name[:70],"line":int(value[1])})
    return {"matching_categories":matched,"exception_types":exception_types,
            "traceback_locations":traceback_files,"raw_logs_omitted":True}

def backup_candidates():
    roots=["/var/lib/circle-card-recovery","/var/backups/circle-card","/var/lib/circle-card/backups",
           "/var/backups","/root/backups","/var/www/backups"]
    observations=[]
    for base in roots:
        root=Path(base)
        if not root.is_dir():
            continue
        candidates=[]
        examined=0
        # Do not recurse arbitrary server paths; depth <=2.
        try:
            for p in root.glob("*"):
                if not p.is_symlink() and p.is_file():
                    items=[p]
                elif p.is_dir() and not p.is_symlink():
                    items=[c for c in p.glob("*") if c.is_file() and not c.is_symlink()]
                else:
                    items=[]
                for file in items:
                    examined+=1
                    if examined>2000:
                        break
                    n=file.name.lower()
                    skip=(n.startswith("dpkg.") or n.startswith("apt.") or n.endswith(".lock"))
                    possible=bool(re.search(r"circle.card|pg.dump|postgres|\.sql(?:\.|$)|\.dump$|\.backup$|\.sqlite(?:3)?$|\.db$|\.tar(?:\.|$)|\.tgz$|\.zst$|\.zip$",n))
                    if not possible or skip:
                        continue
                    try:
                        st=file.stat()
                        if st.st_size==0:
                            continue
                        candidates.append({
                            "relative_path":str(file.relative_to(root))[:160],
                            "size_MiB":round(st.st_size/(1024*1024),2),
                            "modified_utc":dt.datetime.fromtimestamp(st.st_mtime,dt.timezone.utc).isoformat(timespec="seconds"),
                        })
                    except OSError:
                        pass
                if examined>2000:
                    break
        except OSError:
            pass
        candidates.sort(key=lambda v:v["modified_utc"],reverse=True)
        observations.append({"directory":base,"scanned_files":examined,"candidates":candidates[:15]})
    return observations

def main():
    report={
        "mode":"READ_ONLY_RECOVERY_ROOT_CAUSE",
        "generated_utc":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "service":unit_props(SERVICE,["ActiveState","Result","ExecMainStatus","TriggeredBy","FragmentPath","UnitFileState","InactiveEnterTimestamp"]),
        "timer":unit_props(TIMER,["ActiveState","UnitFileState","NextElapseUSecRealtime","LastTriggerUSec","Triggers"]),
        "recovery_entrypoint":recovery_entrypoint(),
        "recent_log_categories":recent_journal_categories(),
        "backup_candidates_metadata_only":backup_candidates(),
        "database_backup_validated":False,
        "restore_test_validated":False,
        "production_changes_made":False,
        "note":"Does not verify backups or repair the timer. No raw logs, environment values, passwords or database contents are printed."
    }
    print(json.dumps(report,indent=2))

if __name__=="__main__":
    main()
