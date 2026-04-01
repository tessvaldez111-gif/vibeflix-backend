@echo off
set CI=1
set EXPO_NO_INTERACTIVE=1
cd /d C:\Users\1\WorkBuddy\20260324180400\app
npx eas-cli build --platform android --profile preview --non-interactive --no-wait > C:\Users\1\WorkBuddy\20260324180400\build_output.log 2>&1
