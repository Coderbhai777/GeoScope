/**
 * GeoScope Ingestion Gateway & Real-Time Data Services
 * Multi-Provider Ingestion Architecture:
 *  1. adsb.lol (Community ADS-B with 429 rate-limit handling)
 *  2. OpenSky Network (Authorized REST API integration)
 *  3. Independent SDR Direct Ingestion (dump1090 / readsb / tar1090)
 *  4. Flightradar24 worldwide web feed (Fallback with clear provider disclosure)
 * USGS Earthquakes, NASA EONET Disasters, Open-Meteo, CelesTrak SGP4 Satellites.
 */

const express = require('express');
const cors = require('cors');
const satellite = require('satellite.js');

const { aggregateDisasters } = require('./disaster/services/disaster-aggregator.service');
const { 
  matchFleetAircraft, 
  getNorthMaharashtraTrainingFleet, 
  getAllAircraft, 
  getOrganizations, 
  getNorthMaharashtraBounds, 
  isNorthMaharashtraAirspace 
} = require('./aviation/fleet-registry');
const { ingestAllProviders, getProviderDiagnostics } = require('./aviation/providers/provider-manager');
const { recordFlightBreadcrumb, getFlightTrail, getDetailedFlightTrail } = require('./aviation/flight-trails');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// In-Memory Rate-Limited Caching Store
const CACHE = {
  flights: { data: [], timestamp: 0, ttl: 4000 }, // 4s fast refresh for smooth aircraft updates
  earthquakes: { data: [], timestamp: 0, ttl: 60000 },
  disasters: { data: [], timestamp: 0, ttl: 300000 },
  satellites: { data: [], timestamp: 0, ttl: 1800000 },
  weather: new Map()
};

// Global in-memory flight master store keyed by ICAO hex
const FLIGHT_STORE = new Map();

/**
 * Master Flight Ingestion: Aggregates multi-provider feeds into FLIGHT_STORE.
 * Strictly preserves raw observations, source timestamps, provider provenance, and detects stale data.
 * Never fabricates flight movements.
 */
async function getLiveFlights() {
  const now = Date.now();
  if (CACHE.flights.data.length > 0 && (now - CACHE.flights.timestamp) < CACHE.flights.ttl) {
    return CACHE.flights.data;
  }

  try {
    const rawIngested = await ingestAllProviders();
    const nowSec = Math.floor(now / 1000);
    let incomingCount = 0;

    for (const flight of rawIngested) {
      if (!flight.icao24) continue;

      // Authentic Registry Identification matching
      const fleetMatch = matchFleetAircraft(flight.callsign, flight.icao24);
      if (fleetMatch) {
        flight.fleetMetadata = fleetMatch;
        flight.operator = fleetMatch.operator;
        flight.model = fleetMatch.aircraftModel;
        flight.category = fleetMatch.category || 'training';
        flight.ownershipStatus = fleetMatch.ownershipStatus;
        flight.sourceOfVerification = fleetMatch.sourceOfVerification;
        flight.verificationNotes = fleetMatch.verificationNotes;
        flight.baseAirport = fleetMatch.baseAirport;
        flight.isNorthMaharashtraTraining = fleetMatch.isNorthMaharashtraTraining === true;
        // Truthful label: Not NMIMS-owned
        flight.isNmimsFleet = false;
        
        if (flight.crossCheckCount > 1) {
          flight.verificationStatus = `Cross-Checked (${flight.crossCheckCount} Sources) • ${fleetMatch.operator}`;
        } else {
          flight.verificationStatus = `Registry Matched (${fleetMatch.operator}) • Single-Feed Tracking`;
        }
      } else {
        flight.isNmimsFleet = false;
        flight.isNorthMaharashtraTraining = isNorthMaharashtraAirspace(flight.lat, flight.lon);
        flight.category = 'commercial';
        if (flight.crossCheckCount > 1) {
          flight.verificationStatus = `Cross-Checked (${flight.crossCheckCount} Sources)`;
        } else {
          flight.verificationStatus = `Single-Source Observation (${flight.providerName})`;
        }
      }

      // Preserve observation timestamp & calculate freshness
      const obsTs = flight.observationTimestamp || Math.floor(now / 1000);
      const ageSec = Math.max(0, nowSec - obsTs);
      flight.ageSeconds = ageSec;
      flight.freshness = ageSec > 60 ? 'STALE' : (ageSec > 25 ? 'AGING' : 'FRESH');
      flight.positionType = 'RECEIVED';
      flight.isInterpolated = false;

      // Historical Flight Trail breadcrumb recording (received raw positions only)
      recordFlightBreadcrumb(flight.icao24, flight.lon, flight.lat, flight.altitude, obsTs);
      flight.trail = getFlightTrail(flight.icao24);

      FLIGHT_STORE.set(flight.icao24, flight);
      incomingCount++;
    }

    // Prune stale aircraft not heard from for > 90 seconds
    for (const [hex, f] of FLIGHT_STORE.entries()) {
      const age = nowSec - (f.observationTimestamp || f.lastSeen || nowSec);
      if (age > 90) {
        FLIGHT_STORE.delete(hex);
      } else {
        f.ageSeconds = Math.max(0, age);
        f.freshness = age > 60 ? 'STALE' : (age > 25 ? 'AGING' : 'FRESH');
      }
    }

    const merged = Array.from(FLIGHT_STORE.values());
    if (merged.length > 0) {
      CACHE.flights.data = merged;
      CACHE.flights.timestamp = now;
      console.log(`[GeoScope Flight Engine] Ingested ${incomingCount} reports -> Active global fleet: ${merged.length} aircraft`);
      return merged;
    }
  } catch (err) {
    console.warn(`[Flight Engine Warning]: ${err.message}`);
  }

  return CACHE.flights.data;
}

// ==========================================
// 2. EARTHQUAKE SERVICE (USGS GeoJSON)
// ==========================================
async function fetchUSGSEarthquakes(feed = 'all_day') {
  const now = Date.now();
  if (CACHE.earthquakes.data.length > 0 && (now - CACHE.earthquakes.timestamp) < CACHE.earthquakes.ttl) {
    return CACHE.earthquakes.data;
  }

  try {
    const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);

    const json = await res.json();
    const quakes = (json.features || []).map(f => ({
      id: f.id,
      mag: f.properties.mag,
      title: f.properties.title,
      place: f.properties.place,
      time: f.properties.time,
      updated: f.properties.updated,
      url: f.properties.url,
      tsunami: f.properties.tsunami,
      status: f.properties.status,
      significance: f.properties.sig,
      type: f.properties.type,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2]
    }));

    CACHE.earthquakes.data = quakes;
    CACHE.earthquakes.timestamp = now;
    return quakes;
  } catch (err) {
    return CACHE.earthquakes.data;
  }
}

// ==========================================
// 3. NATURAL DISASTER SERVICE (NASA EONET)
// ==========================================
async function fetchNASADisasters() {
  const now = Date.now();
  if (CACHE.disasters.data.length > 0 && (now - CACHE.disasters.timestamp) < CACHE.disasters.ttl) {
    return CACHE.disasters.data;
  }

  try {
    const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NASA EONET HTTP ${res.status}`);

    const json = await res.json();
    const disasters = [];

    for (const ev of (json.events || [])) {
      const category = ev.categories && ev.categories[0] ? ev.categories[0].title : 'Severe Weather';
      const catId = ev.categories && ev.categories[0] ? ev.categories[0].id : 'severeStorms';
      const latestGeo = ev.geometry && ev.geometry.length > 0 ? ev.geometry[ev.geometry.length - 1] : null;
      if (latestGeo && latestGeo.coordinates) {
        disasters.push({
          id: ev.id,
          title: ev.title,
          category,
          categoryId: catId,
          date: latestGeo.date,
          lon: latestGeo.coordinates[0],
          lat: latestGeo.coordinates[1],
          sourceUrl: ev.sources && ev.sources[0] ? ev.sources[0].url : null,
          allGeometries: ev.geometry
        });
      }
    }

    CACHE.disasters.data = disasters;
    CACHE.disasters.timestamp = now;
    return disasters;
  } catch (err) {
    return CACHE.disasters.data;
  }
}

// ==========================================
// 4. SPACE & SATELLITE SERVICE (CelesTrak SGP4)
// ==========================================
const SATELLITE_CATALOG = [
  { name: 'ISS (ZARYA)', norad: 25544, type: 'space_station', color: '#00F0FF' },
  { name: 'TIANGONG (CSS)', norad: 48274, type: 'space_station', color: '#FFD700' },
  { name: 'HST (HUBBLE)', norad: 20580, type: 'telescope', color: '#A855F7' },
  { name: 'TERRA (EOS AM-1)', norad: 25994, type: 'earth_observation', color: '#10B981' },
  { name: 'AQUA (EOS PM-1)', norad: 27424, type: 'earth_observation', color: '#3B82F6' },
  { name: 'SUOMI NPP', norad: 37849, type: 'weather', color: '#EC4899' },
  { name: 'NOAA 20', norad: 43013, type: 'weather', color: '#F97316' },
  { name: 'LANDSAT 8', norad: 39084, type: 'earth_observation', color: '#6366F1' },
  { name: 'LANDSAT 9', norad: 49260, type: 'earth_observation', color: '#8B5CF6' },
  { name: 'SENTINEL 6A', norad: 46984, type: 'oceanography', color: '#14B8A6' },
  { name: 'STARLINK-1007', norad: 44713, type: 'communications', color: '#E2E8F0' },
  { name: 'STARLINK-30154', norad: 56930, type: 'communications', color: '#E2E8F0' },
  { name: 'GOES 16 (EAST)', norad: 41866, type: 'geostationary', color: '#F59E0B' },
  { name: 'GOES 18 (WEST)', norad: 51850, type: 'geostationary', color: '#F59E0B' }
];

let TLE_CACHE = new Map();

async function refreshSatelliteTLEs() {
  const now = Date.now();
  if (TLE_CACHE.size > 0 && (now - CACHE.satellites.timestamp) < CACHE.satellites.ttl) {
    return;
  }

  try {
    const endpoints = [
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle'
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const text = await res.text();
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          for (let i = 0; i < lines.length - 2; i += 3) {
            const name = lines[i];
            const line1 = lines[i + 1];
            const line2 = lines[i + 2];
            const noradMatch = line1.match(/1\s+(\d{5})/);
            if (noradMatch) {
              const norad = parseInt(noradMatch[1], 10);
              const satrec = satellite.twoline2satrec(line1, line2);
              TLE_CACHE.set(norad, { name, line1, line2, satrec });
            }
          }
        }
      } catch (e) {}
    }

    CACHE.satellites.timestamp = now;
  } catch (err) {}
}

function computeSatellitePositions() {
  const now = new Date();
  const gmst = satellite.gstime(now);
  const results = [];

  for (const item of SATELLITE_CATALOG) {
    const tle = TLE_CACHE.get(item.norad);
    if (!tle || !tle.satrec) continue;

    try {
      const positionAndVelocity = satellite.propagate(tle.satrec, now);
      const posEci = positionAndVelocity.position;
      const velEci = positionAndVelocity.velocity;

      if (posEci && typeof posEci !== 'boolean') {
        const geodetic = satellite.eciToGeodetic(posEci, gmst);
        const lon = satellite.degreesLong(geodetic.longitude);
        const lat = satellite.degreesLat(geodetic.latitude);
        const altKm = geodetic.height;

        let velocityKmH = 0;
        if (velEci && typeof velEci !== 'boolean') {
          const velMagKmS = Math.sqrt(velEci.x * velEci.x + velEci.y * velEci.y + velEci.z * velEci.z);
          velocityKmH = Math.round(velMagKmS * 3600);
        }

        results.push({
          norad: item.norad,
          name: item.name,
          type: item.type,
          color: item.color,
          lat,
          lon,
          altitudeKm: Math.round(altKm),
          velocityKmH,
          timestamp: now.toISOString()
        });
      }
    } catch (e) {}
  }

  return results;
}

// Point Weather
async function fetchWeatherAtPoint(lat, lon) {
  const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const now = Date.now();
  if (CACHE.weather.has(key)) {
    const cached = CACHE.weather.get(key);
    if (now - cached.timestamp < 600000) return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    CACHE.weather.set(key, { data, timestamp: now });
    return data;
  } catch (err) {
    return null;
  }
}

// REST Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'GeoScope Multi-Provider Intelligence Gateway',
    time: new Date().toISOString(),
    services: {
      flights: { 
        cached: CACHE.flights.data.length, 
        lastSync: new Date(CACHE.flights.timestamp).toISOString(), 
        engine: 'GeoScope Multi-Provider Ingestion Engine (Flightradar24 Web Fallback, adsb.lol, OpenSky, Direct SDR)' 
      },
      earthquakes: { cached: CACHE.earthquakes.data.length, lastSync: new Date(CACHE.earthquakes.timestamp).toISOString() },
      disasters: { cached: CACHE.disasters.data.length, lastSync: new Date(CACHE.disasters.timestamp).toISOString() },
      satellites: { tracked: TLE_CACHE.size, lastSync: new Date(CACHE.satellites.timestamp).toISOString() }
    }
  });
});

app.get('/api/aviation/providers', (req, res) => {
  const diagnostics = getProviderDiagnostics();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    providers: diagnostics
  });
});

app.get('/api/aviation/registry', (req, res) => {
  res.json({
    success: true,
    organizations: getOrganizations(),
    aircraft: getAllAircraft()
  });
});

/**
 * NORTH MAHARASHTRA AVIATION
 * Dedicated endpoint for verified training aircraft around Shirpur, Jalgaon, Dhule, Sendhwa.
 * Displays actual aircraft registration, model, altitude, speed, heading, position, observation timestamp,
 * provider provenance, and freshness.
 */
app.get('/api/aviation/north-maharashtra', async (req, res) => {
  const registryFleet = getNorthMaharashtraTrainingFleet();
  const activeFlights = Array.from(FLIGHT_STORE.values());
  const bounds = getNorthMaharashtraBounds();
  const nowSec = Math.floor(Date.now() / 1000);

  let airborneCount = 0;
  let totalAlt = 0;
  let totalSpeed = 0;

  const fleet = registryFleet.map(reg => {
    const cleanReg = reg.registration.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const live = activeFlights.find(f => 
      (f.icao24 && f.icao24.toLowerCase() === reg.icao24.toLowerCase()) ||
      (f.callsign && f.callsign.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanReg)
    );

    if (live) {
      airborneCount++;
      totalAlt += (live.altitude || 0);
      totalSpeed += (live.velocity || 0);
      const age = Math.max(0, nowSec - (live.observationTimestamp || live.lastSeen || nowSec));
      return {
        ...reg,
        status: 'AIRBORNE',
        live: {
          lat: live.lat,
          lon: live.lon,
          altitude: live.altitude,
          velocity: live.velocity,
          heading: live.heading,
          verticalRate: live.verticalRate,
          observationTimestamp: live.observationTimestamp || live.lastSeen,
          fetchTimestamp: live.fetchTimestamp,
          provider: live.providerName || live.source,
          providerType: live.providerType || 'WEB_FEED_FALLBACK',
          positionType: live.positionType || 'RECEIVED',
          isInterpolated: false,
          freshness: age > 60 ? 'STALE' : (age > 25 ? 'AGING' : 'FRESH'),
          ageSeconds: age,
          verificationStatus: live.verificationStatus,
          lastSeen: live.lastSeen,
          trail: live.trail || []
        }
      };
    } else {
      return {
        ...reg,
        status: 'GROUND',
        live: null
      };
    }
  });

  const regionalAirborne = activeFlights.filter(f => 
    f.lat >= bounds.minLat && f.lat <= bounds.maxLat &&
    f.lon >= bounds.minLon && f.lon <= bounds.maxLon
  );

  res.json({
    success: true,
    feature: 'NORTH MAHARASHTRA AVIATION',
    sectorName: bounds.name,
    keyAirports: bounds.airports,
    bounds: {
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLon: bounds.minLon,
      maxLon: bounds.maxLon
    },
    timestamp: new Date().toISOString(),
    stats: {
      totalRegistered: registryFleet.length,
      airborneCount,
      groundCount: registryFleet.length - airborneCount,
      regionalAirborneTotal: regionalAirborne.length,
      avgAltitude: airborneCount > 0 ? Math.round(totalAlt / airborneCount) : 0,
      avgSpeed: airborneCount > 0 ? Math.round(totalSpeed / airborneCount) : 0,
    },
    fleet
  });
});

app.get('/api/flights', async (req, res) => {
  const flights = await getLiveFlights();
  res.json({
    success: true,
    count: flights.length,
    timestamp: CACHE.flights.timestamp,
    flights
  });
});

// Legacy NMIMS endpoint alias - returns truthful data with verified Skynex Aero attribution
app.get('/api/nmims/fleet', async (req, res) => {
  const registryFleet = getNorthMaharashtraTrainingFleet();
  const activeFlights = Array.from(FLIGHT_STORE.values());
  const nowSec = Math.floor(Date.now() / 1000);
  
  let airborneCount = 0;
  let totalAlt = 0;
  let totalSpeed = 0;

  const fleet = registryFleet.map(reg => {
    const cleanReg = reg.registration.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const live = activeFlights.find(f => 
      (f.icao24 && f.icao24.toLowerCase() === reg.icao24.toLowerCase()) ||
      (f.callsign && f.callsign.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanReg)
    );

    if (live) {
      airborneCount++;
      totalAlt += (live.altitude || 0);
      totalSpeed += (live.velocity || 0);
      const age = Math.max(0, nowSec - (live.observationTimestamp || live.lastSeen || nowSec));
      return {
        ...reg,
        status: 'AIRBORNE',
        live: {
          lat: live.lat,
          lon: live.lon,
          altitude: live.altitude,
          velocity: live.velocity,
          heading: live.heading,
          verticalRate: live.verticalRate,
          observationTimestamp: live.observationTimestamp || live.lastSeen,
          fetchTimestamp: live.fetchTimestamp,
          provider: live.providerName || live.source,
          providerType: live.providerType || 'WEB_FEED_FALLBACK',
          positionType: live.positionType || 'RECEIVED',
          isInterpolated: false,
          freshness: age > 60 ? 'STALE' : (age > 25 ? 'AGING' : 'FRESH'),
          ageSeconds: age,
          verificationStatus: live.verificationStatus,
          lastSeen: live.lastSeen,
          trail: live.trail || []
        }
      };
    } else {
      return {
        ...reg,
        status: 'GROUND',
        live: null
      };
    }
  });

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    disclosure: "Truthful Registry: These Piper aircraft are operated by Skynex Aero for flight training in North Maharashtra (Shirpur/Jalgaon corridor). They are not NMIMS-owned.",
    stats: {
      totalRegistered: registryFleet.length,
      airborneCount,
      groundCount: registryFleet.length - airborneCount,
      avgAltitude: airborneCount > 0 ? Math.round(totalAlt / airborneCount) : 0,
      avgSpeed: airborneCount > 0 ? Math.round(totalSpeed / airborneCount) : 0,
    },
    fleet
  });
});

app.get('/api/earthquakes', async (req, res) => {
  const feed = req.query.feed || 'all_day';
  const quakes = await fetchUSGSEarthquakes(feed);
  res.json({
    success: true,
    count: quakes.length,
    timestamp: CACHE.earthquakes.timestamp,
    earthquakes: quakes
  });
});

app.get('/api/disasters', async (req, res) => {
  const force = req.query.refresh === 'true';
  const data = await aggregateDisasters(force);
  res.json({
    success: true,
    count: data.events.length,
    counts: data.counts,
    providers: data.providers,
    timestamp: data.timestamp,
    disasters: data.events
  });
});

app.get('/api/disasters/diagnostics', async (req, res) => {
  const data = await aggregateDisasters();
  res.json({
    success: true,
    timestamp: data.timestamp,
    latencyMs: data.latencyMs,
    counts: data.counts,
    providers: data.providers
  });
});

app.get('/api/satellites', async (req, res) => {
  await refreshSatelliteTLEs();
  const sats = computeSatellitePositions();
  res.json({
    success: true,
    count: sats.length,
    timestamp: new Date().toISOString(),
    satellites: sats
  });
});

app.get('/api/weather', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'Valid lat and lon required' });
  const weather = await fetchWeatherAtPoint(lat, lon);
  if (!weather) return res.status(502).json({ error: 'Weather lookup failed' });
  res.json({ success: true, weather });
});

// Pre-seed
refreshSatelliteTLEs();
fetchUSGSEarthquakes();
aggregateDisasters();
getLiveFlights();

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  GEOSCOPE GATEWAY (AERIS MULTI-PROVIDER ENGINE)    `);
  console.log(`  PORT: http://localhost:${PORT}                    `);
  console.log(`====================================================`);
});
