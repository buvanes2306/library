# One-command script to fix port 5002 and start backend
Write-Host "🔧 Fixing port 5002 and starting backend..." -ForegroundColor Green

# Step 1: Find process using port 5002
$process = netstat -ano | findstr :5002
if ($process) {
    # Extract PID from netstat output
    $pid = ($process -split '\s+')[4]
    Write-Host "📋 Found process $pid using port 5002" -ForegroundColor Yellow
    
    # Step 2: Kill the process
    taskkill /PID $pid /F
    Write-Host "✅ Killed process $pid" -ForegroundColor Green
} else {
    Write-Host "✅ Port 5002 is already free" -ForegroundColor Green
}

# Step 3: Wait a moment for port to be fully released
Start-Sleep -Seconds 2

# Step 4: Start backend
Write-Host "🚀 Starting backend..." -ForegroundColor Blue
Set-Location "D:\lib\backend"
node server.js
