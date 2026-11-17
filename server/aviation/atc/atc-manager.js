const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

let stations = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, 'atc-stations.json'), 'utf8');
  stations = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load atc-stations.json:', e);
}

function getAllStations() {
  return stations;
}

function getStationById(id) {
  if (!id) return null;
  return stations.find(s => 
    s.id.toLowerCase() === id.toLowerCase() ||
    s.icao.toLowerCase() === id.toLowerCase() ||
    s.iata.toLowerCase() === id.toLowerCase()
  ) || null;
}

// Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest ATC radio station given an aircraft's current lat & lon.
 */
function findNearestStation(lat, lon) {
  if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
    return stations[0] || null;
  }

  let nearest = null;
  let minDistance = Infinity;

  for (const s of stations) {
    const d = calculateDistanceKm(lat, lon, s.lat, s.lon);
    if (d < minDistance) {
      minDistance = d;
      nearest = { ...s, distanceKm: Math.round(d) };
    }
  }

  return nearest;
}

/**
 * Stream proxy to prevent browser CORS / mixed-content blocks
 * when tuning into live airport ATC audio broadcasts.
 */
function proxyAtcStream(stationId, req, res) {
  const station = getStationById(stationId) || stations[0];
  if (!station || !station.streamUrl) {
    return res.status(404).json({ error: 'ATC Station not found' });
  }

  const streamUrl = station.streamUrl;
  const client = streamUrl.startsWith('https') ? https : http;

  // Set streaming audio headers
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-cache, no-store',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-ATC-Station': station.icao,
    'X-ATC-Frequency': station.frequency
  });

  const proxyReq = client.get(streamUrl, {
    headers: {
      'User-Agent': 'GeoScope-ATC-Radio/1.0 (Mozilla/5.0 Windows NT 10.0; Win64; x64)'
    }
  }, (proxyRes) => {
    if (proxyRes.statusCode >= 400) {
      console.warn(`[ATC Proxy] Upstream returned status ${proxyRes.statusCode} for ${station.icao}`);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.warn(`[ATC Proxy] Stream error on ${station.icao}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream ATC stream temporarily unavailable' });
    } else {
      res.end();
    }
  });

  req.on('close', () => {
    proxyReq.destroy();
  });
}

module.exports = {
  getAllStations,
  getStationById,
  findNearestStation,
  proxyAtcStream
};
