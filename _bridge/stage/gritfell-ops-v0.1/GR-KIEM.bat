@echo off
setlocal
REM GR-KIEM.bat -- in phien ban + tu kiem + identity store (khong ghi gi).  v0.1.0
cd /d "%~dp0"
set "PYTHONIOENCODING=utf-8"
echo == GritFell ops: phien ban ==
py -3.11 -c "import gr_shop,gr_ten;print('gr_shop',gr_shop.VER,'gr_ten',gr_ten.VER)"
echo == tu kiem ==
py -3.11 gr_shop.py --tu-kiem
py -3.11 gr_ten.py --tu-kiem
echo == identity store ==
py -3.11 gr_shop.py --kiem
exit /b %errorlevel%
