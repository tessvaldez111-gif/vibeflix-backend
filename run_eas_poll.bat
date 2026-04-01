@echo off
cd /d C:\Users\1\WorkBuddy\20260324180400
python eas_poll_download.py > eas_poll_output.log 2>&1
echo DONE >> eas_poll_output.log
