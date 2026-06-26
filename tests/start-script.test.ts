import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows one-click launcher', () => {
  it('starts the release executable and only builds it when missing', () => {
    const script = readFileSync(resolve('启动项目.bat'), 'utf8');

    expect(script).toContain('cd /d "%~dp0"');
    expect(script).toContain('if not exist "node_modules"');
    expect(script).toContain('npm install');
    expect(script).toContain('set "APP_EXE=src-tauri\\target\\release\\idea-drop-box.exe"');
    expect(script).toContain('if not exist "%APP_EXE%"');
    expect(script).toContain('set "NEEDS_BUILD=0"');
    expect(script).toContain('LastWriteTimeUtc');
    expect(script).toContain('src-tauri\\src');
    expect(script).toContain('src-tauri\\capabilities');
    expect(script).toContain('if errorlevel 1 set "NEEDS_BUILD=1"');
    expect(script).toContain('if "%NEEDS_BUILD%"=="1"');
    expect(script).toContain('npm run tauri build -- --no-bundle');
    expect(script).not.toContain('cargo build --release');
    expect(script).toContain('start "" "%APP_EXE%"');
    expect(script).not.toContain('npm start');
    expect(script).toContain('exit /b 0');
    expect(script).toContain('pause');
    expect(script).not.toContain('App launched. You can close this window.');
  });
});
