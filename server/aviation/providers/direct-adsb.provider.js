/**
 * Authorized Direct SDR ADS-B Receiver Integration Architecture
 * Connects directly to dedicated local or regional SDR receivers (readsb, dump1090, tar1090, or ADSBHub).
 * Provides authentic, un-scraped, independent direct ADS-B decoding.
 */

const { PROVIDER_IDS, PROVIDER_TYPES, VERIFICATION_STATUSES } = require('./provider-types');

const DIRECT_FEED_URL = process.env.DIRECT_ADSB_FEED_URL || null;

let providerStatus = {
  id: PROVIDER_IDS.DIRECT_SDR,
  name: 'Independent SDR ADS-B Receiver (Authorized)',
  type: PROVIDER_TYPES.AUTHORIZED_DIRECT_SDR,
  status: DIRECT_FEED_URL ? 'CONFIGURED' : 'STANDBY_UNCONFIGURED',
  endpoint: DIRECT_FEED_URL || 'http://localhost:8080/data/aircraft.json (configurable via DIRECT_ADSB_FEED_URL)',
  latencyMs: 0,
  lastAttempt: null,
  lastSuccess: null,
  lastCount: 0,
  error: null,
  disclosure: 'Authorized direct RTL-SDR / readsb / dump1090 1090MHz Mode-S ADS-B receiver feed.'
};

async function fetchDirectSdrData() {
  if (!DIRECT_FEED_URL) {
    return [];
  }

  const start = Date.now();
  providerStatus.lastAttempt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(DIRECT_FEED_URL, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Direct SDR HTTP ${res.status}`);
    const json = await res.json();
    const fetchTs = Date.now();
    const list = [];

    const aircraftList = json.aircraft || json.ac || [];
    for (const ac of aircraftList) {
      if (ac.lat !== undefined && ac.lon !== undefined && ac.hex) {
        const hex = ac.hex.toLowerCase();
        const obsTs = ac.seen_pos ? Math.floor(fetchTs / 1000 - ac.seen_pos) : Math.floor(fetchTs / 1000);
        list.push({
          icao24: hex,
          callsign: (ac.flight || ac.r || hex).trim(),
          country: 'Direct SDR Reception',
          lon: parseFloat(ac.lon),
          lat: parseFloat(ac.lat),
          altitude: typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro * 0.3048) : 1000,
          velocity: typeof ac.gs === 'number' ? Math.round(ac.gs * 1.852) : 0,
          heading: ac.track !== undefined ? ac.track : (ac.nav_heading || 0),
          verticalRate: ac.baro_rate || 0,
          squawk: ac.squawk || null,
          model: ac.t || ac.desc || 'General Aviation',
          origin: '',
          dest: '',
          source: 'Independent SDR ADS-B Receiver',
          providerId: PROVIDER_IDS.DIRECT_SDR,
          providerName: 'Independent SDR ADS-B Receiver',
          providerType: PROVIDER_TYPES.AUTHORIZED_DIRECT_SDR,
          observationTimestamp: obsTs,
          fetchTimestamp: fetchTs,
          positionType: 'RECEIVED',
          isInterpolated: false,
          lastSeen: obsTs,
          verificationStatus: VERIFICATION_STATUSES.INDEPENDENT_SDR_VERIFIED,
          rawObservation: ac
        });
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
    providerStatus.status = 'OFFLINE';
    providerStatus.latencyMs = Date.now() - start;
    providerStatus.error = err.message;
    return [];
  }
}

function getDirectSdrStatus() {
  return { ...providerStatus };
}

module.exports = {
  fetchDirectSdrData,
  getDirectSdrStatus
};
