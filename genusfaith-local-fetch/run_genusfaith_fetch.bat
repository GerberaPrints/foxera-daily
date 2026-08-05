@echo off
REM ============================================================
REM run_genusfaith_fetch.bat ??? PC-side FETCH GenusFaith
REM Pattern FoxEra: commit-truoc-pull-sau -> chay job -> commit/pull/push
REM Task Scheduler: hang ngay 04:00 (gio may = Bangkok/Hanoi)
REM   -> chay TRUOC routine cloud 04:30 de cloud doc duoc so cua CUNG NGAY
REM   + Trigger phu: At log on (chay bu khi may tat luc 04:00)
REM   + Settings tick "Run task as soon as possible after a scheduled start is missed"
REM ============================================================

REM >>> SUA DUONG DAN NAY theo noi ban clone repo tren may <<<
REM     (placeholder duoi day CHAC CHAN sai tren may ban ??? phai doi thanh duong dan that)
cd /d C:\Users\Admin\foxera-daily

REM 1) don leftover local truoc (commit-truoc-pull-sau)
git add genusfaith-live-fetch.json genusfaith-local-fetch/fetch_log.txt 2>nul
git commit -m "genusfaith pc-fetch leftover" 2>nul
git pull --rebase origin main

REM 2) chay job fetch
python genusfaith-local-fetch\genusfaith_fetch.py
if errorlevel 1 (
  echo [genusfaith_fetch] FAIL toan bo - khong push, cloud se carry so cu
  exit /b 1
)

REM 3) commit + pull --rebase + push (CHI 2 file cua job nay, TUYET DOI KHONG git add -A)
git add genusfaith-live-fetch.json genusfaith-local-fetch/fetch_log.txt
git commit -m "genusfaith pc-fetch %date% %time%"
git pull --rebase origin main
git push origin HEAD:main
if errorlevel 1 (
  echo [genusfaith_fetch] PUSH FAILED - kiem tra remote URL co PAT that chua:
  echo   git remote set-url origin "https://x-access-token:TOKEN@github.com/GerberaPrints/foxera-daily.git"
  exit /b 1
)

echo [genusfaith_fetch] DONE
