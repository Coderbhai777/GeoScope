/**
 * Official Tsunami Warning Provider
 * Ingests live alerts from NOAA National Tsunami Warning Center (tsunami.gov)
 * and USGS Seismically Triggered Tsunami Bulletins.
 */

const { DisasterEvent } = require('../models/disaster-event.model');

async function fetchTsunamiAlerts() {
  const events = [];
  let error = null;

  // 1. NOAA NWS Tsunami Active Alerts (US & International Basins)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://api.weather.gov/alerts/active?event=Tsunami%20Warning,Tsunami%20Advisory,Tsunami%20Watch', {
      headers: {
        'Accept': 'application/geo+json',
        'User-Agent': 'GeoScope-TsunamiMonitor/2.0 (contact@geoscope.app)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        for (const f of data.features) {
          const p = f.properties || {};
          const geom = f.geometry;
          let coords = [0, 0];

          if (geom && geom.coordinates) {
            if (geom.type === 'Point') {
              coords = geom.coordinates;
            } else if (geom.type === 'Polygon' && geom.coordinates[0]?.length > 0) {
              const ring = geom.coordinates[0];
              coords = [
                ring.reduce((s, c) => s + c[0], 0) / ring.length,
                ring.reduce((s, c) => s + c[1], 0) / ring.length
              ];
            }
          }

          events.push(new DisasterEvent({
            id: `tsunami_noaa_${p.id || Date.now()}`,
            source: 'NOAA NTWC / Tsunami.gov',
            sourceEventId: p.id,
            title: p.headline || p.event || 'Official Tsunami Advisory',
            description: p.description || p.instruction || 'Official Tsunami bulletin from NOAA National Weather Service.',
            category: 'tsunamis',
            categoryName: 'Tsunami Warning',
            severity: p.severity || 'Extreme',
            alertLevel: p.event?.toLowerCase().includes('warning') ? 'Red' : 'Orange',
            geometry: geom,
            coordinates: coords,
            eventDate: p.onset || p.effective || new Date().toISOString(),
            lastUpdated: p.sent || new Date().toISOString(),
            sourceUrl: 'https://www.tsunami.gov/',
            status: 'WARNING',
            country: p.areaDesc || 'Coastal Region',
            details: {
              certainty: p.certainty,
              urgency: p.urgency,
              response: p.response
            }
          }));
        }
      }
    }
  } catch (err) {
    error = `NOAA Tsunami: ${err.message}`;
  }

  // 2. Cross-reference USGS Real-time feed for any earthquake with active tsunami flag (properties.tsunami == 1)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        for (const f of data.features) {
          const p = f.properties || {};
          if (p.tsunami === 1) {
            const coords = f.geometry?.coordinates || [0, 0];
            events.push(new DisasterEvent({
              id: `tsunami_usgs_${f.id}`,
              source: 'USGS / NOAA PTWC',
              sourceEventId: f.id,
              title: `Tsunami Watch: M ${p.mag} - ${p.place}`,
              description: `Seismic event generated oceanic tsunami evaluation. Magnitude: M ${p.mag}, Depth: ${coords[2]} km.`,
              category: 'tsunamis',
              categoryName: 'Tsunami Evaluation',
              severity: `M ${p.mag} Seismic Displacement`,
              alertLevel: 'Red',
              geometry: f.geometry,
              coordinates: [coords[0], coords[1]],
              eventDate: new Date(p.time).toISOString(),
              lastUpdated: new Date(p.updated || p.time).toISOString(),
              sourceUrl: p.url || 'https://www.tsunami.gov/',
              status: 'WARNING',
              country: p.place || 'Oceanic Basin',
              details: {
                mag: p.mag,
                depthKm: coords[2],
                tsunamiFlag: p.tsunami
              }
            }));
          }
        }
      }
    }
  } catch (err) {
    if (!error) error = `USGS Tsunami Evaluation: ${err.message}`;
  }

  return {
    provider: 'NOAA NTWC / Tsunami.gov',
    success: true,
    count: events.length,
    events,
    error,
    statusNote: events.length === 0 ? 'No current active tsunami warnings issued worldwide' : `${events.length} active tsunami bulletins`
  };
}

module.exports = { fetchTsunamiAlerts };
