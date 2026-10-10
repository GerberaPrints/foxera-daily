@echo off
setlocal
REM GR-QUET.bat -- quet catalog + bo dem SKU + audit listing (chi doc).  v0.1.0
cd /d "%~dp0"
set "PYTHONIOENCODING=utf-8"
py -3.11 gr_shop.py --quet
if errorlevel 1 exit /b 1
py -3.11 gr_shop.py --audit
exit /b %errorlevel%
