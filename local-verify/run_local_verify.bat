@echo off
REM ============================================================
REM  LOCAL-VERIFY — double-click la chay (hoac dat vao Task Scheduler)
REM  Yeu cau: da cai  pip install playwright  +  python -m playwright install chromium
REM ============================================================
cd /d "%~dp0\.."
echo [1/3] git pull...
git pull
echo [2/3] verify listings (cua so Chromium se tu bat, cho no chay ~2-3 phut)...
python local-verify\verify_listings.py all
echo [3/3] git push...
git push
echo.
echo XONG. Sang mai run cloud 04:30 se doc file local-verify\*-live.json va nang anchor len "LIVE".
pause
