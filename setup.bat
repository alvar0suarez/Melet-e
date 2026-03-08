@echo off
setlocal EnableDelayedExpansion
echo ========================================
echo   Melete — First Time Setup
echo ========================================
echo.

:: ── Check Python ────────────────────────────────────────────────────────────
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python not found.
    echo Install Python 3.11+ from https://www.python.org/downloads/
    echo Make sure to check "Add python.exe to PATH" during install.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo Python: %%v

:: ── Find Node.js (varios paths comunes) ─────────────────────────────────────
set NODE_FOUND=0

:: PATH normal
node --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set NODE_FOUND=1
)

:: Rutas tipicas de instalacion en Windows
if !NODE_FOUND! equ 0 (
    for %%p in (
        "%ProgramFiles%\nodejs\node.exe"
        "%ProgramFiles(x86)%\nodejs\node.exe"
        "%LOCALAPPDATA%\Programs\nodejs\node.exe"
        "%APPDATA%\nvm\current\node.exe"
    ) do (
        if exist %%p (
            for %%d in (%%p) do set "NODE_DIR=%%~dpp"
            set "PATH=!NODE_DIR!;!PATH!"
            set NODE_FOUND=1
        )
    )
)

:: Intentar instalar con winget (Windows 10/11)
if !NODE_FOUND! equ 0 (
    echo Node.js no encontrado. Intentando instalar con winget...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if !ERRORLEVEL! equ 0 (
        echo Node.js instalado. Reiniciando PATH...
        :: Refrescar PATH
        for /f "tokens=*" %%p in ('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do (
            set "PATH=%%p;%PATH%"
        )
        node --version >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            set NODE_FOUND=1
            echo Node.js listo.
        )
    )
)

if !NODE_FOUND! equ 0 (
    echo.
    echo ============================================================
    echo  Node.js es necesario para compilar la interfaz.
    echo  Instala desde: https://nodejs.org  (LTS version)
    echo  Luego vuelve a ejecutar este script.
    echo ============================================================
    echo.
    echo  Alternativa rapida: abre PowerShell como administrador y ejecuta:
    echo    winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo Node.js: %%v
for /f "tokens=*" %%v in ('npm --version 2^>^&1') do echo npm: %%v

echo.

:: ── [1/3] Python dependencies ────────────────────────────────────────────────
echo [1/3] Instalando dependencias Python...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo ERROR: pip install fallo. Prueba manualmente: pip install -r requirements.txt
    pause
    exit /b 1
)
echo OK.
echo.

:: ── [2/3] Node dependencies ──────────────────────────────────────────────────
echo [2/3] Instalando dependencias Node.js (puede tardar unos minutos)...
cd ui
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install fallo.
    cd ..
    pause
    exit /b 1
)
echo OK.
echo.

:: ── [3/3] Build frontend ─────────────────────────────────────────────────────
echo [3/3] Compilando la interfaz React...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm run build fallo. Revisa los errores de arriba.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   Setup completado con exito!
echo.
echo   Para arrancar Melete:  start.bat
echo   O directamente:        python main.py
echo.
echo   Acceso movil: abre esta URL en tu telefono
echo   (misma red WiFi):
echo.
powershell -NoProfile -Command "try { $ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.PrefixOrigin -ne 'WellKnown'} | Select-Object -First 1).IPAddress; Write-Host \"   http://${ip}:7749\" } catch { Write-Host '   http://[tu-ip]:7749' }"
echo.
echo ========================================
pause
