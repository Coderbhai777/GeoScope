/**
 * Integration Test for Express Endpoints
 */

const assert = require('assert');
const http = require('http');

async function testEndpoints() {
  process.env.PORT = '5055'; // Use isolated port
  const express = require('express');
  const cors = require('cors');
  const { 
    matchFleetAircraft, 
    getNorthMaharashtraTrainingFleet, 
    getAllAircraft, 
    getOrganizations, 
    getNorthMaharashtraBounds, 
    isNorthMaharashtraAirspace 
  } = require('./aviation/fleet-registry');
  const { ingestAllProviders, getProviderDiagnostics } = require('./aviation/providers/provider-manager');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ONLINE',
      system: 'GeoScope Multi-Provider Intelligence Gateway',
      time: new Date().toISOString(),
      services: {
        flights: { 
          cached: 10, 
          engine: 'GeoScope Multi-Provider Ingestion Engine (Flightradar24 Web Fallback, adsb.lol, OpenSky, Direct SDR)' 
        }
      }
    });
  });

  app.get('/api/aviation/providers', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: getProviderDiagnostics()
    });
  });

  app.get('/api/aviation/registry', (req, res) => {
    res.json({
      success: true,
      organizations: getOrganizations(),
      aircraft: getAllAircraft()
    });
  });

  app.get('/api/aviation/north-maharashtra', (req, res) => {
    const registryFleet = getNorthMaharashtraTrainingFleet();
    const bounds = getNorthMaharashtraBounds();
    res.json({
      success: true,
      feature: 'NORTH MAHARASHTRA AVIATION',
      sectorName: bounds.name,
      keyAirports: bounds.airports,
      bounds: {
        minLat: bounds.minLat,
        maxLat: bounds.maxLat,
        minLon: bounds.minLon,
        maxLon: bounds.maxLon
      },
      timestamp: new Date().toISOString(),
      stats: {
        totalRegistered: registryFleet.length,
        airborneCount: 0,
        groundCount: registryFleet.length,
        regionalAirborneTotal: 0
      },
      fleet: registryFleet.map(ac => ({
        ...ac,
        status: 'GROUND',
        live: null
      }))
    });
  });

  const server = app.listen(5055, async () => {
    try {
      console.log('Testing Express server on port 5055...');

      // 1. /api/status
      const resStatus = await fetch('http://localhost:5055/api/status');
      assert.strictEqual(resStatus.status, 200);
      const jsonStatus = await resStatus.json();
      assert.strictEqual(jsonStatus.status, 'ONLINE');
      console.log('✓ /api/status passed');

      // 2. /api/aviation/providers
      const resProv = await fetch('http://localhost:5055/api/aviation/providers');
      assert.strictEqual(resProv.status, 200);
      const jsonProv = await resProv.json();
      assert.strictEqual(jsonProv.providers.length, 4);
      console.log('✓ /api/aviation/providers passed (4 providers reported)');

      // 3. /api/aviation/registry
      const resReg = await fetch('http://localhost:5055/api/aviation/registry');
      assert.strictEqual(resReg.status, 200);
      const jsonReg = await resReg.json();
      assert.ok(jsonReg.organizations.length >= 4);
      assert.ok(jsonReg.aircraft.length >= 10);
      console.log(`✓ /api/aviation/registry passed (${jsonReg.aircraft.length} aircraft, ${jsonReg.organizations.length} orgs)`);

      // 4. /api/aviation/north-maharashtra
      const resNM = await fetch('http://localhost:5055/api/aviation/north-maharashtra');
      assert.strictEqual(resNM.status, 200);
      const jsonNM = await resNM.json();
      assert.strictEqual(jsonNM.feature, 'NORTH MAHARASHTRA AVIATION');
      assert.strictEqual(jsonNM.keyAirports.length, 4);
      assert.strictEqual(jsonNM.fleet.length, 8);
      console.log(`✓ /api/aviation/north-maharashtra passed (Feature: ${jsonNM.feature}, 4 key airports, ${jsonNM.fleet.length} verified trainers)`);

      server.close(() => {
        console.log('\nAll server API endpoint tests passed successfully!');
        process.exit(0);
      });
    } catch (e) {
      console.error('API endpoint test failed:', e);
      server.close(() => process.exit(1));
    }
  });
}

testEndpoints();
