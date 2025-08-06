@echo off
echo Setting up Razorpay server...

REM Create a separate directory for the server
if not exist "razorpay-server" mkdir razorpay-server

REM Copy server files
copy server.js razorpay-server\
copy server-package.json razorpay-server\package.json

REM Navigate to server directory
cd razorpay-server

REM Install dependencies
echo Installing dependencies...
npm install

REM Start the server
echo Starting Razorpay server...
echo Server will be available at http://localhost:3000
echo Press Ctrl+C to stop the server
npm start 