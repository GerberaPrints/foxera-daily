@echo off
setlocal
REM ============================================================
REM FIX-2026-08-20.bat — vá 2 việc phát hiện sáng 20/08/2026
REM Đặt file này vào <repo>\_pcfetch\ rồi chạy (Command Prompt thường là đủ;
REM nếu Register-ScheduledTask báo từ chối thì mở Run as administrator).
REM ============================================================

cd /d "%~dp0"

echo ============================================================
echo  VIEC 1 — TAO task cho gerberaprints (task nay CHUA TUNG TON TAI)
echo ------------------------------------------------------------
echo  Bang chung: logs\gerberaprints_log.txt co DUNG 1 dong (17/08 14:10 =
echo  lan chay tay khi them config _pcfetch v1.1). Git log 30 commit gan nhat
echo  chi co 1 commit "gerberaprints pc-fetch", cung ngay do.
echo  => Khong phai task fail. Task chua duoc dang ky bao gio.
echo ============================================================
echo.

REM 04:45 — sau gritfell 04:30, truoc gerbera 06:45, khong dam gio nhau
call "%~dp0make_task.bat" gerberaprints 04:45
if errorlevel 1 goto :err

echo.
echo Chay thu ngay bay gio de khoi doi den mai:
schtasks /Run /TN "FoxEra PC Fetch - gerberaprints"
echo   (xem ket qua sau ~2 phut:)
echo   schtasks /Query /TN "FoxEra PC Fetch - gerberaprints" /V /FO LIST ^| findstr "Last Result"
echo.

echo ============================================================
echo  VIEC 2 — genusfaith: CAN NGUOI QUYET DINH, script khong tu doan
echo ------------------------------------------------------------
echo  Task 04:00 VAN CHAY DEU (commit moi ngay 18-19-20/08). Nhung no chay
echo  script CU genusfaith_fetch.py:
echo     - sinh genusfaith-live-fetch.json  -> TUOI (20/08) nhung dung khoa
echo       "brands" chu khong phai "feeds" cua _pcfetch
echo     - KHONG quet social -> genusfaith-social-fetch.json dung o 17/08
echo     - KHONG ghi logs\genusfaith_log.txt
echo.
echo  Hai duong ong cho cung mot du an. Chon 1 trong 2, roi lam tay:
echo.
echo   A) Chuyen han sang _pcfetch (khuyen nghi - co social, co selfcheck):
echo        schtasks /Delete /TN "FoxEra PC Fetch - genusfaith" /F
echo        make_task.bat genusfaith 04:00
echo      ^>^> Kiem truoc: script cu co sinh du lieu gi ma _pcfetch chua co khong
echo         (khoa "provenance" va "changes" chi co o ban cu).
echo.
echo   B) Giu script cu, chi them mot task rieng cho phan social.
echo.
echo  KHONG tu dong xoa task dang chay tot — do la viec cua nguoi.
echo ============================================================
echo.
echo  GHI CHU: gerbera (06:45) va gritfell (04:30) dang chay dung, khong dung vao.
goto :eof

:err
echo.
echo TAO TASK THAT BAI — mo Command Prompt bang "Run as administrator" roi chay lai.
exit /b 1
