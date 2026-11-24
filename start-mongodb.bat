@echo off
echo ========================================================
echo Starting MongoDB Service for GECM Campus ERP...
echo ========================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTICE] Requesting Administrator permissions...
    powershell -Command "Start-Process cmd -ArgumentList '/c net start MongoDB && echo. && echo MongoDB started successfully! && timeout /t 3' -Verb RunAs"
    exit /b
)

net start MongoDB
if %errorlevel% equ 0 (
    echo [SUCCESS] MongoDB service is running!
) else (
    echo [ERROR] Could not start MongoDB service.
)
pause
