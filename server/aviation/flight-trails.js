/**
 * In-Memory Flight Trail & Breadcrumb Store
 * Records live GPS breadcrumbs for airborne aircraft to generate historical flight paths.
 * Guarantees that only received positions are stored (never fabricated or interpolated).
 */

// Keyed by icao24 hex
const TRAILS = new Map();
const MAX_BREADCRUMBS = 100; // Up to 100 actual breadcrumb samples
const MIN_DISTANCE_KM = 0.10; // Only record new breadcrumb if aircraft moved > 100 meters

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Record a raw received breadcrumb point
 * @param {string} icao24 
 * @param {number} lon 
 * @param {number} lat 
 * @param {number} alt 
 * @param {number} sourceTimestamp Observation timestamp from upstream provider (seconds or ms)
 */
function recordFlightBreadcrumb(icao24, lon, lat, alt, sourceTimestamp = null) {
  if (!icao24 || lon === undefined || lat === undefined || isNaN(lon) || isNaN(lat)) return;
  const hex = icao24.toLowerCase().trim();

  let trail = TRAILS.get(hex);
  if (!trail) {
    trail = [];
    TRAILS.set(hex, trail);
  }

  const ts = sourceTimestamp 
    ? (sourceTimestamp < 1e11 ? sourceTimestamp * 1000 : sourceTimestamp)
    : Date.now();

  // Check if position changed meaningfully from last point
  if (trail.length > 0) {
    const last = trail[trail.length - 1];
    const dist = calculateDistanceKm(last.lat, last.lon, lat, lon);
    if (dist < MIN_DISTANCE_KM) {
      // Haven't moved > 100m, update last timestamp if same position
      last.timestamp = ts;
      return;
    }
  }

  trail.push({
    lon: parseFloat(lon),
    lat: parseFloat(lat),
    alt: Math.round(alt || 0),
    timestamp: ts,
    isInterpolated: false, // Never fabricate
    positionType: 'RECEIVED'
  });

  // Trim to max length
  if (trail.length > MAX_BREADCRUMBS) {
    trail.shift();
  }
}

/**
 * Get historical trail for an aircraft as [lon, lat, alt] triples (for Cesium polylines)
 */
function getFlightTrail(icao24) {
  if (!icao24) return [];
  const hex = icao24.toLowerCase().trim();
  const trail = TRAILS.get(hex);
  if (!trail) return [];
  return trail.map(pt => [pt.lon, pt.lat, pt.alt]);
}

/**
 * Get detailed breadcrumb records with timestamps and provenance metadata
 */
function getDetailedFlightTrail(icao24) {
  if (!icao24) return [];
  const hex = icao24.toLowerCase().trim();
  const trail = TRAILS.get(hex);
  if (!trail) return [];
  return [...trail];
}

/**
 * Prune stale trails for aircraft not heard from in 2 hours
 */
function pruneStaleTrails() {
  const now = Date.now();
  for (const [hex, trail] of TRAILS.entries()) {
    if (trail.length > 0) {
      const last = trail[trail.length - 1];
      if (now - (last.timestamp || now) > 7200000) {
        TRAILS.delete(hex);
      }
    }
  }
}

setInterval(pruneStaleTrails, 300000); // Prune every 5 minutes

module.exports = {
  recordFlightBreadcrumb,
  getFlightTrail,
  getDetailedFlightTrail
};
