@echo off
setlocal
REM ============================================================
REM run_daily_scan.bat - FoxEra shop scan   v2.2 (11/09/2026)
REM
REM   Task Scheduler: "FoxEra shop scan" 04:00
REM   Quet 161 shop Etsy bang Chromium that, che do --auto.
REM
REM Ban v1 co 3 loi da gay chet am 4 tuan:
REM  1. Goi verify_shops.py trong khi file do da bi doi ten -> python loi.
REM  2. Khong kiem errorlevel sau bat ky lenh nao -> loi tren khong ai biet.
REM  3. Dung "git add -A" hai lan -> nuot ca dau ra dang do cua job khac.
REM Ban v2 sua ca ba, va ghi ket qua ra D:\FoxEra\logs\push_status.log.
REM ============================================================

set "REPO=C:\Users\Admin\foxera-daily"
set "PUSHLOG=D:\FoxEra\logs\push_status.log"
set "GIT_ASK_YESNO=false"
set "MINE=local-verify/foxera-shops-live.json local-verify/foxera-shops-desktop.json local-verify/foxera-reviews.json local-verify/foxera-shops-history.jsonl"

cd /d "%REPO%"
if errorlevel 1 (
  echo [shopscan] KHONG VAO DUOC %REPO%
  exit /b 1
)

REM 1- Commit dau ra con sot cua chinh job nay
git add %MINE% 2>nul
git commit -m "shopscan leftover" 2>nul

REM 2- Tree phai sach. Con thay doi la CUA JOB KHAC -> DUNG, khong tu vut.
git diff --quiet HEAD
if errorlevel 1 (
  echo [shopscan] DUNG - tree con thay doi chua commit khong thuoc job nay:
  git diff --name-only HEAD
  echo   Xu ly thu cong roi chay lai.
  call :log DIRTY_TREE
  exit /b 1
)

REM 3- Dong bo voi remote
git pull --rebase origin main
if errorlevel 1 (
  echo [shopscan] PULL FAILED - repo dang ket o trang thai xung dot.
  call :log PULL_FAILED
  exit /b 1
)

REM 4- Quet. Che do auto: gap captcha thi giu so cu, khong dung cho nguoi.
python local-verify\verify_shops.py --auto
if errorlevel 1 (
  echo [shopscan] SCAN FAILED - khong push. Kiem verify_shops.py con nguyen khong.
  call :log SCAN_FAILED
  exit /b 1
)

REM 4b- CONG CHAN: bi Etsy chan bot thi so lieu la rac -> KHONG commit, KHONG push.
REM     11/09/2026 ban quet tra 0/161 shop song, da push nguyen so rac len main.
python local-verify\scan_gate.py
if errorlevel 1 (
  echo [shopscan] DUNG - ket qua quet khong dung duoc. Khong commit, khong push.
  echo   Vut ket qua rac de lan chay sau khong commit nham no o buoc 1.
  git checkout -- %MINE%
  call :log SCAN_BLOCKED
  exit /b 1
)

REM 5- Commit dau ra - CHI file cua job nay, TUYET DOI KHONG add -A
git add %MINE%
git commit -m "shopscan %date% %time%"

REM 6- Dong bo lan cuoi roi push
git pull --rebase origin main
if errorlevel 1 (
  echo [shopscan] PULL truoc khi push FAILED - dung lai, khong push mu.
  call :log PULL2_FAILED
  exit /b 1
)
git push origin HEAD:main
if errorlevel 1 (
  echo [shopscan] PUSH FAILED - kiem token cua clone nay.
  call :log PUSH_FAILED
  exit /b 1
)

REM 7- Xac nhan that su len remote - chan bao DONE gia
git diff --quiet HEAD origin/main
if errorlevel 1 (
  echo [shopscan] CANH BAO: local va origin/main van khac nhau sau khi push.
  call :log PUSH_UNVERIFIED
  exit /b 1
)

call :log OK
echo [shopscan] DONE - da xac nhan len remote
exit /b 0

:log
REM 12/09/2026: shopscan va genusfaith cung chay 04:00 -> hai tien trinh cung
REM mo push_status.log de ghi -> mot ben bi tu choi va dong log BIEN MAT.
REM Sang 12/09 genusfaith thoat ma 1 nhung khong de lai dau vet nao.
REM Thu lai toi 15 lan, moi lan cach 1 giay. KHONG dung dau ngoac don o day.
if not exist "D:\FoxEra\logs" mkdir "D:\FoxEra\logs"
set "LOGMSG=%~1"
set /a LOGTRY=0
:log_retry
set /a LOGTRY+=1
>>"%PUSHLOG%" echo %date% %time% ^| shopscan ^| %LOGMSG%
if not errorlevel 1 goto :eof
if %LOGTRY% GEQ 15 goto :eof
ping -n 2 127.0.0.1 >nul
goto :log_retry
