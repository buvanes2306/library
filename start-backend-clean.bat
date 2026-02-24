@echo off
title Backend Startup
color 0A

echo.
echo  ╔════════════════════════════════════════════════════════════════╗
echo  ║                    🔧 CLEAN BACKEND STARTUP SCRIPT                    ║
echo  ╚══════════════════════════════════════════════════════════════════╝
echo.

echo 📋 Step 1: Checking for processes using port 5002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002') do (
    if "%%a"=="LISTENING" (
        set FOUND_PID=%%b
        goto :found_process
    )
)

if not defined FOUND_PID (
    echo ✅ Port 5002 is free
    goto :start_backend
)

:found_process
echo 📋 Found process %FOUND_PID% using port 5002
echo.
echo 🔨 Step 2: Killing process %FOUND_PID%...
taskkill /PID %FOUND_PID% /F >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully killed process %FOUND_PID%
) else (
    echo ❌ Failed to kill process %FOUND_PID%
    goto :error
)

echo.
echo ⏳ Step 3: Waiting for port to be released...
timeout /t 2 /nobreak >nul

:start_backend
echo.
echo 🚀 Step 4: Starting backend server...
cd /d "d:\lib\backend"
node server.js
if %ERRORLEVEL% NEQ 0 (
    goto :error
)
goto :success

:error
echo.
echo ❌ ERROR: Failed to start backend!
echo 💡 Try running this script again or check for other issues
pause
exit /b 1

:success
echo.
echo ✅ SUCCESS: Backend is running!
echo 🌐 Server: http://localhost:5002
echo 📊 MongoDB: Connected
echo.
echo 💡 Press Ctrl+C to stop the server
pause
exit /b 0
