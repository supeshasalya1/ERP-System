@echo off
REM Deploy script for Node.js project
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========== Setup and Deploy ==========
echo Installing dependencies...
echo.

REM Install client dependencies if not exist
if not exist "client\node_modules" (
    echo [1/4] Installing client dependencies...
    cd client
    call npm install
    if errorlevel 1 (
        echo Failed to install client dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [1/4] Client dependencies already installed
)

REM Install server dependencies if not exist
if not exist "server\node_modules" (
    echo [2/4] Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo Failed to install server dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [2/4] Server dependencies already installed
)

REM Build client if build folder doesn't exist
if not exist "client\build" (
    echo [3/4] Building client...
    cd client
    call npm run build
    echo Starting Database Init...
    start "Database Init" cmd /k "cd /d %CD% && nodemon server/src/init-sqlite.js"
    if errorlevel 1 (
        echo Failed to build client
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [3/4] Client build already exists
)

echo [4/4] Starting services...
echo.

REM Start all three services in separate windows
echo Starting Client Deploy...
start "Client Deploy" cmd /k "cd /d %CD% && node client/deploy.js"

timeout /t 2 >nul






timeout /t 2 >nul

echo Starting Server...
start "Server" cmd /k "cd /d %CD% && nodemon server/src/app.js"

echo.
echo ========== All Services Started ==========
echo Services running in separate windows:
echo - Client Deploy: client/delpoy.js
echo - Database Init: server/src/init-sqlite.js
echo - Server: server/src/app.js
echo.
echo Close any window to stop that service.
echo.
pause