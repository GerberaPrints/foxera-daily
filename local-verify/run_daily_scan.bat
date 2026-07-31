@echo off
REM FoxEra daily shop scan - chay boi Task Scheduler
cd /d C:\Users\Admin\foxera-daily
REM 1) don sach thay doi con sot (neu co) de pull khong bi chan
git add -A
git commit -m "shops-live pre-sync"
git pull --rebase
REM 2) quet (che do auto: captcha -> giu so cu, khong dung cho)
python local-verify\verify_shops.py --auto
REM 3) day ket qua len
git add -A
git commit -m "shops-live auto"
git pull --rebase
git push
