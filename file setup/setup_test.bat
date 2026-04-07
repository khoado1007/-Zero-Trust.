@echo off
title Setup Test Module
echo [*] Dang tao cau truc cho TEST...

mkdir test 2>nul
if not exist test\agent_boss.py type nul > test\agent_boss.py
if not exist test\agent_dev.py type nul > test\agent_dev.py

echo [v] Hoan tat khu vuc TEST.
pause