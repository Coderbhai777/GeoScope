@echo off
set "PATH=d:\Shivansh Data\Projects\MinGit\cmd;%PATH%"
cd /d "%~dp0"
echo ===================================================================
echo   Pushing GeoScope to https://github.com/Coderbhai777/GeoScope
echo ===================================================================
echo.
git push -u origin main --force
echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================================
    echo   SUCCESS! GeoScope published to:
    echo   https://github.com/Coderbhai777/GeoScope
    echo ===================================================================
) else (
    echo.
    echo If prompted for password, enter your GitHub Personal Access Token.
    echo To generate a token: https://github.com/settings/tokens
)
echo.
pause
