# 🌍 GeoScope — 3D Global Tactical OSINT Globe & Real-Time Cockpit Flight Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CesiumJS](https://img.shields.io/badge/3D%20Globe-CesiumJS%201.115+-blueviolet.svg)](https://cesium.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20TailwindCSS-06B6D4.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green.svg)](https://nodejs.org/)
[![Live Telemetry](https://img.shields.io/badge/Live%20Fleet-7%2C500%2B%20Aircraft-F59E0B.svg)](#)
[![Satellite](https://img.shields.io/badge/Imagery-Esri%20High--Res%20Satellite-emerald.svg)](#)

> **Real-time geospatial intelligence terminal and 3D globe tracker.** Track 7,500+ live civilian and commercial flights globally, ride in the cockpit with an authentic pilot heads-up display (HUD), inspect real photorealistic satellite earth photography, and monitor natural disasters in real time.

---

## 🏷️ Discovery Tags & Viral Topics

`#OSINT` `#CesiumJS` `#FlightTracker` `#PilotView` `#CockpitCam` `#FlightSimulator` `#Aviation` `#GIS` `#Geospatial` `#Satellite` `#RealTime` `#Web3D` `#Vite` `#TypeScript` `#Flightradar24` `#OpenSky` `#EarthquakeTracker` `#NaturalDisasters` `#OpenSource` `#BuildInPublic` `#AeroSpace` `#TechTwitter`

---

## ✨ Key Features

### 🛫 1. Godseye-Inspired Pilot's View & Cockpit Cam
- **Step into the Cockpit**: Select any airborne flight anywhere in the world and enter the pilot's seat in one click.
- **Dynamic Camera Modes**:
  - **`COCKPIT VIEW`**: First-person pilot perspective through the forward windshield with realistic horizon tilt.
  - **`LOOK DOWN (GROUND)`**: Belly-cam reconnaissance mode facing straight down at the satellite terrain.
  - **`CHASE VIEW`**: Third-person cinematic trailing camera behind the tail.
  - **`WING VIEW`**: Passenger window perspective past the wing and engine.
  - **`TACTICAL TOP-DOWN`**: Nadir orbital lock on the aircraft's track.
- **Tactical Flight HUD**:
  - Airspeed tape (knots & km/h)
  - Barometric altitude tape (feet & meters)
  - 360° heading compass tape with cardinal markers
  - Pitch ladder boresight reticle & vertical speed indicator (V/S)
  - Source provenance and live coordinate telemetry

### 🛰️ 2. Photorealistic High-Resolution Satellite Earth Imagery
- **Esri World Imagery Basemap**: True-to-life photographic terrain rendering across all altitudes.
- **150m Altitude Proximity**: Zoom down to individual airport runways, topography, highways, and coastlines without clipping.
- **Instant Basemap Switcher**:
  - 🛰️ **Satellite (Esri HD)**: Pure photorealistic photography
  - 🌐 **Hybrid**: Satellite imagery with international borders, cities, and road vectors
  - 🗺️ **Streets**: Cartographic vector map

### 📡 3. Multi-Provider ADS-B Ingestion Gateway
- Ingests **7,500+ real aircraft** updated every 5 seconds.
- Multi-provider architecture with automatic fallback across ADS-B feeds.
- **Zero Mock Data**: Strictly authentic live observation timestamps, callsigns, ICAO hex addresses, altitudes, and headings.
- Real-time **stale data detection** (`FRESH`, `AGING`, `STALE`).

### 🇮🇳 4. North Maharashtra Aviation Training Corridor
- Dedicated monitoring of regional flight academies around **Shirpur (VA1B)**, **Jalgaon**, **Dhule**, and **Sendhwa**.
- Verified fleet categorization for **Skynex Aero** training aircraft (Piper Archer DX: `VT-KTU`, `VT-NXJ`, `VT-NXS`, `VT-CZR`, `VT-NXQ`, `VT-NXO`, etc.).
- Historical flight path breadcrumbs showing training patterns, touch-and-goes, and holding corridors.

### 🌋 5. Multi-Hazard Global Intelligence (OSINT)
- **USGS Earthquakes**: Real-time seismic activity with magnitude-scaled color coding and hypocenter depths.
- **NASA EONET & GDACS**: Live tropical cyclones, volcanic eruptions, floods, and wildfires.
- **Space Track (TLEs)**: Real-time SGP4 orbital propagation for ISS, Tiangong, Hubble, and Starlink constellations.

---

## 🏛️ Architecture

```mermaid
graph TD
    subgraph Data Sources
        FR24[ADS-B Multi-Feed Gateway]
        USGS[USGS Seismic API]
        NASA[NASA EONET & GDACS]
        NORAD[Celestrak NORAD TLEs]
        ESRI[Esri World Satellite Imagery]
    end

    subgraph GeoScope Server (Port 5050)
        Engine[Ingestion Engine & Deduplicator]
        Registry[Fleet & Organization Registry]
        Provenance[Provenance & Freshness Auditor]
        API[Express REST Gateway]
    end

    subgraph GeoScope Client (Port 3000)
        Cesium[CesiumJS 3D WebGL Globe]
        HUD[Cockpit HUD Overlay Engine]
        UI[React 19 / Tailwind UI Controls]
    end

    FR24 --> Engine
    USGS --> Engine
    NASA --> Engine
    NORAD --> Engine

    Engine --> Registry
    Registry --> Provenance
    Provenance --> API

    API -->|Live Telemetry Stream| UI
    ESRI -->|Photorealistic Tiles| Cesium
    UI --> Cesium
    Cesium --> HUD
```

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/Coderbhai777/GeoScope.git
cd GeoScope
```

### 2. Start the Backend Gateway
```bash
cd server
npm install
node server.js
```
*Backend runs on `http://localhost:5050`*

### 3. Start the Frontend Client
```bash
cd ../client
npm install
npm run dev
```
*Client runs on `http://localhost:3000`*

---

## 🎮 Keyboard & Mouse Shortcuts

| Key / Action | Function |
| :--- | :--- |
| **`ESC`** | Exit Pilot's View / Return to Globe |
| **`Click Aircraft`** | Select flight and open Telemetry Drawer |
| **`Scroll Wheel`** | Smooth altitude zoom (clamped down to 150m) |
| **`Double Click`** | Instant fly-to point with smooth deceleration |
| **`Layers Button`** | Toggle Satellite, Hybrid, or Street basemaps |

---

## 📢 Social Share Template (Ready for X / LinkedIn / Reddit)

Copy and paste this post to showcase the project:

```text
🚀 Just built GeoScope: an open-source 3D tactical OSINT globe with a real-time Cockpit Pilot View!

✈️ Ride inside the cockpit of any of 7,500+ live planes in 3D CesiumJS
🛰️ Photorealistic Esri high-res satellite earth photography
🎯 Tactical HUD with live airspeed, altitude tapes, and heading ribbon
🌋 Live natural disasters (NASA, GDACS) and USGS earthquakes

Check it out on GitHub: https://github.com/YOUR_USERNAME/GeoScope

#OSINT #CesiumJS #FlightTracker #Aviation #BuildInPublic #OpenSource #React #Web3D #Vite #JavaScript
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
