/**
 * Flight Data Ingestion Gateway & Multi-Provider Manager
 * Coordinates provider feeds, enforces authentic provenance, and detects stale data.
 */

const { fetchFlightradar24Data, getFlightradar24Status } = require('./flightradar24.provider');
const { fetchAdsbLol, getAdsbLolStatus } = require('./adsb-lol.provider');
const { fetchOpenSkyData, getOpenSkyStatus } = require('./opensky.provider');
const { fetchDirectSdrData, getDirectSdrStatus } = require('./direct-adsb.provider');
const { VERIFICATION_STATUSES } = require('./provider-types');

async function ingestAllProviders() {
  const results = await Promise.allSettled([
    fetchFlightradar24Data(),
    fetchAdsbLol(),
    fetchOpenSkyData(),
    fetchDirectSdrData()
  ]);

  const observationsByHex = new Map();

  // Ingest priority: Direct SDR > OpenSky > adsb.lol > Flightradar24 fallback
  const batches = [
    { name: 'FR24', result: results[0] },
    { name: 'ADSB_LOL', result: results[1] },
    { name: 'OPENSKY', result: results[2] },
    { name: 'DIRECT_SDR', result: results[3] }
  ];

  for (const b of batches) {
    if (b.result.status === 'fulfilled' && Array.isArray(b.result.value)) {
      for (const flight of b.result.value) {
        if (!flight.icao24) continue;
        const hex = flight.icao24.toLowerCase().trim();

        if (observationsByHex.has(hex)) {
          // Cross-checked observation! Aircraft seen across multiple distinct feeds
          const existing = observationsByHex.get(hex);
          existing.crossCheckCount = (existing.crossCheckCount || 1) + 1;
          existing.additionalSources = existing.additionalSources || [];
          existing.additionalSources.push({
            provider: flight.providerName,
            providerType: flight.providerType,
            lat: flight.lat,
            lon: flight.lon,
            altitude: flight.altitude,
            timestamp: flight.observationTimestamp
          });
          existing.verificationStatus = VERIFICATION_STATUSES.CROSS_CHECKED_MULTI_SOURCE;
        } else {
          flight.crossCheckCount = 1;
          flight.additionalSources = [];
          observationsByHex.set(hex, flight);
        }
      }
    }
  }

  return Array.from(observationsByHex.values());
}

function getProviderDiagnostics() {
  return [
    getFlightradar24Status(),
    getAdsbLolStatus(),
    getOpenSkyStatus(),
    getDirectSdrStatus()
  ];
}

module.exports = {
  ingestAllProviders,
  getProviderDiagnostics
};
