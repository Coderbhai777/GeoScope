/**
 * Authorized OpenSky Network Provider Integration
 * Implements genuine OpenSky Network REST API states/all client.
 * Respects OpenSky API rate limits and supports HTTP Basic Authentication credentials.
 */

const { PROVIDER_IDS, PROVIDER_TYPES, VERIFICATION_STATUSES } = require('./provider-types');

const OPENSKY_USERNAME = process.env.OPENSKY_USERNAME || '';
const OPENSKY_PASSWORD = process.env.OPENSKY_PASSWORD || '';

// Indian Subcontinent Bounding Box (South, North, West, East)
const OPENSKY_BOUNDS = {
  lamin: 6.0,
  lamax: 38.0,
  lomin: 68.0,
  lomax: 98.0
};

// Rate limiter: Anonymous = 10s cooldown; Authenticated = 5s cooldown
const MIN_INTERVAL_MS = OPENSKY_USERNAME ? 5000 : 12000;
let lastFetchTime = 0;

let providerStatus = {
  id: PROVIDER_IDS.OPENSKY,
  name: 'OpenSky Network (Authorized Integration)',
  type: PROVIDER_TYPES.AUTHORIZED_REST_API,
  status: OPENSKY_USERNAME ? 'AUTHENTICATED_READY' : 'ANONYMOUS_STANDBY',
  latencyMs: 0,
  lastAttempt: null,
  lastSuccess: null,
  lastCount: 0,
  authenticated: !!OPENSKY_USERNAME,
  error: null,
  disclosure: 'OpenSky Network academic ADS-B sensor network. Authorized REST API states query.'
};

async function fetchOpenSkyData() {
  const now = Date.now();
  if (now - lastFetchTime < MIN_INTERVAL_MS) {
    return []; // Respect OpenSky rate limit window
  }

  lastFetchTime = now;
  providerStatus.lastAttempt = new Date().toISOString();
  const start = now;

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${OPENSKY_BOUNDS.lamin}&lamax=${OPENSKY_BOUNDS.lamax}&lomin=${OPENSKY_BOUNDS.lomin}&lomax=${OPENSKY_BOUNDS.lomax}`;
    
    const headers = {
      'User-Agent': 'GeoScope-Intelligence/2.0 (+https://github.com/geoscope)',
      'Accept': 'application/json'
    };

    if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
      const authStr = Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${authStr}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 429) {
      providerStatus.status = 'RATE_LIMITED_429';
      providerStatus.error = 'OpenSky HTTP 429: Daily query quota exceeded or rate limit reached.';
      return [];
    }

    if (!res.ok) {
      throw new Error(`OpenSky HTTP ${res.status}`);
    }

    const json = await res.json();
    const fetchTs = Date.now();
    const list = [];

    if (json.states && Array.isArray(json.states)) {
      for (const s of json.states) {
        // OpenSky State Vector Indices:
        // 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact,
        // 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity,
        // 10: true_track, 11: vertical_rate, 12: sensors, 13: geo_altitude, 14: squawk
        const hex = (s[0] || '').toLowerCase().trim();
        const callsign = (s[1] || '').trim();
        const lon = s[5];
        const lat = s[6];
        const obsTs = s[3] || s[4] || Math.floor(fetchTs / 1000);

        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
          list.push({
            icao24: hex,
            callsign: callsign || hex.toUpperCase(),
            country: s[2] || 'International Airspace',
            lon: parseFloat(lon),
            lat: parseFloat(lat),
            altitude: s[7] !== null ? Math.round(s[7]) : 1000, // already in meters
            velocity: s[9] !== null ? Math.round(s[9] * 3.6) : 0, // m/s to km/h
            heading: s[10] !== null ? parseFloat(s[10]) : 0,
            verticalRate: s[11] !== null ? Math.round(s[11] * 196.85) : 0, // m/s to fpm
            squawk: s[14] || null,
            model: 'Commercial Aircraft',
            origin: '',
            dest: '',
            source: 'OpenSky Network (Authorized)',
            providerId: PROVIDER_IDS.OPENSKY,
            providerName: 'OpenSky Network (Authorized)',
            providerType: PROVIDER_TYPES.AUTHORIZED_REST_API,
            observationTimestamp: obsTs,
            fetchTimestamp: fetchTs,
            positionType: 'RECEIVED',
            isInterpolated: false,
            lastSeen: obsTs,
            verificationStatus: VERIFICATION_STATUSES.SINGLE_SOURCE_UNVERIFIED,
            rawObservation: {
              icao24: s[0],
              callsign: s[1],
              origin_country: s[2],
              time_position: s[3],
              last_contact: s[4],
              longitude: s[5],
              latitude: s[6],
              baro_altitude: s[7],
              on_ground: s[8],
              velocity: s[9],
              true_track: s[10],
              vertical_rate: s[11],
              squawk: s[14]
            }
          });
        }
      }
    }

    const duration = Date.now() - start;
    providerStatus.status = 'ONLINE';
    providerStatus.latencyMs = duration;
    providerStatus.lastSuccess = new Date().toISOString();
    providerStatus.lastCount = list.length;
    providerStatus.error = null;

    return list;
  } catch (err) {
    providerStatus.status = 'DEGRADED';
    providerStatus.latencyMs = Date.now() - start;
    providerStatus.error = err.message;
    return [];
  }
}

function getOpenSkyStatus() {
  return { ...providerStatus };
}

module.exports = {
  fetchOpenSkyData,
  getOpenSkyStatus
};
