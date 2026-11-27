@echo off
echo ===================================================
echo   GajiKu - Sinkronisasi Aset Web ke Proyek Android
echo   Release by RDA
echo ===================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0sync-android-assets.ps1"
echo.
echo Sinkronisasi selesai! Proyek Android di folder "android" sudah mutakhir.
pause
