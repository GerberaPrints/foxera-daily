@echo off
REM ============================================================
REM run_gerbera_fetch.bat — PC-side FETCH GerberaPrints
REM Pattern FoxEra: commit-truoc-pull-sau -> chay job -> commit/pull/push
REM Task Scheduler: hang ngay 06:45 (gio may = Bangkok/Hanoi)
REM   + Settings tick "Run task as soon as possible after a scheduled start is missed"
REM   + Trigger phu: At log on (chay bu khi may tat gio do)
REM ============================================================

REM >>> SUA DUONG DAN NAY theo noi ban clone repo tren may <<<
cd /d C:\gerbera\foxera-daily

REM 1) don leftover local truoc (commit-truoc-pull-sau)
git add gerbera-live-fetch.json gerbera-local-fetch/fetch_log.txt 2>nul
git commit -m "gerbera pc-fetch leftover" 2>nul
git pull --rebase origin main

REM 2) chay job fetch
python gerbera-local-fetch\gerbera_fetch.py
if errorlevel 1 (
  echo [gerbera_fetch] FAIL toan bo - khong push, cloud se carry
  exit /b 1
)

REM 3) commit + pull --rebase + push (CHI 2 file cua job nay, khong add -A)
git add gerbera-live-fetch.json gerbera-local-fetch/fetch_log.txt
git commit -m "gerbera pc-fetch %date% %time%"
git pull --rebase origin main
git push origin HEAD:main

echo [gerbera_fetch] DONE
