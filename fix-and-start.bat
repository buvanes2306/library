@echo off
echo 🔧 Fixing port 5002 and starting backend...

echo.
echo 📋 Step 1: Finding process using port 5002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002') do (
    if "%%a"=="LISTENING" (
        set PID=%%b
        goto :found
    )
)

if not defined PID (
    echo ✅ Port 5002 is already free
    goto :start
)

:found
echo 📋 Found process %PID% using port 5002
echo.
echo 📋 Step 2: Killing process %PID%...
taskkill /PID %PID% /F
echo ✅ Killed process %PID%

:start
echo.
echo 📋 Step 3: Starting backend...
cd /d "d:\lib\backend"
node server.js

pause
