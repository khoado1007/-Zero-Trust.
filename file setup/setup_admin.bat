@echo off
title Setup Admin Module
echo [*] Dang tao cau truc cho SYSTEM\ADMIN...

mkdir system\admin\backend\src\config 2>nul
mkdir system\admin\backend\src\controllers 2>nul
mkdir system\admin\backend\src\middlewares 2>nul
mkdir system\admin\backend\src\models\sql 2>nul
mkdir system\admin\backend\src\models\nosql 2>nul
mkdir system\admin\backend\src\routes 2>nul
mkdir system\admin\backend\src\services 2>nul
mkdir system\admin\backend\src\utils 2>nul

if not exist system\admin\backend\server.js type nul > system\admin\backend\server.js
if not exist system\admin\backend\.env type nul > system\admin\backend\.env
if not exist system\admin\backend\package.json type nul > system\admin\backend\package.json

mkdir system\admin\frontend 2>nul
if not exist system\admin\frontend\index.html type nul > system\admin\frontend\index.html

echo [v] Hoan tat khu vuc ADMIN.
pause