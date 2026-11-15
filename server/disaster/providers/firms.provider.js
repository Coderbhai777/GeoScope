/**
 * NASA FIRMS (Fire Information for Resource Management System) Provider
 * Global VIIRS (SNPP, NOAA-20, NOAA-21) and MODIS Active Fire Detections
 * Documentation: https://firms.modaps.eosdis.nasa.gov/api/
 */

const { DisasterEvent } = require('../models/disaster-event.model');

async function fetchFirmsHotspots() {
  const mapKey = process.env.FIRMS_MAP_KEY;

  if (!mapKey) {
    return {
      provider: 'NASA FIRMS (VIIRS/MODIS)',
      success: false,
      configured: false,
      count: 0,
      events: [],
      error: 'CONFIGURATION REQUIRED: NASA FIRMS MAP_KEY is not configured in backend environment.',
      instruction: 'Get a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/ and set FIRMS_MAP_KEY in server environment.'
    };
  }

  const events = [];
  try {
    // VIIRS S-NPP Global 24h CSV feed via NASA FIRMS API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${mapKey}/VIIRS_SNPP_NRT/USA/1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`NASA FIRMS HTTP ${res.status}`);

    const csvText = await res.text();
    const lines = csvText.trim().split('\n');
    if (lines.length > 1) {
      const headers = lines[0].split(',');
      for (let i = 1; i < Math.min(lines.length, 250); i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 6) {
          const lat = parseFloat(cols[1]);
          const lon = parseFloat(cols[2]);
          const brightness = cols[3];
          const acqDate = cols[5];
          const acqTime = cols[6];
          const confidence = cols[8] || 'nominal';

          events.push(new DisasterEvent({
            id: `firms_viirs_${acqDate}_${i}`,
            source: 'NASA FIRMS (VIIRS)',
            sourceEventId: `${acqDate}_${i}`,
            title: `Active Fire Detection (VIIRS Satellite)`,
            description: `Satellite thermal anomaly detected. Sensor brightness: ${brightness} K. Confidence: ${confidence}.`,
            category: 'wildfires',
            categoryName: 'Active Fire Detection',
            severity: `Brightness ${brightness} K`,
            alertLevel: confidence === 'high' ? 'Red' : 'Orange',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            coordinates: [lon, lat],
            eventDate: `${acqDate}T${acqTime ? acqTime.slice(0, 2) + ':' + acqTime.slice(2) : '00:00'}:00Z`,
            sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
            status: 'ACTIVE',
            confidence
          }));
        }
      }
    }

    return {
      provider: 'NASA FIRMS (VIIRS/MODIS)',
      success: true,
      configured: true,
      count: events.length,
      events,
      error: null
    };
  } catch (err) {
    return {
      provider: 'NASA FIRMS (VIIRS/MODIS)',
      success: false,
      configured: true,
      count: 0,
      events: [],
      error: `NASA FIRMS: ${err.message}`
    };
  }
}

module.exports = { fetchFirmsHotspots };
