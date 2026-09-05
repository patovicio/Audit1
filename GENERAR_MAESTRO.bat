@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM  GENERAR_MAESTRO.bat
REM  Regenera clientes_maestro.json desde friosur_analytics.duckdb
REM  (venta del mes, ultimo pedido, freezers, cafe, top productos)
REM ============================================================

cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"

if not exist "%PY%" (
    echo [ERROR] No se encontro el entorno virtual: %PY%
    echo         Verifica que exista la carpeta .venv en AppAuditoria.
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   Generando clientes_maestro.json desde DuckDB...
echo ============================================================
echo.

"%PY%" generar_maestro_desde_duckdb.py
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
    echo [ERROR] La generacion fallo (codigo %RC%^).
    echo         Revisa que la base DuckDB exista y este actualizada.
    echo.
    pause
    exit /b %RC%
)

echo ============================================================
echo   LISTO. Archivo generado:
echo   %cd%\clientes_maestro.json
echo ------------------------------------------------------------
echo   IMPORTANTE - para que la app tome los datos nuevos:
echo.
echo   1. Abri Google Drive.
echo   2. Sobre el clientes_maestro.json que YA existe ahi,
echo      clic derecho  ^>  Gestionar versiones  ^>  Subir nueva version.
echo   3. Elegi el archivo que se acaba de generar (esta carpeta^).
echo.
echo   NO lo subas como archivo nuevo: usa "Subir nueva version"
echo   para conservar el mismo ID y no tocar el Apps Script.
echo ============================================================
echo.
pause
