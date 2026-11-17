@echo off
rem Moves Render 2 - valmiiksi väritetty versio (punainen paita), suoraan Movesiin, yksi hiustyyli
call :findblender
"%BLENDER%" -b -P "%~dp0moves_render.py" -- --out "%~dp0renders_natural" --palette natural --hair messy
echo.
echo Valmis. Avaa renders_natural\body tai renders_natural\hair_messy Moves-ohjelmassa
pause
exit /b

:findblender
set BLENDER=blender
for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BLENDER=%%D\blender.exe
exit /b
