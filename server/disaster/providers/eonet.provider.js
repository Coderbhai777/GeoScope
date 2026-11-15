/**
 * NASA Earth Observatory Natural Event Tracker (EONET) Provider
 * Documentation: https://eonet.gsfc.nasa.gov/docs/v3
 * Ingests open natural hazards across wildfires, severe storms, volcanoes, sea/lake ice, etc.
 */

const { DisasterEvent } = require('../models/disaster-event.model');

function mapEonetCategory(catId) {
  switch (catId) {
    case 'wildfires':
      return { category: 'wildfires', categoryName: 'Active Wildfire' };
    case 'severeStorms':
      return { category: 'severeStorms', categoryName: 'Severe Storm' };
    case 'volcanoes':
      return { category: 'volcanoes', categoryName: 'Volcanic Activity' };
    case 'floods':
      return { category: 'floods', categoryName: 'Flood Event' };
    case 'drought':
      return { category: 'droughts', categoryName: 'Drought' };
    case 'seaLakeIce':
      return { category: 'other', categoryName: 'Sea & Lake Ice' };
    case 'landslides':
      return { category: 'other', categoryName: 'Landslide' };
    default:
      return { category: 'severeStorms', categoryName: 'Atmospheric Event' };
  }
}

async function fetchEonetEvents() {
  const events = [];
  const errors = [];

  // 1. Fetch main active GeoJSON feed (past 60 days of open events)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=60', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GeoScope-DisasterMonitor/2.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        for (const f of data.features) {
          const props = f.properties || {};
          const geom = f.geometry;
          if (!geom || !geom.coordinates) continue;

          // Extract coordinates [lon, lat]
          let lon = 0;
          let lat = 0;
          if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            lon = geom.coordinates[0];
            lat = geom.coordinates[1];
          } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
            // Storm track: use latest position
            const latest = geom.coordinates[geom.coordinates.length - 1];
            lon = latest[0];
            lat = latest[1];
          } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]?.length > 0) {
            // Centroid of polygon ring
            const ring = geom.coordinates[0];
            lon = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
            lat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
          } else {
            continue;
          }

          if (isNaN(lon) || isNaN(lat)) continue;

          const catInfo = props.categories && props.categories[0] 
            ? mapEonetCategory(props.categories[0].id) 
            : { category: 'severeStorms', categoryName: 'Natural Hazard' };

          const sourceUrl = props.sources && props.sources[0] ? props.sources[0].url : props.link;

          events.push(new DisasterEvent({
            id: `eonet_${props.id}`,
            source: 'NASA EONET',
            sourceEventId: props.id,
            title: props.title || 'NASA Natural Event',
            description: props.description || `Reported ${props.magnitudeValue ? props.magnitudeValue + ' ' + (props.magnitudeUnit || '') : ''}`,
            category: catInfo.category,
            categoryName: catInfo.categoryName,
            severity: props.magnitudeValue ? `${props.magnitudeValue} ${props.magnitudeUnit || ''}` : null,
            alertLevel: 'Orange',
            geometry: geom,
            coordinates: [lon, lat],
            eventDate: props.date || new Date().toISOString(),
            lastUpdated: props.date || new Date().toISOString(),
            sourceUrl,
            status: 'ACTIVE',
            details: {
              sources: props.sources || [],
              magnitude: props.magnitudeValue || null,
              unit: props.magnitudeUnit || null
            }
          }));
        }
      }
    } else {
      errors.push(`NASA EONET GeoJSON HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`NASA EONET GeoJSON: ${err.message}`);
  }

  // 2. Fetch active Volcanoes specific catalog to ensure global volcanic coverage
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/categories/volcanoes?status=open', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GeoScope-DisasterMonitor/2.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.events && Array.isArray(data.events)) {
        for (const ev of data.events) {
          const id = `eonet_${ev.id}`;
          if (events.some(e => e.id === id)) continue; // Avoid duplicate

          const latestGeo = ev.geometry && ev.geometry.length > 0 ? ev.geometry[ev.geometry.length - 1] : null;
          if (!latestGeo || !latestGeo.coordinates) continue;

          const lon = latestGeo.coordinates[0];
          const lat = latestGeo.coordinates[1];
          if (isNaN(lon) || isNaN(lat)) continue;

          events.push(new DisasterEvent({
            id,
            source: 'NASA EONET',
            sourceEventId: ev.id,
            title: ev.title,
            description: ev.description || 'Active Volcanic Event monitored by Smithsonian / USGS / NASA GVP',
            category: 'volcanoes',
            categoryName: 'Volcanic Eruption',
            severity: 'Eruption Alert',
            alertLevel: 'Red',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            coordinates: [lon, lat],
            eventDate: latestGeo.date || new Date().toISOString(),
            lastUpdated: latestGeo.date || new Date().toISOString(),
            sourceUrl: ev.sources && ev.sources[0] ? ev.sources[0].url : ev.link,
            status: 'ACTIVE',
            details: {
              sources: ev.sources || [],
              closed: ev.closed
            }
          }));
        }
      }
    }
  } catch (err) {
    errors.push(`NASA EONET Volcanoes: ${err.message}`);
  }

  return {
    provider: 'NASA EONET',
    success: events.length > 0,
    count: events.length,
    events,
    errors: errors.length > 0 ? errors : null
  };
}

module.exports = { fetchEonetEvents };
