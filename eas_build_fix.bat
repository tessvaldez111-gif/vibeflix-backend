@echo off
cd /d C:\Users\1\WorkBuddy\20260324180400\app
echo Starting EAS build...
npx eas-cli build --platform android --profile preview --non-interactive 2>&1
echo Build complete, exit code: %ERRORLEVEL%
