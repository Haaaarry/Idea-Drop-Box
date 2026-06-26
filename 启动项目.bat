@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo Idea Drop Box - one-click launcher
echo ========================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js, then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules was not found. Installing dependencies...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Check the error output above.
    echo.
    pause
    exit /b 1
  )
  echo.
)

set "APP_EXE=src-tauri\target\release\idea-drop-box.exe"
set "NEEDS_BUILD=0"

if not exist "%APP_EXE%" set "NEEDS_BUILD=1"

if "%NEEDS_BUILD%"=="0" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$exe = Resolve-Path '%APP_EXE%'; $exeTime = (Get-Item $exe).LastWriteTimeUtc; $paths = @('package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.build.json','index.html','src','src-tauri\src','src-tauri\capabilities','src-tauri\icons','src-tauri\Cargo.toml','src-tauri\Cargo.lock','src-tauri\build.rs','src-tauri\tauri.conf.json'); foreach ($path in $paths) { if (Test-Path $path) { $item = Get-Item $path; if ($item.PSIsContainer) { $newer = Get-ChildItem $path -Recurse -File | Where-Object { $_.LastWriteTimeUtc -gt $exeTime } | Select-Object -First 1; if ($newer) { exit 1 } } elseif ($item.LastWriteTimeUtc -gt $exeTime) { exit 1 } } }; exit 0"
  if errorlevel 1 set "NEEDS_BUILD=1"
)

if "%NEEDS_BUILD%"=="1" (
  echo Release app is missing or out of date. Building it now...
  echo This may take several minutes when Rust files changed.
  echo.
  call npm run tauri build -- --no-bundle
  if errorlevel 1 (
    echo.
    echo Tauri release build failed. Check the error output above.
    echo.
    pause
    exit /b 1
  )
  echo.
)

echo Starting the release app...
echo.

start "" "%APP_EXE%"
exit /b 0
