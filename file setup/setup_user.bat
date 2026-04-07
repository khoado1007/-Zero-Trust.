@echo off
title Setup User Module
echo [*] Dang tao cau truc cho SYSTEM\USER...

mkdir system\user 2>nul
if not exist system\user\agent_core.py type nul > system\user\agent_core.py
if not exist system\user\updater.bat type nul > system\user\updater.bat

echo [v] Hoan tat khu vuc USER.
pause