@echo off
setlocal
REM ============================================================
REM run_pc_fetch.bat — CHAY FETCH cho MOT du an.   v1.0 (17/08/2026)
REM
REM     run_pc_fetch.bat <ten_du_an>
REM     vi du:  run_pc_fetch.bat gritfell
REM
REM Dung chung cho moi du an. Duong dan repo TU SUY RA tu vi tri file nay
REM (%~dp0 = <repo>\_pcfetch\) nen chep repo di dau cung chay duoc — khong
REM con hardcode C:\Users\Admin\foxera-daily nhu cac ban truoc.
REM
REM === LICH SU LOI DA SUA — DUNG XOA, DAY LA LY DO CAU LENH TRONG NAY ===
REM v1 cu:  git pull --rebase        -> fail khi cay lam viec ban (repo dung
REM                                     chung 4 du an, luon co file ban cua job khac)
REM v2 cu:  them --autostash         -> stash roi tra lai, DUNG file remote vua
REM                                     doi -> "Applying autostash resulted in
REM                                     conflicts" -> repo ket unmerged, commit va
REM                                     pull deu fail, nhung push tra 0 -> IN "DONE" GIA
REM v3 cu:  git checkout -- .        -> het xung dot, NHUNG no revert CA SCRIPT
REM                                     cua chinh minh: 17/08 no keo .bat v4 ve v3
REM                                     va gritfell_social_fetch.py v1.2 ve v1.0.
REM                                     Chay xong ma dung code cu -> tuong da sua
REM                                     ma thuc te chua.
REM v4 (ban nay):
REM   - commit CA THU MUC _pcfetch truoc khi don  -> sua script xong la duoc giu
REM   - don rac co LOAI TRU _pcfetch              -> khong bao gio revert script nua
REM   - kiem errorlevel sau MOI buoc git          -> khong con "DONE" gia
REM ============================================================

if "%~1"=="" (
  echo Dung:  run_pc_fetch.bat ^<ten_du_an^>
  echo Cac du an dang co:
  for %%F in ("%~dp0projects\*.json") do @if not "%%~nF"=="_TEMPLATE" echo    %%~nF
  exit /b 2
)
set PROJ=%~1

REM Repo = thu muc cha cua _pcfetch
cd /d "%~dp0.."
if errorlevel 1 (
  echo [%PROJ%] Khong vao duoc thu muc repo. Dung lai.
  exit /b 1
)

REM 1) Commit thanh qua cua chinh minh: du lieu dau ra + toan bo _pcfetch.
REM    Commit _pcfetch la mau chot — no bao ve script khoi buoc don o duoi.
git add "%PROJ%-live-fetch.json" "%PROJ%-social-fetch.json" _pcfetch 2>nul
git commit -m "%PROJ% pc-fetch: leftover + scripts" 2>nul

REM 2) Don file chua commit CON LAI (dau ra tu dong cua job khac — se duoc
REM    chinh job do ghi lai). LOAI TRU _pcfetch de khong nuot code moi.
git checkout -- . ":(exclude)_pcfetch" 2>nul

REM 3) Dong bo — cay da sach nen rebase chay tron
git pull --rebase origin main
if errorlevel 1 (
  echo [%PROJ%] PULL FAILED - repo co the dang ket o trang thai xung dot.
  echo   Kiem tra:  git status
  exit /b 1
)

REM 4) Chay fetch. Script tu quyet dinh ma thoat:
REM    exit 1 CHI khi toan bo feed bat buoc chet. Social hong van exit 0.
python "_pcfetch\pcfetch.py" %PROJ%
if errorlevel 1 (
  echo [%PROJ%] FETCH FAIL toan bo - khong push, cloud se chay che do suy giam
  exit /b 1
)

REM 5) Commit dau ra cua rieng du an nay (KHONG dung add -A)
git add "%PROJ%-live-fetch.json" "%PROJ%-social-fetch.json" _pcfetch\logs 2>nul
git commit -m "%PROJ% pc-fetch %date% %time%"

REM 6) Dong bo lan cuoi roi push
git pull --rebase origin main
if errorlevel 1 (
  echo [%PROJ%] PULL truoc khi push FAILED - dung lai, khong push mu.
  exit /b 1
)
git push origin HEAD:main
if errorlevel 1 (
  echo [%PROJ%] PUSH FAILED - remote co PAT that chua?
  echo   git remote set-url origin "https://x-access-token:TOKEN@github.com/OWNER/REPO.git"
  exit /b 1
)

REM 7) Xac nhan that su len remote — chan bao DONE gia
git diff --quiet HEAD origin/main
if errorlevel 1 (
  echo [%PROJ%] CANH BAO: local va origin/main van khac nhau sau khi push.
  exit /b 1
)

echo [%PROJ%] PUSH OK - DONE
exit /b 0
