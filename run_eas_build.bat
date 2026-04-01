@echo off
cd /d "%~dp0app"
echo Starting EAS build...
npx eas build --platform android --profile preview --non-interactive
echo.
echo Build complete! Check the output above for the download link.
pause
