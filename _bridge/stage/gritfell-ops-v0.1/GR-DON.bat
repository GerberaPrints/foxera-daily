@echo off
setlocal
REM GR-DON.bat [ngay] -- don hang theo SKU (mac dinh 30 ngay, can scope read_orders).  v0.1.0
cd /d "%~dp0"
set "PYTHONIOENCODING=utf-8"
set N=%~1
if "%N%"=="" set N=30
py -3.11 gr_shop.py --don %N%
exit /b %errorlevel%
