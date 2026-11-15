@echo off
set PATH=C:\Program Files\nodejs;%PATH%
d:
cd "d:\Shivansh Data\Projects\GeoScope\client"
call npm install cesium vite-plugin-cesium lucide-react recharts
call npm install -D tailwindcss postcss autoprefixer
call npm install
