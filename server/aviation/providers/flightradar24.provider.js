/**
 * Flightradar24 Web Feed Ingestion (Fallback Provider)
 * Transparently identified as an undocumented web feed fallback.
 * Strictly preserves raw observations, source timestamps, and flags data as single-source unverified.
 */

const { PROVIDER_IDS, PROVIDER_TYPES, VERIFICATION_STATUSES } = require('./provider-types');

const FR24_GLOBAL_ZONES = [
  { name: 'India / South Asia', bounds: '38.0,6.0,68.0,98.0' },
  { name: 'Middle East & Gulf', bounds: '45.0,10.0,40.0,75.0' },
  { name: 'Europe & Mediterranean', bounds: '72.0,34.0,-15.0,40.0' },
  { name: 'East & SE Asia', bounds: '55.0,0.0,95.0,145.0' },
  { name: 'North America East', bounds: '55.0,24.0,-90.0,-65.0' },
  { name: 'North America West', bounds: '55.0,24.0,-130.0,-90.0' },
  { name: 'Global High Altitude Feed', bounds: null }
];

let providerStatus = {
  id: PROVIDER_IDS.FR24,
  name: 'Flightradar24 Web Feed (Fallback)',
  type: PROVIDER_TYPES.WEB_FEED_FALLBACK,
  status: 'INITIALIZING',
  latencyMs: 0,
  lastAttempt: null,
  lastSuccess: null,
  lastCount: 0,
  error: null,
  disclosure: 'Undocumented web feed fallback. Not an independent direct ADS-B receiver.'
};

async function fetchFR24Zone(bounds) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const url = bounds 
    ? `https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=${bounds}`
    : 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`FR24 HTTP ${res.status}`);

    const json = await res.json();
    const list = [];
    const fetchTs = Date.now();

    for (const key of Object.keys(json)) {
      if (key === 'full_count' || key === 'version' || key === 'stats') continue;
      const f = json[key];
      if (Array.isArray(f) && f.length >= 14) {
        const lat = f[1];
        const lon = f[2];
        const heading = f[3] || 0;
        const altFt = f[4] || 0;
        const speedKts = f[5] || 0;
        const callsign = (f[13] || f[16] || f[9] || f[0] || 'UNKNOWN').toString().trim();
        const origin = f[11] || '';
        const dest = f[12] || '';
        const model = f[8] || 'Commercial Aircraft';
        const sourceTimestamp = f[10] || Math.floor(fetchTs / 1000);

        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
          list.push({
            icao24: (f[0] || key).toString().toLowerCase(),
            callsign: callsign || 'AIRLINE',
            country: origin && dest ? `${origin} → ${dest}` : 'Worldwide Airspace',
            lon: parseFloat(lon),
            lat: parseFloat(lat),
            altitude: Math.round(altFt * 0.3048), // meters
            velocity: Math.round(speedKts * 1.852), // km/h
            heading: parseFloat(heading),
            verticalRate: f[15] || 0,
            squawk: f[6] || null,
            model,
            origin,
            dest,
            source: 'Flightradar24 Web Feed (Fallback)',
            providerId: PROVIDER_IDS.FR24,
            providerName: 'Flightradar24 Web Feed (Fallback)',
            providerType: PROVIDER_TYPES.WEB_FEED_FALLBACK,
            observationTimestamp: sourceTimestamp,
            fetchTimestamp: fetchTs,
            positionType: 'RECEIVED',
            isInterpolated: false,
            lastSeen: sourceTimestamp,
            verificationStatus: VERIFICATION_STATUSES.SINGLE_SOURCE_UNVERIFIED,
            rawObservation: {
              rawKey: key,
              rawLat: lat,
              rawLon: lon,
              rawAltFt: altFt,
              rawSpeedKts: speedKts,
              rawHeading: heading,
              rawLastSeen: f[10]
            }
          });
        }
      }
    }
    return list;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchFlightradar24Data() {
  const start = Date.now();
  providerStatus.lastAttempt = new Date().toISOString();

  try {
    const promises = FR24_GLOBAL_ZONES.map(z => fetchFR24Zone(z.bounds).catch(() => []));
    const results = await Promise.all(promises);

    const merged = [];
    const seenHexes = new Set();

    for (const batch of results) {
      for (const flight of batch) {
        if (!seenHexes.has(flight.icao24)) {
          seenHexes.add(flight.icao24);
          merged.push(flight);
        }
      }
    }

    const duration = Date.now() - start;
    providerStatus.status = 'ONLINE';
    providerStatus.latencyMs = duration;
    providerStatus.lastSuccess = new Date().toISOString();
    providerStatus.lastCount = merged.length;
    providerStatus.error = null;

    return merged;
  } catch (err) {
    providerStatus.status = 'DEGRADED';
    providerStatus.latencyMs = Date.now() - start;
    providerStatus.error = err.message;
    return [];
  }
}

function getFlightradar24Status() {
  return { ...providerStatus };
}

module.exports = {
  fetchFlightradar24Data,
  getFlightradar24Status
};
