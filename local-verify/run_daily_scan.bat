@echo off
REM FoxEra daily shop scan — chay boi Task Scheduler
cd /d C:\Users\Admin\foxera-daily
git pull
python local-verify\verify_shops.py --auto
git add -A
git commit -m "shops-live auto"
git push
