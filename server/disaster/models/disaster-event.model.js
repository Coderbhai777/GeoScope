/**
 * GeoScope Normalized Natural Disaster Event Model
 * Provides unified schema across NASA EONET, GDACS, NOAA, FIRMS, and USGS
 */

class DisasterEvent {
  constructor({
    id,
    source,
    sourceEventId,
    title,
    description = '',
    category,
    categoryName,
    severity = null,
    alertLevel = 'None', // 'Red', 'Orange', 'Green', 'Warning', 'Advisory', 'None'
    geometry = null,
    coordinates = [0, 0], // [lon, lat]
    eventDate = new Date().toISOString(),
    lastUpdated = new Date().toISOString(),
    sourceUrl = null,
    dataTimestamp = new Date().toISOString(),
    status = 'ACTIVE', // 'ACTIVE', 'WARNING', 'CLOSED', 'MONITORED'
    country = 'Worldwide',
    confidence = null,
    details = {}
  }) {
    this.id = id;
    this.source = source;
    this.sourceEventId = String(sourceEventId || id);
    this.title = title || 'Natural Event';
    this.description = description || '';
    this.category = category; // 'cyclones', 'wildfires', 'volcanoes', 'floods', 'droughts', 'severeStorms', 'tsunamis', 'earthquakes'
    this.categoryName = categoryName || category;
    this.severity = severity;
    this.alertLevel = alertLevel;
    this.geometry = geometry || { type: 'Point', coordinates };
    this.coordinates = coordinates;
    this.lon = coordinates[0];
    this.lat = coordinates[1];
    this.eventDate = eventDate;
    this.lastUpdated = lastUpdated;
    this.sourceUrl = sourceUrl;
    this.dataTimestamp = dataTimestamp;
    this.status = status;
    this.country = country;
    this.confidence = confidence;
    this.details = details;
  }
}

module.exports = { DisasterEvent };
