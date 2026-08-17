@echo off
setlocal
REM ============================================================
REM make_task.bat — TAO TASK SCHEDULER cho mot du an.   v1.0 (17/08/2026)
REM
REM     make_task.bat <ten_du_an> [gio]
REM     vi du:  make_task.bat gritfell 04:30
REM             make_task.bat gerbera  04:45
REM
REM Khong can bam qua 5 tab GUI, khong can file XML, khong hardcode duong dan.
REM Chay lai lenh nay se GHI DE task cu (-Force) — sua gio chi viec chay lai.
REM
REM Task duoc tao voi:
REM   · Trigger 1: hang ngay dung gio
REM   · Trigger 2: khi dang nhap, tre 5 phut  (chay bu khi may tat qua gio)
REM   · Start when available                  (chay bu khi lo gio)
REM   · Khong chan khi chay pin
REM   · Gioi han 1 gio
REM ============================================================

if "%~1"=="" (
  echo Dung:  make_task.bat ^<ten_du_an^> [gio HH:MM]
  echo Cac du an dang co:
  for %%F in ("%~dp0projects\*.json") do @if not "%%~nF"=="_TEMPLATE" echo    %%~nF
  exit /b 2
)
set PROJ=%~1
set WHEN=%~2
if "%WHEN%"=="" set WHEN=04:30

set BAT=%~dp0run_pc_fetch.bat
for %%I in ("%~dp0..") do set REPO=%%~fI
set TN=FoxEra PC Fetch - %PROJ%

echo Tao task:  "%TN%"
echo   chay    :  "%BAT%" %PROJ%
echo   thu muc :  %REPO%
echo   hang ngay luc %WHEN%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$a = New-ScheduledTaskAction -Execute '%BAT%' -Argument '%PROJ%' -WorkingDirectory '%REPO%';" ^
  "$t1 = New-ScheduledTaskTrigger -Daily -At '%WHEN%';" ^
  "$t2 = New-ScheduledTaskTrigger -AtLogOn; $t2.Delay = 'PT5M';" ^
  "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1);" ^
  "$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;" ^
  "Register-ScheduledTask -TaskName '%TN%' -Action $a -Trigger $t1,$t2 -Settings $s -Principal $p -Force | Out-Null;" ^
  "Write-Host 'DA TAO XONG.'"

if errorlevel 1 (
  echo.
  echo TAO TASK THAT BAI. Thu mo Command Prompt bang Run as administrator roi chay lai.
  exit /b 1
)

echo.
echo Kiem tra:
schtasks /Query /TN "%TN%" /FO LIST | findstr /C:"TaskName" /C:"Next Run Time" /C:"Status"
echo.
echo Chay thu ngay:   schtasks /Run /TN "%TN%"
echo Xem ket qua  :   schtasks /Query /TN "%TN%" /V /FO LIST ^| findstr "Last Result"
echo                  ( 0 = tot,  1 = script bao loi,  2147942402 = sai duong dan )
exit /b 0
