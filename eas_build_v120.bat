@echo off
cd /d c:\Users\1\WorkBuddy\20260324180400\app
echo === Step 0: Check current user ===
call npx eas whoami
echo.
echo === Step 1: Check app.json projectId ===
findstr "projectId" app.json
echo.
echo === Step 2: Try build (interactive mode) ===
call npx eas build --platform android --profile preview
echo.
echo === Exit code: %errorlevel% ===
pause
