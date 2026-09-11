@echo off
REM ============================================================
REM run_gerbera_fetch.bat - PC-side FETCH GerberaPrints   v6.2 (11/09/2026)
REM
REM === QUAN TRONG: MAY NAY CO HAI CLONE ===
REM   C:\gerbera\foxera-daily       <- job gerbera chay o day (log 55 dong + commit rieng)
REM   C:\Users\Admin\foxera-daily   <- genusfaith / gritfell / _pcfetch chay o day
REM Moi clone co remote URL rieng -> phai cam token vao CA HAI.
REM Job nay chay o: C:\gerbera\foxera-daily
REM
REM === v6 SUA GI ===
REM  1. Giu DUNG clone cua job nay (ban v5 tro sai clone -> se bo roi du lieu).
REM  2. "git checkout -- ." don tree truoc khi pull (port tu gritfell v3).
REM     fetch_log.txt la file APPEND-ONLY: hai ben cung them dong cuoi -> pull --rebase
REM     chac chan xung dot. Tree sach thi khong co gi de xung dot.
REM     CANH BAO: buoc nay XOA moi thay doi chua commit, KE CA thay doi cua chinh file
REM     .bat nay. PHAI COMMIT ban va TRUOC khi chay lan dau.
REM  3. "if errorlevel 1" sau MOI lenh git (ban cu khong kiem sau pull).
REM  4. Buoc 7 xac nhan that su len remote -> chan bao DONE GIA (luat S16).
REM  5. Ghi ket qua push ra D:\FoxEra\logs\push_status.log (NGOAI repo, khong xung dot).
REM ============================================================

set "REPO=C:\gerbera\foxera-daily"
set "PUSHLOG=D:\FoxEra\logs\push_status.log"
set "GIT_ASK_YESNO=false"

cd /d "%REPO%"
if errorlevel 1 (
  echo [gerbera_fetch] KHONG VAO DUOC %REPO%
  exit /b 1
)

REM 1) Commit leftover CUA JOB NAY truoc (phong khi lan truoc push that bai)
git add gerbera-live-fetch.json gerbera-local-fetch/fetch_log.txt 2>nul
git commit -m "gerbera pc-fetch leftover" 2>nul

REM 2) Tree phai sach. Con thay doi la CUA JOB KHAC -> DUNG, tuyet doi khong tu vut.
git diff --quiet HEAD
if errorlevel 1 (
  echo [gerbera_fetch] DUNG - tree con thay doi chua commit khong thuoc job nay:
  git diff --name-only HEAD
  echo   Xu ly thu cong roi chay lai. Ban v6.1 tro ve truoc tu vut cho nay - da xoa du lieu job khac.
  call :log DIRTY_TREE
  exit /b 1
)

REM 3) Dong bo voi remote - tree da sach nen rebase chay tron
git pull --rebase origin main
if errorlevel 1 (
  echo [gerbera_fetch] PULL FAILED - repo co the dang ket o trang thai xung dot.
  echo   Kiem tra:  git status
  call :log PULL_FAILED
  exit /b 1
)

REM 4) Chay job fetch
python gerbera-local-fetch\gerbera_fetch.py
if errorlevel 1 (
  echo [gerbera_fetch] FETCH FAIL toan bo - khong push, cloud se chay che do suy giam
  call :log FETCH_FAILED
  exit /b 1
)

REM 5) Commit CHI file cua job nay (KHONG add -A)
git add gerbera-live-fetch.json gerbera-local-fetch/fetch_log.txt
git commit -m "gerbera pc-fetch %date% %time%"

REM 6) Dong bo lan cuoi roi push
git pull --rebase origin main
if errorlevel 1 (
  echo [gerbera_fetch] PULL truoc khi push FAILED - dung lai, khong push mu.
  call :log PULL2_FAILED
  exit /b 1
)
git push origin HEAD:main
if errorlevel 1 (
  echo [gerbera_fetch] PUSH FAILED - token cua clone nay con song khong?
  echo   Chay:  D:\FoxEra\fix_github_token.bat   - cam token vao CA HAI clone
  call :log PUSH_FAILED
  exit /b 1
)

REM 7) Xac nhan that su len remote - chan bao DONE gia
git diff --quiet HEAD origin/main
if errorlevel 1 (
  echo [gerbera_fetch] CANH BAO: local va origin/main van khac nhau sau khi push.
  call :log PUSH_UNVERIFIED
  exit /b 1
)

call :log OK
echo [gerbera_fetch] DONE - da xac nhan len remote
exit /b 0

:log
if not exist "D:\FoxEra\logs" mkdir "D:\FoxEra\logs"
>>"%PUSHLOG%" echo %date% %time% ^| gerbera ^| %~1
goto :eof
