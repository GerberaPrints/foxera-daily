@echo off
setlocal
REM ============================================================
REM make_bridge_task.bat -- tao Task Scheduler cho cau noi, lap moi N phut.  v1.0.0
REM
REM     make_bridge_task.bat [phut]     (mac dinh 30)
REM
REM Chay lai de ghi de task cu. Can Command Prompt thuong, khong can admin
REM (RunLevel Limited, user hien tai), giong _pcfetch\make_task.bat.
REM ============================================================
set MIN=%~1
if "%MIN%"=="" set MIN=30
set BAT=%~dp0run_bridge.bat
for %%I in ("%~dp0..") do set REPO=%%~fI
set TN=FoxEra Bridge

echo Tao task: "%TN%"  moi %MIN% phut
echo   chay    : "%BAT%"
echo   thu muc : %REPO%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$a = New-ScheduledTaskAction -Execute '%BAT%' -WorkingDirectory '%REPO%';" ^
  "$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes %MIN%);" ^
  "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -MultipleInstances IgnoreNew;" ^
  "$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;" ^
  "Register-ScheduledTask -TaskName '%TN%' -Action $a -Trigger $t -Settings $s -Principal $p -Force | Out-Null;" ^
  "Write-Host 'DA TAO XONG.'"
if errorlevel 1 (
  echo TAO TASK THAT BAI.
  exit /b 1
)
echo.
schtasks /Query /TN "%TN%" /FO LIST | findstr /C:"TaskName" /C:"Next Run Time" /C:"Status"
echo.
echo Chay thu ngay:  schtasks /Run /TN "%TN%"
exit /b 0
