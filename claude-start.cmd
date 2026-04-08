@echo off
SET CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000

where claude >nul 2>&1
if %ERRORLEVEL% equ 0 (
    claude --dangerously-skip-permissions
) else (
    "%USERPROFILE%\.local\bin\claude.exe" --dangerously-skip-permissions
)
