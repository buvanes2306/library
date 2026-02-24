@echo off
echo 🛑 Stopping Library Management Services...

echo.
echo 📊 Step 1: Stopping Frontend...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 📊 Step 2: Stopping Backend...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 📊 Step 3: Stopping MongoDB...
net stop MongoDB >nul 2>&1

echo.
echo ✅ All services stopped!
pause
