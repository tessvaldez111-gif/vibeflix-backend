@echo off
chcp 65001 >nul
cd /d "c:\Users\1\WorkBuddy\20260324180400\app"
echo [%date% %time%] Starting EAS build (Hongguo bottom bar)...
npx eas build --platform android --profile preview --non-interactive
echo.
echo [%date% %time%] Build finished.
pause
