# One-command script to kill port 5002 process and start backend
param(
    [switch]$Force
)

Write-Host "🔧 Backend Port Fix Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Step 1: Find and kill process using port 5002
Write-Host "📋 Step 1: Finding process using port 5002..." -ForegroundColor Yellow

$portProcess = netstat -ano | findstr :5002
if ($portProcess) {
    # Extract PID from netstat output (5th token)
    $tokens = $portProcess -split '\s+'
    $processId = $tokens[4]
    
    if ($processId -and $processId -match '^\d+$') {
        Write-Host "📋 Found process $processId using port 5002" -ForegroundColor Red
        Write-Host "🔨 Killing process $processId..." -ForegroundColor Yellow
        
        try {
            taskkill /PID $processId /F | Out-Null
            Write-Host "✅ Successfully killed process $processId" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to kill process $processId" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Could not extract valid PID from netstat output" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Port 5002 is already free" -ForegroundColor Green
}

# Step 2: Wait for port to be fully released
Write-Host "⏳ Step 2: Waiting for port to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 3: Verify port is free
Write-Host "🔍 Step 3: Verifying port is free..." -ForegroundColor Yellow
$checkAgain = netstat -ano | findstr :5002
if ($checkAgain) {
    Write-Host "❌ Port 5002 is still in use!" -ForegroundColor Red
    Write-Host "🔄 Trying again..." -ForegroundColor Yellow
    
    # Recursive call with force flag
    & "$PSCommandPath" -File $PSCommandPath -Force
    exit
} else {
    Write-Host "✅ Port 5002 is confirmed free" -ForegroundColor Green
}

# Step 4: Start backend
Write-Host "🚀 Step 4: Starting backend server..." -ForegroundColor Blue
Write-Host "📂 Changing to backend directory..." -ForegroundColor Gray

try {
    Set-Location "D:\lib\backend"
    Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Gray
    
    Write-Host "🔧 Starting Node.js server..." -ForegroundColor Blue
    node server.js
    
} catch {
    Write-Host "❌ Failed to start backend" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "💡 Try running this script again with -Force parameter" -ForegroundColor Yellow
}

Write-Host "✅ Script completed!" -ForegroundColor Green
