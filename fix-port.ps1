# Simple port fix script
Write-Host "🔧 Fixing Port 5002..." -ForegroundColor Cyan

# Find and kill process using port 5002
$process = netstat -ano | findstr :5002
if ($process) {
    $tokens = $process -split '\s+'
    $processId = $tokens[4]
    
    if ($processId -match '^\d+$') {
        Write-Host "📋 Killing process $processId using port 5002" -ForegroundColor Yellow
        taskkill /PID $processId /F | Out-Null
        Write-Host "✅ Process killed" -ForegroundColor Green
        
        # Wait for port to release
        Start-Sleep -Seconds 2
    }
}

# Start backend
Write-Host "🚀 Starting backend..." -ForegroundColor Blue
Set-Location "D:\lib\backend"
node server.js
