/**
 * Backwards-Compatibility Wrapper for Legacy NMIMS Registry Imports.
 * Delegates to the unified, truthful Fleet Registry Service.
 */

const {
  matchFleetAircraft,
  getNorthMaharashtraTrainingFleet,
  getAllAircraft
} = require('./fleet-registry');

/**
 * Matches aircraft against the truthful registry.
 */
function matchNmimsAircraft(callsign, icao24) {
  const match = matchFleetAircraft(callsign, icao24);
  if (!match) return null;

  // If it's a North Maharashtra training aircraft (e.g. Skynex Aero Piper), return its metadata
  return match;
}

/**
 * Returns the North Maharashtra training fleet (Skynex Aero) for legacy callers
 */
function getNmimsFleetRegistry() {
  return getNorthMaharashtraTrainingFleet();
}

module.exports = {
  NMIMS_VERIFIED_REGISTRY: getNorthMaharashtraTrainingFleet(),
  matchNmimsAircraft,
  getNmimsFleetRegistry
};
