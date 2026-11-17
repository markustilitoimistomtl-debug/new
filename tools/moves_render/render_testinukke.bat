@echo off
rem Moves Render 2 - testinukke: 26 pelin liikettä x 8 suuntaa x 7 hiustyyliä (kerroksina)
call :findblender
"%BLENDER%" -b -P "%~dp0moves_render.py" -- --out "%~dp0renders"
echo.
echo Valmis: renders\body = vartalo (avainvärit), renders\hair_* = hiukset.
echo Väritetyt esikatselut + pelin sheetit: python make_game_assets.py renders out
pause
exit /b

:findblender
set BLENDER=blender
for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BLENDER=%%D\blender.exe
exit /b
