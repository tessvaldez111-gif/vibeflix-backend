@echo off
echo ========================================
echo EAS Build - Danmaku Fix Version
echo ========================================
echo.

cd /d c:\Users\1\WorkBuddy\20260324180400\app

echo [1/2] Starting EAS build...
echo.
npx eas build --platform android --profile preview --non-interactive

echo.
echo ========================================
echo Done! Check result above.
echo ========================================
pause
