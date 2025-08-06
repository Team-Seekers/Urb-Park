Write-Host "Setting up Razorpay server..." -ForegroundColor Green

# Create a separate directory for the server
if (!(Test-Path "razorpay-server")) {
    New-Item -ItemType Directory -Name "razorpay-server"
}

# Copy server files
Copy-Item "server.js" -Destination "razorpay-server\"
Copy-Item "server-package.json" -Destination "razorpay-server\package.json"

# Navigate to server directory
Set-Location "razorpay-server"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Start the server
Write-Host "Starting Razorpay server..." -ForegroundColor Green
Write-Host "Server will be available at http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
npm start 