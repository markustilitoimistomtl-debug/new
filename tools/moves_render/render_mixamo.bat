@echo off
rem Moves Render - oma hahmo Mixamosta.
rem Laita tahan kansioon: hahmo.fbx (With Skin) ja animaatiot nimilla walk.fbx, jog.fbx, run.fbx, backpedal.fbx ...
call :findblender
set ANIMS=
for %%F in ("%~dp0*.fbx") do if /I not "%%~nF"=="hahmo" call set ANIMS=%%ANIMS%% %%~nF="%%F"
"%BLENDER%" -b -P "%~dp0moves_render.py" -- --fbx-model "%~dp0hahmo.fbx" --fbx-anim %ANIMS% --out "%~dp0renders_mixamo" 
echo.
echo Valmis. Avaa kansio "renders_mixamo" Moves-ohjelmassa.
pause
exit /b

:findblender
set BLENDER=blender
for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do if exist "%%D\blender.exe" set BLENDER=%%D\blender.exe
exit /b
