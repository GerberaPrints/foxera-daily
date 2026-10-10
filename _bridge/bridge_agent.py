#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
bridge_agent.py — CAU NOI HAI CHIEU cloud <-> foxera-server qua repo git.   v1.0.0 (10/10/2026)

    python _bridge\bridge_agent.py            (chay moi task trong _bridge\inbox)
    python _bridge\bridge_agent.py --selftest (tu kiem, khong dong vao may)

Y TUONG: phien Claude tren cloud KHONG noi duoc toi may (khong co device link), nhung
repo nay thi ca hai ben deu ghi duoc: job _pcfetch da push tu may len moi 04:30 hon
50 ngay. Vay dung chinh kenh do:
    cloud ghi   _bridge/inbox/<id>.json   (YEU CAU)
    may  ghi    _bridge/outbox/<id>.json  (KET QUA)
Agent nay chay tren may theo lich, lam dung 5 loai viec, roi dung.

=== BA LUAT AN TOAN — KHONG THUONG LUONG ===
 1. KHONG THUC THI MA TUY Y. Repo la PUBLIC. Loai 'cmd' chi chay ten lenh co trong
    ALLOWED_CMDS (chuoi co dinh trong file nay), khong nhan tham so tu inbox.
 2. CHI DOC trong ALLOWED_ROOTS. Duong dan ra ngoai (ke ca qua ..) -> tu choi.
 3. Ma moi (stage) KHONG tu ap. 'stage_apply' chi chep khi sha256 cua manifest co
    trong file duyet NGOAI repo (%USERPROFILE%\\foxera_bridge_approve.txt) do NGUOI
    ghi bang approve.bat. May tu quet, nguoi duyet ma.

=== LUAT VAN HANH KE THUA (S2/S4/S6/S7/S15/S16) ===
 - Gio ghi theo may (Bangkok), khong UTC.
 - Khong lay duoc thi ghi "error" ro nguyen nhan, khong de trong (S4).
 - Thieu config/thieu root -> dung voi loi, khong roi ve mac dinh (S6).
 - Ket qua la JSON cho may parse; khong co truong 'status: ok' tu khai neu buoc kiem fail (S16).
 - Che bi mat bang chinh PATTERNS cua gpredactsecrets.py (import theo duong dan).

Stdlib-only. Python 3.8+. Chay duoc ca Windows lan Linux (selftest).
"""
import fnmatch
import glob
import hashlib
import io
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone, timedelta

VERSION = "1.1.0"
TZ = timezone(timedelta(hours=7))

HERE = os.path.dirname(os.path.abspath(__file__))        # <repo>/_bridge
ROOT = os.path.dirname(HERE)                             # <repo>
INBOX = os.path.join(HERE, "inbox")
OUTBOX = os.path.join(HERE, "outbox")
DONE = os.path.join(HERE, "done")
STAGE = os.path.join(HERE, "stage")
BACKUP = os.path.join(HERE, "backup")
HEALTH = os.path.join(HERE, "health.json")
CONFIG = os.path.join(HERE, "bridge_config.json")

MAX_READ_BYTES = 200_000       # 1 file
MAX_TASK_BYTES = 2_000_000     # 1 ket qua
MAX_TREE_ENTRIES = 5000
CMD_TIMEOUT = 600

# Ten lenh -> (argv, cwd tuong doi theo khoa trong config.roots). Chi chuoi co dinh.
# Them lenh = sua FILE NAY = qua review git. Khong co lenh nao nhan tham so tu inbox.
ALLOWED_CMDS = {
    "engine_version":   {"argv": ["py", "-3.11", "-c",
                                  "from foxera_core.ideas import __version__ as v;print(v)"],
                         "cwd": "platform"},
    "idea_check_gritfell": {"argv": ["cmd", "/c", "idea_check.bat", "gritfell"], "cwd": "platform"},
    "idea_audit":       {"argv": ["cmd", "/c", "idea_audit.bat"], "cwd": "platform"},
    "pytest_platform":  {"argv": ["py", "-3.11", "-m", "pytest", "-q", "--no-header", "-p", "no:cacheprovider"],
                         "cwd": "platform"},
    "schtasks_list":    {"argv": ["schtasks", "/Query", "/FO", "LIST", "/V"], "cwd": "repo", "keep": "head"},
    "sync_feed_gritfell": {"argv": ["py", "-3.11", os.path.join(HERE, "tools", "sync_feed.py"), "gritfell"], "cwd": "repo"},
    "python_version":   {"argv": ["py", "-3.11", "--version"], "cwd": "repo"},
    "git_log_repo":     {"argv": ["git", "log", "--oneline", "-20"], "cwd": "repo"},
    "km_duyet_tukiem":  {"argv": ["py", "km_duyet.py", "--tu-kiem"], "cwd": "kinmireva"},
    "echo_ping":        {"argv": [sys.executable, "-c", "print('pong')"], "cwd": "repo"},
}

TASK_TYPES = ("tree", "read", "hash", "cmd", "stage_apply")


# ─────────────────────────── tien ich ───────────────────────────
def now():
    return datetime.now(TZ).strftime("%Y-%m-%dT%H:%M:%S%z")


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def load_redactor():
    """Dung lai bo pattern cua gpredactsecrets.py (goc repo). Khong co -> bo loc toi thieu."""
    pats = []
    try:
        import importlib.util
        src = os.path.join(ROOT, "gpredactsecrets.py")
        spec = importlib.util.spec_from_file_location("gpredact", src)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        pats = [(lbl, rx) for lbl, rx in mod.PATTERNS]
        loose = getattr(mod, "LOOSE_LAST", len(pats) - 1)
        hint = getattr(mod, "SENSITIVE_HINT", re.compile(r"(secret|token|key|password)", re.I))
        return pats, loose, hint, "gpredactsecrets.py"
    except Exception:
        pats = [("Shopify token", re.compile(r"shp(at|ss|ca)_[A-Za-z0-9]{20,}")),
                ("Telegram bot token", re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}")),
                ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
                ("OpenAI key", re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}")),
                ("GitHub PAT", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,}"))]
        return pats, len(pats), re.compile(r"(secret|token|key|password)", re.I), "fallback-noi-bo"


_PATS, _LOOSE, _HINT, _REDACT_SRC = load_redactor()
# Luon them 2 mau ma gpredactsecrets chua co (OpenAI, GitHub PAT) — bridge se doc file .env/config
_EXTRA = [("OpenAI key", re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}")),
          ("GitHub PAT", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,}")),
          ("Anthropic key", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}"))]


def redact(txt):
    hits = 0
    out = []
    for line in txt.split("\n"):
        new = line
        for idx, (lbl, rx) in enumerate(_PATS):
            if idx == _LOOSE and not _HINT.search(line):
                continue
            if rx.search(new):
                new = rx.sub("__REDACTED__", new); hits += 1
        for lbl, rx in _EXTRA:
            if rx.search(new):
                new = rx.sub("__REDACTED__", new); hits += 1
        out.append(new)
    return "\n".join(out), hits


def load_config():
    """bridge_config.json: {"roots": {"platform": "D:\\FoxEra\\foxera-platform", ...}}.
    Thieu file -> DUNG (S6). 'repo' luon co san = goc repo."""
    if not os.path.isfile(CONFIG):
        raise SystemExit("THIEU %s — tao tu bridge_config.example.json roi chay lai. Khong dung mac dinh." % CONFIG)
    with io.open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    roots = {k: os.path.abspath(v) for k, v in cfg.get("roots", {}).items()}
    roots["repo"] = ROOT
    cfg["roots"] = roots
    cfg.setdefault("approve_file", os.path.join(os.path.expanduser("~"), "foxera_bridge_approve.txt"))
    cfg["approve_file"] = os.path.expandvars(os.path.expanduser(cfg["approve_file"]))
    return cfg


def resolve_path(cfg, p):
    """Chap nhan 'rootkey:relative/path' hoac duong dan tuyet doi nam TRONG mot root."""
    roots = cfg["roots"]
    if ":" in p and not re.match(r"^[A-Za-z]:[\\/]", p):
        key, rel = p.split(":", 1)
        if key not in roots:
            raise PermissionError("root khong duoc phep: %r (co: %s)" % (key, sorted(roots)))
        full = os.path.abspath(os.path.join(roots[key], rel.lstrip("\\/")))
        base = roots[key]
    else:
        full = os.path.abspath(p)
        base = None
        for k, r in roots.items():
            if os.path.commonpath([full, r]) == r:
                base = r; break
        if base is None:
            raise PermissionError("duong dan ngoai moi root cho phep: %r" % p)
    if os.path.commonpath([full, base]) != base:
        raise PermissionError("thoat root bang ..: %r" % p)
    return full


# ─────────────────────────── 5 loai task ───────────────────────────
def t_tree(cfg, prm):
    root = resolve_path(cfg, prm["root"])
    depth = int(prm.get("depth", 3))
    inc = prm.get("include", [])            # glob theo ten file, vd ["*.py","*.yaml"]
    exc = set(prm.get("exclude_dirs", [".git", "__pycache__", "node_modules", ".venv", "venv"]))
    want_hash = bool(prm.get("hash", False))
    if not os.path.isdir(root):
        raise FileNotFoundError("khong co thu muc: %s" % root)
    entries, truncated = [], False
    base_depth = root.rstrip("\\/").count(os.sep)
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in exc]
        if dp.count(os.sep) - base_depth >= depth:
            dns[:] = []
        for fn in fns:
            if inc and not any(fnmatch.fnmatch(fn, g) for g in inc):
                continue
            p = os.path.join(dp, fn)
            try:
                st = os.stat(p)
                e = {"path": os.path.relpath(p, root).replace("\\", "/"), "size": st.st_size,
                     "mtime": datetime.fromtimestamp(st.st_mtime, TZ).strftime("%Y-%m-%d %H:%M")}
                if want_hash and st.st_size <= 5_000_000:
                    e["sha256"] = sha256_file(p)[:16]
                entries.append(e)
            except OSError as ex:
                entries.append({"path": os.path.relpath(p, root), "error": str(ex)[:80]})
            if len(entries) >= MAX_TREE_ENTRIES:
                truncated = True; break
        if truncated:
            break
    return {"root": root, "count": len(entries), "truncated": truncated, "entries": entries}


def t_read(cfg, prm):
    p = resolve_path(cfg, prm["path"])
    if not os.path.isfile(p):
        raise FileNotFoundError("khong co file: %s" % p)
    cap = min(int(prm.get("max_bytes", MAX_READ_BYTES)), MAX_READ_BYTES)
    size = os.path.getsize(p)
    with open(p, "rb") as f:
        raw = f.read(cap)
    txt = raw.decode("utf-8", errors="replace")
    red, hits = redact(txt) if prm.get("redact", True) else (txt, 0)
    return {"path": p, "size": size, "returned": len(raw), "truncated": size > cap,
            "sha256": sha256_file(p), "redacted_hits": hits, "redactor": _REDACT_SRC,
            "content": red}


def t_hash(cfg, prm):
    out = []
    for p in prm["paths"]:
        try:
            full = resolve_path(cfg, p)
            out.append({"path": full, "sha256": sha256_file(full), "size": os.path.getsize(full)})
        except Exception as ex:
            out.append({"path": p, "error": "%s: %s" % (type(ex).__name__, str(ex)[:120])})
    return {"files": out}


def t_cmd(cfg, prm):
    name = prm["name"]
    if name not in ALLOWED_CMDS:
        raise PermissionError("lenh khong trong ALLOWED_CMDS: %r (co: %s)" % (name, sorted(ALLOWED_CMDS)))
    spec = ALLOWED_CMDS[name]
    cwd = cfg["roots"].get(spec["cwd"])
    if not cwd or not os.path.isdir(cwd):
        raise FileNotFoundError("cwd cho lenh %r khong ton tai: root %r" % (name, spec["cwd"]))
    env = dict(os.environ, PYTHONIOENCODING="utf-8", GIT_ASK_YESNO="false")
    t0 = time.time()
    try:
        cp = subprocess.run(spec["argv"], cwd=cwd, capture_output=True, timeout=CMD_TIMEOUT, env=env,
                            stdin=subprocess.DEVNULL)   # 1.1.0: 'pause' trong .bat khong con treo toi timeout
        so = cp.stdout.decode("utf-8", "replace"); se = cp.stderr.decode("utf-8", "replace")
        rc = cp.returncode
    except subprocess.TimeoutExpired:
        so, se, rc = "", "TIMEOUT sau %ss" % CMD_TIMEOUT, -1
    except FileNotFoundError as ex:
        so, se, rc = "", "khong tim thay chuong trinh: %s" % ex, -2
    cut = (lambda t, n: t[:n]) if spec.get("keep") == "head" else (lambda t, n: t[-n:])
    so, h1 = redact(cut(so, MAX_READ_BYTES)); se, h2 = redact(cut(se, 50_000))
    return {"name": name, "argv": spec["argv"], "cwd": cwd, "rc": rc, "seconds": round(time.time() - t0, 1),
            "stdout": so, "stderr": se, "redacted_hits": h1 + h2}


def t_stage_apply(cfg, prm):
    """Chep _bridge/stage/<name>/ -> root dich. CHI khi sha256(manifest) co trong approve_file."""
    name = re.sub(r"[^A-Za-z0-9_\-]", "", prm["stage"])
    sdir = os.path.join(STAGE, name)
    man = os.path.join(sdir, "MANIFEST.json")
    if not os.path.isfile(man):
        raise FileNotFoundError("khong co %s" % man)
    with io.open(man, encoding="utf-8") as f:
        mtext = f.read()
    msha = sha256_text(mtext)
    approve_file = cfg["approve_file"]
    approved = set()
    if os.path.isfile(approve_file):
        with io.open(approve_file, encoding="utf-8") as f:
            approved = {ln.strip().split()[0] for ln in f if ln.strip()}
    if msha not in approved:
        return {"stage": name, "manifest_sha256": msha, "applied": False,
                "reason": "CHUA DUOC NGUOI DUYET. Tren may chay: _bridge\\approve.bat %s" % msha}
    m = json.loads(mtext)
    target_root = cfg["roots"].get(m["target_root"])
    if not target_root:
        raise PermissionError("target_root %r khong trong roots" % m["target_root"])
    # kiem tung file khop sha trong manifest TRUOC khi chep bat ky file nao
    plan = []
    for rel, want in m["files"].items():
        src = os.path.join(sdir, rel)
        if not os.path.isfile(src):
            raise FileNotFoundError("stage thieu file %s" % rel)
        got = sha256_file(src)
        if got != want:
            raise ValueError("sha lech o %s: manifest %s != file %s" % (rel, want[:12], got[:12]))
        plan.append((src, os.path.join(target_root, rel)))
    stamp = datetime.now(TZ).strftime("%Y%m%d-%H%M%S")
    bdir = os.path.join(BACKUP, "%s-%s" % (name, stamp))
    applied = []
    for src, dst in plan:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isfile(dst):
            bk = os.path.join(bdir, os.path.relpath(dst, target_root))
            os.makedirs(os.path.dirname(bk), exist_ok=True)
            shutil.copy2(dst, bk)
        tmp = dst + ".tmp"
        shutil.copy2(src, tmp); os.replace(tmp, dst)       # ghi tam roi doi ten — khong de file nua chung
        applied.append({"dst": dst, "sha256": sha256_file(dst)})
    return {"stage": name, "manifest_sha256": msha, "applied": True, "backup_dir": bdir, "files": applied}


HANDLERS = {"tree": t_tree, "read": t_read, "hash": t_hash, "cmd": t_cmd, "stage_apply": t_stage_apply}


# ─────────────────────────── vong chinh ───────────────────────────
def run_task(cfg, path):
    tid = os.path.splitext(os.path.basename(path))[0]
    res = {"id": tid, "agent": VERSION, "host": platform.node(), "started": now()}
    t0 = time.time()
    try:
        with io.open(path, encoding="utf-8") as f:
            task = json.load(f)
        ttype = task.get("type")
        if ttype not in TASK_TYPES:
            raise PermissionError("type khong hop le: %r (cho phep: %s)" % (ttype, TASK_TYPES))
        res["type"] = ttype
        res["result"] = HANDLERS[ttype](cfg, task.get("params", {}))
        res["status"] = "done"
    except Exception as ex:
        res["status"] = "error"
        res["error"] = {"type": type(ex).__name__, "msg": str(ex)[:500],
                        "trace": traceback.format_exc()[-1500:]}
    res["seconds"] = round(time.time() - t0, 2)
    res["finished"] = now()
    body = json.dumps(res, ensure_ascii=False, indent=1)
    if len(body.encode("utf-8")) > MAX_TASK_BYTES:
        res["result"] = {"truncated": True, "note": "ket qua > %d byte, chia nho task" % MAX_TASK_BYTES}
        res["status"] = "error" if res["status"] == "done" else res["status"]
        body = json.dumps(res, ensure_ascii=False, indent=1)
    os.makedirs(OUTBOX, exist_ok=True); os.makedirs(DONE, exist_ok=True)
    out = os.path.join(OUTBOX, tid + ".json")
    tmp = out + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(body)
    os.replace(tmp, out)
    json.loads(body)                        # S7: cho may parse lai truoc khi coi la xong
    shutil.move(path, os.path.join(DONE, tid + ".json"))
    return res["status"]


CRON = os.path.join(HERE, "cron.json")


def run_cron(cfg, stats):
    """1.1.0: viec LAP moi luot — danh sach ten lenh trong _bridge/cron.json. Ket qua ghi
    outbox/cron-<ten>.json va CHI ghi khi stdout/stderr/rc doi (khong tao commit moi 30 phut)."""
    if not os.path.isfile(CRON):
        return
    with io.open(CRON, encoding="utf-8") as f:
        names = json.load(f).get("cmds", [])
    os.makedirs(OUTBOX, exist_ok=True)
    for name in names:
        out = os.path.join(OUTBOX, "cron-%s.json" % re.sub(r"[^A-Za-z0-9_\-]", "", name))
        try:
            r = t_cmd(cfg, {"name": name}); status = "done"
        except Exception as ex:
            r = {"name": name, "error": "%s: %s" % (type(ex).__name__, str(ex)[:300])}; status = "error"
        key = sha256_text(json.dumps({k: r.get(k) for k in ("rc", "stdout", "stderr", "error")}, sort_keys=True))
        old = None
        if os.path.isfile(out):
            try:
                with io.open(out, encoding="utf-8") as f:
                    old = json.load(f).get("key")
            except Exception:
                old = None
        if old == key:
            print("[bridge] cron   %-24s khong doi" % name); continue
        body = json.dumps({"cron": name, "agent": VERSION, "host": platform.node(), "ran": now(),
                           "status": status, "key": key, "result": r}, ensure_ascii=False, indent=1)
        tmp = out + ".tmp"
        with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)
        os.replace(tmp, out); json.loads(body)
        stats["cron_" + status] = stats.get("cron_" + status, 0) + 1
        print("[bridge] cron   %-24s %s rc=%s" % (name, status.upper(), r.get("rc")))


def main_run():
    cfg = load_config()
    os.makedirs(INBOX, exist_ok=True)
    tasks = sorted(glob.glob(os.path.join(INBOX, "*.json")))
    stats = {"done": 0, "error": 0}
    for p in tasks:
        st = run_task(cfg, p)
        stats[st] = stats.get(st, 0) + 1
        print("[bridge] %-6s %s" % (st.upper(), os.path.basename(p)))
    run_cron(cfg, stats)
    health = {"agent": VERSION, "host": platform.node(), "last_run": now(), "inbox_seen": len(tasks),
              "stats": stats, "roots": cfg["roots"], "redactor": _REDACT_SRC,
              "allowed_cmds": sorted(ALLOWED_CMDS)}
    tmp = HEALTH + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(health, f, ensure_ascii=False, indent=1)
    os.replace(tmp, HEALTH)
    print("[bridge] v%s · %d task · %s" % (VERSION, len(tasks), json.dumps(stats)))
    return 0


# ─────────────────────────── tu kiem ───────────────────────────
def selftest():
    import tempfile
    fails, total = [], [0]
    def check(name, cond, info=""):
        total[0] += 1
        print("  %s %s %s" % ("PASS" if cond else "FAIL", name, info))
        if not cond: fails.append(name)
    tmp = tempfile.mkdtemp(prefix="bridge_st_")
    rootA = os.path.join(tmp, "A"); os.makedirs(os.path.join(rootA, "sub"))
    with io.open(os.path.join(rootA, "sub", "x.py"), "w", encoding="utf-8") as f:
        f.write("TOKEN = 'shpat_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'\nprint('hi')\n")
    with io.open(os.path.join(tmp, "outside.txt"), "w") as f:
        f.write("secret")
    cfg = {"roots": {"a": rootA, "repo": ROOT}, "approve_file": os.path.join(tmp, "approve.txt")}
    # 1 tree
    r = t_tree(cfg, {"root": "a:", "depth": 3, "include": ["*.py"], "hash": True})
    check("tree liet ke dung file", r["count"] == 1 and r["entries"][0]["path"] == "sub/x.py")
    # 2 read + redact
    r = t_read(cfg, {"path": "a:sub/x.py"})
    check("read che token shpat_", "__REDACTED__" in r["content"] and "shpat_ABC" not in r["content"], "hits=%s" % r["redacted_hits"])
    # 3 thoat root
    for bad in ["a:../outside.txt", os.path.join(tmp, "outside.txt"), "zzz:x"]:
        try:
            t_read(cfg, {"path": bad}); check("tu choi %s" % bad, False)
        except PermissionError:
            check("tu choi duong dan ngoai root: %s" % os.path.basename(bad), True)
    # 4 cmd allowlist
    try:
        t_cmd(cfg, {"name": "rm -rf"}); check("tu choi lenh la", False)
    except PermissionError:
        check("tu choi lenh ngoai ALLOWED_CMDS", True)
    r = t_cmd(cfg, {"name": "echo_ping"})
    check("cmd echo_ping chay", r["rc"] == 0 and "pong" in r["stdout"], "rc=%s" % r["rc"])
    # 5 stage_apply: chua duyet -> khong chep; duyet -> chep + backup
    global STAGE, BACKUP
    STAGE_OLD, BACKUP_OLD = STAGE, BACKUP
    STAGE = os.path.join(tmp, "stage"); BACKUP = os.path.join(tmp, "backup")
    sdir = os.path.join(STAGE, "demo"); os.makedirs(sdir)
    with io.open(os.path.join(sdir, "new.py"), "w") as f: f.write("print(2)\n")
    man = {"target_root": "a", "files": {"new.py": sha256_file(os.path.join(sdir, "new.py"))}}
    mtext = json.dumps(man, indent=1)
    with io.open(os.path.join(sdir, "MANIFEST.json"), "w", encoding="utf-8") as f: f.write(mtext)
    r = t_stage_apply(cfg, {"stage": "demo"})
    check("stage_apply CHUA duyet -> khong chep", r["applied"] is False and not os.path.exists(os.path.join(rootA, "new.py")))
    with io.open(cfg["approve_file"], "w") as f: f.write(sha256_text(mtext) + " demo\n")
    with io.open(os.path.join(rootA, "new.py"), "w") as f: f.write("print(1)\n")   # ban cu de test backup
    r = t_stage_apply(cfg, {"stage": "demo"})
    ok = r["applied"] and open(os.path.join(rootA, "new.py")).read() == "print(2)\n" and os.path.isdir(r["backup_dir"])
    check("stage_apply DA duyet -> chep + backup ban cu", ok)
    # 6 sha lech -> tu choi
    with io.open(os.path.join(sdir, "new.py"), "w") as f: f.write("print(3)\n")
    try:
        t_stage_apply(cfg, {"stage": "demo"}); check("sha lech bi tu choi", False)
    except ValueError:
        check("sha lech voi manifest -> tu choi", True)
    STAGE, BACKUP = STAGE_OLD, BACKUP_OLD
    # 6b cron: chay echo_ping 2 lan -> lan 2 "khong doi", chi 1 file
    global OUTBOX, CRON
    OUTBOX_OLD, CRON_OLD = OUTBOX, CRON
    OUTBOX = os.path.join(tmp, "outbox"); CRON = os.path.join(tmp, "cron.json")
    with io.open(CRON, "w") as f: f.write('{"cmds": ["echo_ping", "khong_co_lenh_nay"]}')
    st = {}; run_cron(cfg, st); run_cron(cfg, st)
    ok = os.path.isfile(os.path.join(OUTBOX, "cron-echo_ping.json")) and st.get("cron_done") == 1 and st.get("cron_error") == 1
    check("cron: ghi 1 lan khi khong doi, lenh la -> error khong chan", ok, str(st))
    OUTBOX, CRON = OUTBOX_OLD, CRON_OLD
    # 7 type la
    try:
        HANDLERS["evil"]; check("type la", False)
    except KeyError:
        check("type ngoai 5 loai -> KeyError (run_task doi thanh error)", True)
    shutil.rmtree(tmp, ignore_errors=True)
    print("===== bridge_agent v%s selftest: PASS %d/%d — %s =====" % (
        VERSION, total[0] - len(fails), total[0], "SACH" if not fails else "TRUOT: " + ", ".join(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(selftest())
    sys.exit(main_run())
