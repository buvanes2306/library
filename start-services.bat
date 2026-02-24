@echo off
echo 🚀 Starting Library Management Services...

echo.
echo 📊 Step 1: Starting MongoDB...
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath "C:\data\db" --port 27017 --install --serviceName "MongoDB" --serviceDisplayName "MongoDB" --logpath "C:\Program Files\MongoDB\Server\8.0\log\mongod.log"

echo.
echo 📊 Step 2: Starting Backend...
cd /d "d:\lib\backend"
start /B node server.js

echo.
echo 📊 Step 3: Starting Frontend...
cd /d "d:\lib\frontend"
start /B npm run dev

echo.
echo ✅ All services started!
echo 📊 Frontend: http://localhost:5173
echo 📊 Backend: http://localhost:5002
echo 📊 MongoDB: localhost:27017
pause
