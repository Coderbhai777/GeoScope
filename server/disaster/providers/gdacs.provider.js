/**
 * Global Disaster Alert and Coordination System (GDACS) Provider
 * A cooperation framework between the United Nations and the European Commission
 * Documentation: https://www.gdacs.org/gdacsapi/swagger/index.html
 */

const { DisasterEvent } = require('../models/disaster-event.model');

function mapGdacsType(type) {
  switch (type) {
    case 'TC':
      return { category: 'cyclones', categoryName: 'Tropical Cyclone / Hurricane' };
    case 'FL':
      return { category: 'floods', categoryName: 'Severe Flood' };
    case 'VO':
      return { category: 'volcanoes', categoryName: 'Active Volcano' };
    case 'EQ':
      return { category: 'earthquakes', categoryName: 'Seismic Impact Event' };
    case 'DR':
      return { category: 'droughts', categoryName: 'Drought Crisis' };
    case 'WF':
      return { category: 'wildfires', categoryName: 'Major Wildfire' };
    default:
      return { category: 'severeStorms', categoryName: 'Emergency Incident' };
  }
}

async function fetchGdacsEvents() {
  const events = [];
  let error = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoScope-DisasterMonitor/2.0 (+https://geoscope.app)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`GDACS HTTP ${res.status}`);

    const data = await res.json();
    if (data.features && Array.isArray(data.features)) {
      for (const f of data.features) {
        const p = f.properties || {};
        const geom = f.geometry;
        if (!geom || !geom.coordinates) continue;

        const coords = geom.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;

        const lon = coords[0];
        const lat = coords[1];
        if (isNaN(lon) || isNaN(lat)) continue;

        const mapping = mapGdacsType(p.eventtype);
        const alertLevel = p.alertlevel || (p.episodealertlevel || 'Orange');
        const reportUrl = p.url?.report || `https://www.gdacs.org/report.aspx?eventid=${p.eventid}&episodeid=${p.episodeid || 1}&eventtype=${p.eventtype}`;

        const affectedCountries = Array.isArray(p.affectedcountries) 
          ? p.affectedcountries.map(c => c.countryname).filter(Boolean).join(', ')
          : (p.country || 'Global Region');

        events.push(new DisasterEvent({
          id: `gdacs_${p.eventtype}_${p.eventid}`,
          source: 'GDACS (UN/EC)',
          sourceEventId: p.eventid,
          title: p.name || p.eventname || `${alertLevel} Alert ${mapping.categoryName}`,
          description: p.description || p.htmldescription?.replace(/<[^>]*>?/gm, '') || `GDACS Alert Level: ${alertLevel}`,
          category: mapping.category,
          categoryName: mapping.categoryName,
          severity: p.severitydata?.severitytext || `Alert Score: ${p.alertscore || p.episodealertscore || 'N/A'}`,
          alertLevel: alertLevel, // 'Red', 'Orange', 'Green'
          geometry: geom,
          coordinates: [lon, lat],
          eventDate: p.fromdate || new Date().toISOString(),
          lastUpdated: p.datemodified || p.todate || new Date().toISOString(),
          sourceUrl: reportUrl,
          status: p.iscurrent === 'true' ? 'ACTIVE' : 'MONITORED',
          country: affectedCountries,
          details: {
            glide: p.glide || null,
            alertscore: p.alertscore,
            episodealertscore: p.episodealertscore,
            severitydata: p.severitydata,
            affectedcountries: p.affectedcountries,
            detailsUrl: p.url?.details
          }
        }));
      }
    }
  } catch (err) {
    error = err.message;
  }

  return {
    provider: 'GDACS (UN/EC)',
    success: events.length > 0,
    count: events.length,
    events,
    error
  };
}

module.exports = { fetchGdacsEvents };
