@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview-server.ps1" -Port 8181 -StartPage index.html
