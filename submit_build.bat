@echo off
cd /d C:\Users\1\WorkBuddy\20260324180400\app
echo y | npx eas-cli build --platform android --profile preview --non-interactive --no-wait
