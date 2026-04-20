@echo off
setlocal

set "ROTATOR_FILE=%~dp0rotator.html"

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "%ROTATOR_FILE%"
  exit /b
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" "%ROTATOR_FILE%"
  exit /b
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%ROTATOR_FILE%"
  exit /b
)

start "" "%ROTATOR_FILE%"
