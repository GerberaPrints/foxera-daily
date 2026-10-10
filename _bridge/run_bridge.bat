@echo off
setlocal
REM ============================================================
REM run_bridge.bat -- CHAY CAU NOI cloud <-> may qua repo git.   v1.0.0 (10/10/2026)
REM
REM     run_bridge.bat            (chay 1 luot: pull -> agent -> commit _bridge -> push)
REM
REM Duong dan repo tu suy ra tu vi tri file nay (%~dp0 = <repo>\_bridge\).
REM Ke thua nguyen tac cua _pcfetch\run_pc_fetch.bat:
REM   - kiem errorlevel sau MOI lenh git  (khong con DONE gia)
REM   - KHONG git add -A ; chi add _bridge
REM   - tree ban boi file KHONG thuoc job nay -> DUNG va bao, khong tu don
REM   - buoc cuoi git diff --quiet HEAD origin/main xac nhan that
REM   - GIT_ASK_YESNO=false chan prompt Unlink y/n treo job
REM Luat .bat: thuan ASCII, CRLF, khong chcp, khong dau ngoac don trong echo.
REM ============================================================
set "GIT_ASK_YESNO=false"
set "PYTHONIOENCODING=utf-8"
cd /d "%~dp0.."
if errorlevel 1 (
  echo [bridge] Khong vao duoc thu muc repo. Dung lai.
  exit /b 1
)
if not exist "_bridge\bridge_config.json" (
  echo [bridge] THIEU _bridge\bridge_config.json - chep tu bridge_config.example.json va sua duong dan. Dung lai.
  exit /b 1
)

REM 1) Giu thanh qua cua chinh minh truoc khi dong bo
git add _bridge 2>nul
git commit -m "bridge: leftover" 2>nul

REM 2) Tree con file la chua commit -> DUNG, de nguoi xu ly
git diff --quiet HEAD
if errorlevel 1 (
  echo [bridge] DUNG - tree con thay doi chua commit khong thuoc job nay:
  git diff --name-only HEAD
  exit /b 1
)

REM 3) Lay yeu cau moi tu cloud
git pull --rebase origin main
if errorlevel 1 (
  echo [bridge] PULL FAILED - kiem tra git status
  exit /b 1
)

REM 4) Chay agent. Agent tra 0 ke ca khi co task loi - loi nam trong outbox.
where py >nul 2>&1
if errorlevel 1 (
  python "_bridge\bridge_agent.py"
) else (
  py -3.11 "_bridge\bridge_agent.py"
)
if errorlevel 1 (
  echo [bridge] AGENT FAIL - xem log tren. Van thu push outbox da co.
)

REM 5) Khong co gi moi thi thoi, khong commit rong
git status --porcelain _bridge | findstr /r "." >nul
if errorlevel 1 (
  echo [bridge] Khong co ket qua moi. DONE.
  exit /b 0
)

git add _bridge
if errorlevel 1 (
  echo [bridge] git add FAILED
  exit /b 1
)
git commit -m "bridge: outbox %date% %time%"
if errorlevel 1 (
  echo [bridge] git commit FAILED
  exit /b 1
)
git pull --rebase origin main
if errorlevel 1 (
  echo [bridge] PULL truoc khi push FAILED - dung lai, khong push mu.
  exit /b 1
)
git push origin HEAD:main
if errorlevel 1 (
  echo [bridge] PUSH FAILED - kiem PAT trong remote url
  exit /b 1
)
git diff --quiet HEAD origin/main
if errorlevel 1 (
  echo [bridge] CANH BAO: local va origin/main van khac nhau sau khi push.
  exit /b 1
)
echo [bridge] PUSH OK - DONE
exit /b 0
