@echo off
REM ============================================================
REM run_gritfell_fetch.bat — PC-side FETCH GritFell   v3 (17/08/2026)
REM Pattern FoxEra: commit-cua-minh -> don rac -> dong bo -> chay -> push
REM Task Scheduler: hang ngay 04:30 (gio may = Bangkok/Hanoi)
REM Cloud chay 05:30 -> dem 60 phut, du.
REM
REM === v3 SUA GI (sau khi v2 dinh "Applying autostash resulted in conflicts") ===
REM  --autostash cat file ban di roi TRA LAI sau khi rebase. Neu file do CUNG BI
REM  SUA tren remote (vd gerbera-live-fetch.json vua duoc clone Gerbera push len)
REM  thi luc tra lai se XUNG DOT -> repo ket o trang thai unmerged -> commit va
REM  pull deu fail -> nhung `git push` van tra ve 0 nen .bat in "DONE" GIA.
REM
REM  v3 doi cach: KHONG stash nua. Cac file chua commit trong repo nay deu la
REM  OUTPUT SINH TU DONG cua job khac, se duoc chinh job do ghi lai -> vut di
REM  an toan hon la co ghep. Va them kiem loi sau moi buoc git de khong bao
REM  DONE gia nua.
REM ============================================================

REM Duong dan da dien san theo may FOXERA-SERVER (lay tu task GenusFaith).
cd /d C:\Users\Admin\foxera-daily

REM 1) Commit leftover CUA JOB NAY truoc (phong khi lan truoc push that bai)
git add gritfell-live-fetch.json gritfell-local-fetch/fetch_log.txt 2>nul
git commit -m "gritfell pc-fetch leftover" 2>nul

REM 2) Vut moi thay doi CHUA COMMIT con lai (output tu dong cua job khac).
REM    Day la thu thay the --autostash: khong co gi de stash thi khong the xung dot.
git checkout -- . 2>nul

REM 3) Dong bo voi remote — tree da sach nen rebase chay tron
git pull --rebase origin main
if errorlevel 1 (
  echo [gritfell_fetch] PULL FAILED - repo co the dang ket o trang thai xung dot.
  echo   Kiem tra:  git status
  exit /b 1
)

REM 4) Chay job fetch
python gritfell-local-fetch\gritfell_fetch.py
if errorlevel 1 (
  echo [gritfell_fetch] FETCH FAIL toan bo - khong push, cloud se chay che do suy giam
  exit /b 1
)

REM 5) Commit CHI 2 file cua job nay (KHONG add -A)
git add gritfell-live-fetch.json gritfell-local-fetch/fetch_log.txt
git commit -m "gritfell pc-fetch %date% %time%"

REM 6) Dong bo lan cuoi roi push
git pull --rebase origin main
if errorlevel 1 (
  echo [gritfell_fetch] PULL truoc khi push FAILED - dung lai, khong push mu.
  exit /b 1
)
git push origin HEAD:main
if errorlevel 1 (
  echo [gritfell_fetch] PUSH FAILED - kiem tra remote URL co PAT that chua:
  echo   git remote set-url origin "https://x-access-token:TOKEN@github.com/GerberaPrints/foxera-daily.git"
  exit /b 1
)

REM 7) Xac nhan that su len remote — chan bao DONE gia
git diff --quiet HEAD origin/main
if errorlevel 1 (
  echo [gritfell_fetch] CANH BAO: local va origin/main van khac nhau sau khi push.
  exit /b 1
)

echo [gritfell_fetch] DONE
