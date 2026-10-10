@echo off
setlocal
REM ============================================================
REM approve.bat -- NGUOI duyet mot goi stage de agent duoc phep chep vao may.  v1.0.0
REM
REM     approve.bat <sha256-cua-MANIFEST>  [ghi chu]
REM
REM Ghi vao %USERPROFILE%\foxera_bridge_approve.txt - file nay NGOAI repo, chi
REM nguoi ngoi may moi ghi duoc. Khong co dong nay, stage_apply tu choi chep.
REM Lay sha o dau: outbox cua task stage_apply bao "CHUA DUOC NGUOI DUYET ... approve.bat <sha>",
REM hoac Claude bao trong chat kem noi dung goi.
REM ============================================================
if "%~1"=="" (
  echo Dung:  approve.bat ^<sha256^> [ghi chu]
  exit /b 2
)
set F=%USERPROFILE%\foxera_bridge_approve.txt
echo %~1 %date% %~2>>"%F%"
if errorlevel 1 (
  echo GHI THAT BAI vao %F%
  exit /b 1
)
echo Da ghi duyet vao %F%
type "%F%"
exit /b 0
