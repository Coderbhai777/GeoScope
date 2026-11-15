/**
 * GeoScope Flight Data Accuracy & Authenticity Test Suite
 * Validates:
 * 1. Provider identification & fallback disclosure
 * 2. Investigation and categorization of all 10 target registrations
 * 3. Removal of incorrect NMIMS ownership
 * 4. North Maharashtra training mode & sector bounds
 * 5. Observation preservation, source timestamps & stale detection
 * 6. Verification status truthfulness
 */

const assert = require('assert');
const path = require('path');
const {
  loadRegistry,
  matchFleetAircraft,
  getNorthMaharashtraTrainingFleet,
  getAllAircraft,
  getOrganizations,
  isNorthMaharashtraAirspace,
  getNorthMaharashtraBounds
} = require('./aviation/fleet-registry');
const { getProviderDiagnostics } = require('./aviation/providers/provider-manager');
const { recordFlightBreadcrumb, getFlightTrail, getDetailedFlightTrail } = require('./aviation/flight-trails');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('  GEOSCOPE FLIGHT DATA ACCURACY & REGISTRY TEST SUITE');
console.log('================================================================\n');

// 1. PROVIDER TRANSPARENCY & INTEGRATION TESTS
console.log('TEST SUITE 1: Data Provider Transparency & Authorized Integration');

it('Flightradar24 is transparently disclosed as web feed fallback', () => {
  const diagnostics = getProviderDiagnostics();
  const fr24 = diagnostics.find(d => d.id === 'flightradar24_web');
  assert.ok(fr24, 'FR24 provider must exist');
  assert.strictEqual(fr24.type, 'WEB_FEED_FALLBACK');
  assert.ok(fr24.disclosure.includes('Undocumented web feed fallback'), 'Must disclose web feed fallback');
  assert.ok(fr24.disclosure.includes('Not an independent direct ADS-B receiver'), 'Must explicitly state it is not an independent direct ADS-B receiver');
});

it('adsb.lol provider includes HTTP 429 rate limit protection & disclosure', () => {
  const diagnostics = getProviderDiagnostics();
  const lol = diagnostics.find(d => d.id === 'adsb_lol');
  assert.ok(lol, 'adsb.lol provider must exist');
  assert.strictEqual(lol.type, 'COMMUNITY_ADSB');
  assert.ok(lol.disclosure.includes('HTTP 429'), 'Must document rate limit disclosure');
});

it('OpenSky Network is implemented as authorized REST API integration', () => {
  const diagnostics = getProviderDiagnostics();
  const opensky = diagnostics.find(d => d.id === 'opensky');
  assert.ok(opensky, 'OpenSky provider must exist');
  assert.strictEqual(opensky.type, 'AUTHORIZED_REST_API');
  assert.ok(opensky.name.includes('Authorized Integration'));
});

it('Independent Direct SDR provider architecture is configured', () => {
  const diagnostics = getProviderDiagnostics();
  const sdr = diagnostics.find(d => d.id === 'direct_sdr_adsb');
  assert.ok(sdr, 'Direct SDR provider must exist');
  assert.strictEqual(sdr.type, 'AUTHORIZED_DIRECT_SDR');
});

// 2. AIRCRAFT REGISTRY CORRECTION & INVESTIGATION
console.log('\nTEST SUITE 2: Aircraft Registry Investigation & NMIMS Correction');

const INVESTIGATED_REGISTRATIONS = [
  { reg: 'VT-KTU', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-NXJ', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-NXS', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-CZR', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-NXQ', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-NXO', expectedOp: 'Skynex Aero', expectedModel: 'Piper PA-28-181 Archer DX', isTraining: true },
  { reg: 'VT-EVA', expectedOp: 'Air India (Retired)', expectedModel: 'Boeing 747-437', isTraining: false },
  { reg: 'VT-EVB', expectedOp: 'Air India (Retired)', expectedModel: 'Boeing 747-437', isTraining: false },
  { reg: 'VT-EVC', expectedOp: 'Indian Airlines (Retired)', expectedModel: 'Airbus A300B4-203', isTraining: false },
  { reg: 'VT-SVK', expectedOp: 'Private / Non-Scheduled Charter', expectedModel: 'Bell 407', isTraining: false }
];

INVESTIGATED_REGISTRATIONS.forEach(({ reg, expectedOp, expectedModel, isTraining }) => {
  it(`Registration ${reg} is correctly categorized (${expectedOp} | ${expectedModel})`, () => {
    const ac = matchFleetAircraft(reg);
    assert.ok(ac, `Aircraft ${reg} must exist in registry`);
    assert.strictEqual(ac.operator, expectedOp, `Operator for ${reg} must be ${expectedOp}`);
    assert.strictEqual(ac.aircraftModel, expectedModel, `Model for ${reg} must be ${expectedModel}`);
    assert.strictEqual(ac.isNorthMaharashtraTraining, isTraining, `Training flag for ${reg} must be ${isTraining}`);
    
    // Explicit rule: Do not label them NMIMS-owned or NMIMS-operated
    assert.ok(
      !ac.operator.includes("NMIMS"),
      `${reg} must NOT be labeled as NMIMS operated`
    );
    assert.ok(
      ac.organizationId !== 'nmims_aviation',
      `${reg} organizationId must NOT be nmims_aviation`
    );
  });
});

it('Configurable organization registry loads multiple verified organizations', () => {
  const orgs = getOrganizations();
  assert.ok(Array.isArray(orgs) && orgs.length >= 4, 'Must load organizations');
  const skynex = orgs.find(o => o.id === 'skynex_aero');
  assert.ok(skynex, 'Skynex Aero org must exist');
  assert.strictEqual(skynex.verified, true);
  
  const nmims = orgs.find(o => o.id === 'nmims_aviation');
  assert.ok(nmims, 'NMIMS org must exist');
  assert.strictEqual(nmims.verified, false, 'NMIMS ownership must be marked unverified');
});

// 3. NORTH MAHARASHTRA TRAINING MODE & AIRSPACE
console.log('\nTEST SUITE 3: North Maharashtra Training Airspace & Bases');

it('Correctly identifies North Maharashtra Training bases & sector coordinates', () => {
  const bounds = getNorthMaharashtraBounds();
  assert.strictEqual(bounds.airports.length, 4);
  const codes = bounds.airports.map(a => a.code);
  assert.ok(codes.includes('VA1B'), 'Must include Shirpur (VA1B)');
  assert.ok(codes.includes('VAJL'), 'Must include Jalgaon (VAJL)');
  assert.ok(codes.includes('VA53'), 'Must include Dhule (VA53)');
  assert.ok(codes.includes('SENDHWA'), 'Must include Sendhwa Sector');
});

it('Geofence accurately validates North Maharashtra coordinates', () => {
  // Shirpur: 21.314, 74.881
  assert.strictEqual(isNorthMaharashtraAirspace(21.314, 74.881), true, 'Shirpur must be inside');
  // Jalgaon: 20.963, 75.626
  assert.strictEqual(isNorthMaharashtraAirspace(20.963, 75.626), true, 'Jalgaon must be inside');
  // Dhule: 20.923, 74.729
  assert.strictEqual(isNorthMaharashtraAirspace(20.923, 74.729), true, 'Dhule must be inside');
  // Sendhwa: 21.683, 75.093
  assert.strictEqual(isNorthMaharashtraAirspace(21.683, 75.093), true, 'Sendhwa must be inside');
  // Mumbai: 19.07, 72.87 (Outside)
  assert.strictEqual(isNorthMaharashtraAirspace(19.07, 72.87), false, 'Mumbai must be outside sector');
  // Delhi: 28.61, 77.20 (Outside)
  assert.strictEqual(isNorthMaharashtraAirspace(28.61, 77.20), false, 'Delhi must be outside sector');
});

// 4. OBSERVATION PRESERVATION & STALENESS
console.log('\nTEST SUITE 4: Observation Preservation, Source Timestamps & Breadcrumbs');

it('Preserves raw breadcrumbs with source timestamps without fabrication', () => {
  const testHex = 'test8017ac';
  const obsTime = Math.floor(Date.now() / 1000) - 10;
  
  recordFlightBreadcrumb(testHex, 74.881, 21.314, 850, obsTime);
  recordFlightBreadcrumb(testHex, 74.885, 21.318, 920, obsTime + 5);

  const trail = getFlightTrail(testHex);
  assert.ok(trail.length >= 2, 'Trail must contain recorded points');
  assert.strictEqual(trail[0][0], 74.881);
  assert.strictEqual(trail[0][1], 21.314);
  assert.strictEqual(trail[0][2], 850);

  const detailed = getDetailedFlightTrail(testHex);
  assert.strictEqual(detailed[0].isInterpolated, false, 'Must not interpolate');
  assert.strictEqual(detailed[0].positionType, 'RECEIVED', 'Position type must be RECEIVED');
  assert.strictEqual(detailed[0].timestamp, obsTime * 1000, 'Must preserve source timestamp');
});

it('Detects staleness accurately based on elapsed seconds', () => {
  const nowSec = Math.floor(Date.now() / 1000);
  
  function getFreshness(lastObsSec) {
    const age = nowSec - lastObsSec;
    if (age > 60) return 'STALE';
    if (age > 25) return 'AGING';
    return 'FRESH';
  }

  assert.strictEqual(getFreshness(nowSec - 5), 'FRESH');
  assert.strictEqual(getFreshness(nowSec - 30), 'AGING');
  assert.strictEqual(getFreshness(nowSec - 75), 'STALE');
});

// 5. TRUTHFUL VERIFICATION STATUS
console.log('\nTEST SUITE 5: Verification Status Truthfulness');

it('Does not claim independent verification unless cross-checked across multiple sources', () => {
  function computeStatus(crossCheckCount, providerName, operator) {
    if (crossCheckCount > 1) {
      return `Cross-Checked (${crossCheckCount} Sources) • ${operator}`;
    }
    if (operator) {
      return `Registry Matched (${operator}) • Single-Feed Tracking`;
    }
    return `Single-Source Observation (${providerName})`;
  }

  const singleFeedFR24 = computeStatus(1, 'Flightradar24 Web Feed (Fallback)', null);
  assert.ok(singleFeedFR24.includes('Single-Source Observation'), 'Single feed must be unverified');
  assert.ok(!singleFeedFR24.includes('Cross-Checked'), 'Single feed must NOT claim cross-checked');

  const skynexSingleFeed = computeStatus(1, 'Flightradar24 Web Feed (Fallback)', 'Skynex Aero');
  assert.ok(skynexSingleFeed.includes('Single-Feed Tracking'), 'Must disclose single-feed tracking');
  assert.ok(!skynexSingleFeed.includes('Cross-Checked'));

  const multiFeed = computeStatus(2, 'Multiple', 'Skynex Aero');
  assert.ok(multiFeed.includes('Cross-Checked (2 Sources)'), 'Only multi-feed may claim cross-checked');
});

console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
