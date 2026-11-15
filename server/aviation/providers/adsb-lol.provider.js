/**
 * adsb.lol Community ADS-B Provider
 * Transparently manages community ADS-B ingestion with rate-limit (HTTP 429) circuit breaker.
 */

const { PROVIDER_IDS, PROVIDER_TYPES, VERIFICATION_STATUSES } = require('./provider-types');

const AERIS_HUBS = [
  { name: 'Central India (Nagpur/Wardha)', lat: 21.0, lon: 78.5, radius: 250 },
  { name: 'North India (Delhi/NCR)', lat: 28.6, lon: 77.1, radius: 250 },
  { name: 'West India (Mumbai/Maharashtra)', lat: 19.1, lon: 72.8, radius: 250 },
  { name: 'North Maharashtra (Shirpur/Jalgaon)', lat: 21.3, lon: 75.1, radius: 150 }
];

let providerStatus = {
  id: PROVIDER_IDS.ADSB_LOL,
  name: 'adsb.lol ADS-B Feed',
  type: PROVIDER_TYPES.COMMUNITY_ADSB,
  status: 'STANDBY',
  latencyMs: 0,
  lastAttempt: null,
  lastSuccess: null,
  lastCount: 0,
  rateLimitHits: 0,
  cooldownUntil: 0,
  error: null,
  disclosure: 'Community-contributed ADS-B receiver network. Subject to public API rate limiting (HTTP 429).'
};

async function fetchAdsbLol() {
  const now = Date.now();
  if (now < providerStatus.cooldownUntil) {
    const remainingSec = Math.ceil((providerStatus.cooldownUntil - now) / 1000);
    providerStatus.status = 'RATE_LIMITED_429';
    providerStatus.error = `Rate limit active (HTTP 429). Cooldown: ${remainingSec}s remaining.`;
    return [];
  }

  const start = now;
  providerStatus.lastAttempt = new Date().toISOString();
  const list = [];
  const fetchTs = Date.now();
  let rateLimited = false;

  try {
    const results = await Promise.allSettled(
      AERIS_HUBS.map(async (hub) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        try {
          const res = await fetch(`https://api.adsb.lol/v2/point/${hub.lat}/${hub.lon}/${hub.radius}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (res.status === 429) {
            rateLimited = true;
            return [];
          }
          if (!res.ok) return [];

          const json = await res.json();
          const hubList = [];
          if (json.ac && Array.isArray(json.ac)) {
            for (const ac of json.ac) {
              if (ac.lat !== undefined && ac.lon !== undefined && ac.hex) {
                const hex = ac.hex.toLowerCase();
                const obsTs = ac.seen_pos ? Math.floor(fetchTs / 1000 - ac.seen_pos) : Math.floor(fetchTs / 1000);
                hubList.push({
                  icao24: hex,
                  callsign: (ac.flight || ac.r || hex).trim(),
                  country: ac.r ? `Reg: ${ac.r}` : 'Active Airspace',
                  lon: parseFloat(ac.lon),
                  lat: parseFloat(ac.lat),
                  altitude: typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro * 0.3048) : 1000,
                  velocity: typeof ac.gs === 'number' ? Math.round(ac.gs * 1.852) : 0,
                  heading: ac.track !== undefined ? ac.track : (ac.nav_heading || 0),
                  verticalRate: ac.baro_rate || 0,
                  squawk: ac.squawk || null,
                  model: ac.t || ac.desc || 'Commercial Aircraft',
                  origin: '',
                  dest: '',
                  source: 'adsb.lol ADS-B Feed',
                  providerId: PROVIDER_IDS.ADSB_LOL,
                  providerName: 'adsb.lol ADS-B Feed',
                  providerType: PROVIDER_TYPES.COMMUNITY_ADSB,
                  observationTimestamp: obsTs,
                  fetchTimestamp: fetchTs,
                  positionType: 'RECEIVED',
                  isInterpolated: false,
                  lastSeen: obsTs,
                  verificationStatus: VERIFICATION_STATUSES.SINGLE_SOURCE_UNVERIFIED,
                  rawObservation: {
                    hex: ac.hex,
                    flight: ac.flight,
                    r: ac.r,
                    t: ac.t,
                    alt_baro: ac.alt_baro,
                    gs: ac.gs,
                    track: ac.track,
                    seen: ac.seen
                  }
                });
              }
            }
          }
          return hubList;
        } catch (e) {
          clearTimeout(timeout);
          return [];
        }
      })
    );

    if (rateLimited) {
      providerStatus.rateLimitHits++;
      // Exponential backoff: 30s, 60s, up to 120s
      const backoffMs = Math.min(30000 * Math.pow(1.5, Math.min(providerStatus.rateLimitHits, 3)), 120000);
      providerStatus.cooldownUntil = Date.now() + backoffMs;
      providerStatus.status = 'RATE_LIMITED_429';
      providerStatus.error = `HTTP 429 Too Many Requests. Cooling down for ${Math.round(backoffMs / 1000)}s.`;
      return [];
    }

    const seenHexes = new Set();
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const item of r.value) {
          if (!seenHexes.has(item.icao24)) {
            seenHexes.add(item.icao24);
            list.push(item);
          }
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

function getAdsbLolStatus() {
  return { ...providerStatus };
}

module.exports = {
  fetchAdsbLol,
  getAdsbLolStatus
};
