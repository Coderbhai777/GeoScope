@echo off
set PATH=C:\Program Files\nodejs;%PATH%
d:
cd "d:\Shivansh Data\Projects\GeoScope\client"
call npm run dev -- --host 0.0.0.0 --port 3000
