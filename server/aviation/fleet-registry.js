/**
 * Configurable Aviation & Fleet Registry Service
 * Manages verified aircraft registrations, operator assignments, and training airspace definitions.
 * Eliminates incorrect NMIMS ownership assignments and accurately links Piper training airframes to Skynex Aero.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'aviation-registry.json');

// North Maharashtra Aviation Training Corridor Bounding Box
// Covers: Shirpur (VA1B), Jalgaon (VAJL), Dhule (VA53), Sendhwa
const NORTH_MAHARASHTRA_BOUNDS = {
  name: 'North Maharashtra Aviation Training Sector',
  minLat: 20.4,
  maxLat: 22.3,
  minLon: 74.0,
  maxLon: 76.5,
  airports: [
    {
      code: 'VA1B',
      name: 'Shirpur Airport / Airstrip',
      lat: 21.314,
      lon: 74.881,
      elevationMeters: 220,
      description: 'Training runway and facility in Shirpur, Dhule district'
    },
    {
      code: 'VAJL',
      name: 'Jalgaon Airport',
      lat: 20.963,
      lon: 75.626,
      elevationMeters: 244,
      description: 'Commercial and flying training base with active runway'
    },
    {
      code: 'VA53',
      name: 'Dhule Airport (Gondur)',
      lat: 20.923,
      lon: 74.729,
      elevationMeters: 271,
      description: 'Airfield utilized for flight training navigation legs'
    },
    {
      code: 'SENDHWA',
      name: 'Sendhwa Training Sector',
      lat: 21.683,
      lon: 75.093,
      elevationMeters: 250,
      description: 'Northern practice and navigation boundary on Maharashtra/MP border'
    }
  ]
};

let cachedRegistry = null;
let icaoIndex = new Map();
let regIndex = new Map();
let orgIndex = new Map();

function loadRegistry() {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const data = JSON.parse(raw);
    cachedRegistry = data;

    icaoIndex.clear();
    regIndex.clear();
    orgIndex.clear();

    if (Array.isArray(data.organizations)) {
      for (const org of data.organizations) {
        orgIndex.set(org.id, org);
      }
    }

    if (Array.isArray(data.aircraft)) {
      for (const ac of data.aircraft) {
        if (ac.icao24) {
          icaoIndex.set(ac.icao24.toLowerCase().trim(), ac);
        }
        if (ac.registration) {
          const clean = ac.registration.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          regIndex.set(clean, ac);
        }
      }
    }

    console.log(`[Aviation Registry] Loaded ${data.aircraft?.length || 0} aircraft across ${data.organizations?.length || 0} organizations.`);
    return data;
  } catch (err) {
    console.error(`[Aviation Registry Error]: Failed to load registry: ${err.message}`);
    return { organizations: [], aircraft: [] };
  }
}

// Initial load
loadRegistry();

/**
 * Match an aircraft by ICAO hex code or normalized registration
 */
function matchFleetAircraft(callsign, icao24) {
  if (icao24) {
    const cleanHex = icao24.toLowerCase().trim();
    if (icaoIndex.has(cleanHex)) {
      return icaoIndex.get(cleanHex);
    }
  }

  if (callsign) {
    const cleanCallsign = callsign.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (regIndex.has(cleanCallsign)) {
      return regIndex.get(cleanCallsign);
    }
  }

  return null;
}

/**
 * Check if geographical coordinates fall inside the North Maharashtra training airspace
 */
function isNorthMaharashtraAirspace(lat, lon) {
  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return false;
  return (
    lat >= NORTH_MAHARASHTRA_BOUNDS.minLat &&
    lat <= NORTH_MAHARASHTRA_BOUNDS.maxLat &&
    lon >= NORTH_MAHARASHTRA_BOUNDS.minLon &&
    lon <= NORTH_MAHARASHTRA_BOUNDS.maxLon
  );
}

function getOrganizations() {
  return cachedRegistry?.organizations || [];
}

function getAllAircraft() {
  return cachedRegistry?.aircraft || [];
}

/**
 * Return only verified training aircraft configured for North Maharashtra (e.g. Skynex Aero PA-28 fleet)
 */
function getNorthMaharashtraTrainingFleet() {
  const all = getAllAircraft();
  return all.filter(ac => ac.isNorthMaharashtraTraining === true);
}

function getNorthMaharashtraBounds() {
  return NORTH_MAHARASHTRA_BOUNDS;
}

module.exports = {
  loadRegistry,
  matchFleetAircraft,
  isNorthMaharashtraAirspace,
  getOrganizations,
  getAllAircraft,
  getNorthMaharashtraTrainingFleet,
  getNorthMaharashtraBounds
};
