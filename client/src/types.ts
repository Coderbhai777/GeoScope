export type PilotViewMode = 'COCKPIT' | 'CHASE' | 'WING' | 'TOP_DOWN' | 'DOWN_LOOK';
export type BasemapMode = 'satellite' | 'hybrid' | 'streets';

export interface NorthMaharashtraAirport {
  code: string;
  name: string;
  lat: number;
  lon: number;
  elevationMeters: number;
  description: string;
}

export interface NorthMaharashtraAircraft {
  icao24: string;
  registration: string;
  aircraftModel: string;
  typeCode: string;
  manufacturer?: string;
  engineType?: string;
  organizationId: string;
  operator: string;
  ownershipStatus: string;
  baseAirport: string;
  operatingSector: string;
  sourceOfVerification: string;
  verificationNotes: string;
  status: 'AIRBORNE' | 'GROUND';
  live: {
    lat: number;
    lon: number;
    altitude: number;
    velocity: number;
    heading: number;
    verticalRate: number;
    observationTimestamp: number;
    fetchTimestamp: number;
    provider: string;
    providerType: string;
    positionType: string;
    isInterpolated: boolean;
    freshness: 'FRESH' | 'AGING' | 'STALE';
    ageSeconds: number;
    verificationStatus: string;
    lastSeen: number;
    trail: [number, number, number][];
  } | null;
}

export interface NorthMaharashtraReport {
  success: boolean;
  feature: string;
  sectorName: string;
  keyAirports: NorthMaharashtraAirport[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  timestamp: string;
  stats: {
    totalRegistered: number;
    airborneCount: number;
    groundCount: number;
    regionalAirborneTotal: number;
    avgAltitude: number;
    avgSpeed: number;
  };
  fleet: NorthMaharashtraAircraft[];
}

export interface AviationProviderReport {
  id: string;
  name: string;
  type: string;
  status: string;
  latencyMs: number;
  lastAttempt: string | null;
  lastSuccess: string | null;
  lastCount: number;
  error?: string | null;
  disclosure?: string;
}

export interface AtcStation {
  id: string;
  icao: string;
  iata: string;
  name: string;
  airport: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  frequency: string;
  channelType: string;
  description: string;
  streamUrl: string;
  distanceKm?: number;
}

// Legacy aliases for backward compatibility
export type NmimsAircraftMetadata = NorthMaharashtraAircraft;
export type NmimsFleetLiveTelemetry = NonNullable<NorthMaharashtraAircraft['live']>;
export type NmimsFleetAircraft = NorthMaharashtraAircraft;
export type NmimsFleetReport = NorthMaharashtraReport;

export interface Flight {
  icao24: string;
  callsign: string;
  country: string;
  lon: number;
  lat: number;
  altitude: number; // meters
  velocity: number | null; // km/h
  heading: number; // degrees
  verticalRate: number | null;
  squawk: string | null;
  lastSeen: number;
  model?: string;
  operator?: string;
  category?: 'commercial' | 'training' | 'military' | 'helicopter' | string;
  source?: string;
  isNmimsFleet?: boolean;
  isNorthMaharashtraTraining?: boolean;
  nmimsMetadata?: any;
  fleetMetadata?: any;
  trail?: [number, number, number][]; // [lon, lat, alt]
  // Data Provenance fields
  provider?: string;
  providerId?: string;
  providerName?: string;
  providerType?: string;
  observationTimestamp?: number;
  fetchTimestamp?: number;
  positionType?: 'RECEIVED' | 'INTERPOLATED';
  isInterpolated?: boolean;
  freshness?: 'FRESH' | 'AGING' | 'STALE' | 'EXPIRED';
  ageSeconds?: number;
  verificationStatus?: string;
  crossCheckCount?: number;
  additionalSources?: any[];
  rawObservation?: any;
  ownershipStatus?: string;
  baseAirport?: string;
  sourceOfVerification?: string;
  verificationNotes?: string;
}

export interface Earthquake {
  id: string;
  mag: number;
  title: string;
  place: string;
  time: number;
  updated: number;
  url: string;
  tsunami: number;
  status: string;
  significance: number;
  type: string;
  lon: number;
  lat: number;
  depth: number; // km
}

export interface Disaster {
  id: string;
  source: string;
  sourceEventId?: string;
  title: string;
  description?: string;
  category: 'cyclones' | 'wildfires' | 'volcanoes' | 'floods' | 'droughts' | 'severeStorms' | 'tsunamis' | 'earthquakes' | 'other' | string;
  categoryId?: string;
  categoryName: string;
  severity?: string | null;
  alertLevel: 'Red' | 'Orange' | 'Green' | 'Warning' | 'Advisory' | 'None' | string;
  geometry?: any;
  coordinates: [number, number]; // [lon, lat]
  date?: string;
  eventDate: string;
  lastUpdated?: string;
  lon: number;
  lat: number;
  sourceUrl: string | null;
  status: 'ACTIVE' | 'WARNING' | 'CLOSED' | 'MONITORED' | string;
  country?: string;
  confidence?: string | null;
  details?: any;
}

export interface DisasterProviderReport {
  id: string;
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'NOT_CONFIGURED' | 'OFFLINE';
  eventsReceived: number;
  lastSync: string | null;
  error?: string | null;
  instruction?: string | null;
  note?: string | null;
}

export interface DisasterSummaryCounts {
  total: number;
  cyclones: number;
  wildfires: number;
  floods: number;
  volcanoes: number;
  earthquakes: number;
  tsunamis: number;
  droughts: number;
  severeStorms: number;
  other: number;
  redAlerts: number;
  orangeAlerts: number;
}

export interface SatelliteTrack {
  norad: number;
  name: string;
  type: string;
  color: string;
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKmH: number;
  groundTrack: [number, number, number][]; // [lon, lat, alt]
  timestamp: string;
}

export interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
  };
  hourly?: {
    temperature_2m: number[];
    precipitation_probability: number[];
  };
}

export interface LayerConfig {
  id: string;
  name: string;
  category: 'aviation' | 'seismic' | 'disaster' | 'space' | 'weather' | 'environment';
  enabled: boolean;
  opacity: number;
  count: number;
  color: string;
  iconName: string;
  description: string;
}

export type SelectedEntity = 
  | { type: 'flight'; data: Flight }
  | { type: 'earthquake'; data: Earthquake }
  | { type: 'disaster'; data: Disaster }
  | { type: 'satellite'; data: SatelliteTrack }
  | null;
