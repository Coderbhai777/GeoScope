/**
 * GeoScope Natural Disaster Aggregator Service
 * Orchestrates multi-provider disaster feeds, handles deduplication, caching,
 * provider health telemetry, and category breakdowns.
 */

const { fetchEonetEvents } = require('../providers/eonet.provider');
const { fetchGdacsEvents } = require('../providers/gdacs.provider');
const { fetchTsunamiAlerts } = require('../providers/tsunami.provider');
const { fetchFirmsHotspots } = require('../providers/firms.provider');

// Cache configuration: 4 minutes TTL
const DISASTER_CACHE = {
  data: null,
  timestamp: 0,
  ttl: 240000 // 4 minutes
};

const PROVIDER_STATUS = new Map();

async function aggregateDisasters(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && DISASTER_CACHE.data && (now - DISASTER_CACHE.timestamp) < DISASTER_CACHE.ttl) {
    return DISASTER_CACHE.data;
  }

  const startTime = Date.now();
  console.log('[Disaster Aggregator] Syncing live natural disaster feeds from NASA EONET, GDACS, NOAA, FIRMS...');

  // Query all disaster providers concurrently
  const [eonetRes, gdacsRes, tsunamiRes, firmsRes] = await Promise.allSettled([
    fetchEonetEvents(),
    fetchGdacsEvents(),
    fetchTsunamiAlerts(),
    fetchFirmsHotspots()
  ]);

  const masterEvents = new Map();
  const providerReports = [];

  // 1. Process NASA EONET
  if (eonetRes.status === 'fulfilled' && eonetRes.value) {
    const val = eonetRes.value;
    for (const ev of val.events) {
      masterEvents.set(ev.id, ev);
    }
    providerReports.push({
      id: 'eonet',
      name: 'NASA EONET',
      status: val.success ? 'ONLINE' : 'DEGRADED',
      eventsReceived: val.count,
      lastSync: new Date().toISOString(),
      error: val.errors ? val.errors.join('; ') : null
    });
  } else {
    providerReports.push({
      id: 'eonet',
      name: 'NASA EONET',
      status: 'OFFLINE',
      eventsReceived: 0,
      lastSync: null,
      error: eonetRes.reason?.message || 'Network timeout'
    });
  }

  // 2. Process GDACS (UN / EC)
  if (gdacsRes.status === 'fulfilled' && gdacsRes.value) {
    const val = gdacsRes.value;
    for (const ev of val.events) {
      masterEvents.set(ev.id, ev);
    }
    providerReports.push({
      id: 'gdacs',
      name: 'GDACS (UN/EC)',
      status: val.success ? 'ONLINE' : 'DEGRADED',
      eventsReceived: val.count,
      lastSync: new Date().toISOString(),
      error: val.error
    });
  } else {
    providerReports.push({
      id: 'gdacs',
      name: 'GDACS (UN/EC)',
      status: 'OFFLINE',
      eventsReceived: 0,
      lastSync: null,
      error: gdacsRes.reason?.message || 'Network timeout'
    });
  }

  // 3. Process Tsunami Alerts
  if (tsunamiRes.status === 'fulfilled' && tsunamiRes.value) {
    const val = tsunamiRes.value;
    for (const ev of val.events) {
      masterEvents.set(ev.id, ev);
    }
    providerReports.push({
      id: 'tsunami',
      name: 'NOAA NTWC / Tsunami.gov',
      status: val.success ? 'ONLINE' : 'DEGRADED',
      eventsReceived: val.count,
      lastSync: new Date().toISOString(),
      error: val.error,
      note: val.statusNote
    });
  } else {
    providerReports.push({
      id: 'tsunami',
      name: 'NOAA NTWC / Tsunami.gov',
      status: 'OFFLINE',
      eventsReceived: 0,
      lastSync: null,
      error: tsunamiRes.reason?.message || 'Network timeout'
    });
  }

  // 4. Process NASA FIRMS
  if (firmsRes.status === 'fulfilled' && firmsRes.value) {
    const val = firmsRes.value;
    for (const ev of val.events) {
      masterEvents.set(ev.id, ev);
    }
    providerReports.push({
      id: 'firms',
      name: 'NASA FIRMS (Satellite VIIRS/MODIS)',
      status: val.configured ? (val.success ? 'ONLINE' : 'DEGRADED') : 'NOT_CONFIGURED',
      eventsReceived: val.count,
      lastSync: val.configured ? new Date().toISOString() : null,
      error: val.error,
      instruction: val.instruction || null
    });
  }

  const allEvents = Array.from(masterEvents.values());

  // Calculate detailed category breakdown
  const counts = {
    total: allEvents.length,
    cyclones: 0,
    wildfires: 0,
    floods: 0,
    volcanoes: 0,
    earthquakes: 0,
    tsunamis: 0,
    droughts: 0,
    severeStorms: 0,
    other: 0,
    redAlerts: 0,
    orangeAlerts: 0
  };

  for (const ev of allEvents) {
    if (counts[ev.category] !== undefined) {
      counts[ev.category]++;
    } else {
      counts.other++;
    }

    if (ev.alertLevel === 'Red') counts.redAlerts++;
    if (ev.alertLevel === 'Orange') counts.orangeAlerts++;
  }

  const payload = {
    success: true,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    counts,
    providers: providerReports,
    events: allEvents
  };

  DISASTER_CACHE.data = payload;
  DISASTER_CACHE.timestamp = now;

  console.log(`[Disaster Aggregator] Successfully aggregated ${allEvents.length} genuine disasters across the globe (Cyclones: ${counts.cyclones}, Floods: ${counts.floods}, Volcanoes: ${counts.volcanoes}, Wildfires: ${counts.wildfires}, Droughts: ${counts.droughts})`);

  return payload;
}

module.exports = { aggregateDisasters };
