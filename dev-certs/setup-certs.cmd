@echo off
setlocal

set CERTS_DIR=%~dp0certs
set MKCERT=%~dp0mkcert.exe

if not exist "%CERTS_DIR%" mkdir "%CERTS_DIR%"

:: Download mkcert if not present
if not exist "%MKCERT%" (
    echo Downloading mkcert v1.4.4 ...
    curl -L -o "%MKCERT%" https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe
    if errorlevel 1 (
        echo Failed to download mkcert.
        exit /b 1
    )
    echo Downloaded mkcert.
)

:: Install local CA into the system / browser trust stores (requires admin the first time)
echo.
echo Installing local CA (may prompt for admin privileges) ...
"%MKCERT%" -install
if errorlevel 1 (
    echo.
    echo [!] mkcert -install failed. Re-run this script as Administrator.
    exit /b 1
)

:: Generate certificate for localhost
echo.
echo Generating certificates for localhost ...
"%MKCERT%" -cert-file "%CERTS_DIR%\localhost.pem" -key-file "%CERTS_DIR%\localhost-key.pem" localhost 127.0.0.1 ::1

echo.
echo ============================================================
echo   Certificates created in dev-certs\certs\
echo     localhost.pem       (certificate)
echo     localhost-key.pem   (private key)
echo.
echo   Local CA installed in system trust store.
echo   Run: docker-compose up -d --build
echo ============================================================
endlocal
