@echo off
cd /d c:\Users\1\WorkBuddy\20260324180400
echo [%date% %time%] Pushing to GitHub...
git push origin master 2>&1
echo [%date% %time%] Push done.
echo [%date% %time%] Starting EAS build...
cd app
npx eas build --platform android --profile preview --non-interactive 2>&1
echo [%date% %time%] Build finished.
pause
