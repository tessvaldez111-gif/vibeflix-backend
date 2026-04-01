@echo off
cd /d c:\Users\1\WorkBuddy\20260324180400\app
echo [%date% %time%] Starting EAS build...
npx eas build --platform android --profile preview --non-interactive 2>&1
echo [%date% %time%] Build finished.
pause
