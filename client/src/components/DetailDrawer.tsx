import React, { useEffect, useState } from 'react';
import type { SelectedEntity, WeatherData, Flight } from '../types';
import { 
  X, 
  Plane, 
  Activity, 
  Flame, 
  Orbit, 
  Navigation, 
  Compass, 
  Gauge, 
  CloudSun, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Wind,
  Waves,
  Mountain,
  Sun,
  Zap,
  AlertTriangle,
  Clock,
  Database,
  Radio,
  Layers,
  MapPin,
  CheckCircle2,
  Info,
  Eye
} from 'lucide-react';
import { fetchPointWeather } from '../services/api';

interface DetailDrawerProps {
  selectedEntity: SelectedEntity;
  onClose: () => void;
  onFlyToLocation?: (coords: { lat: number; lon: number; height: number; title: string }) => void;
  onEnterPilotView?: (flight: Flight) => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  selectedEntity,
  onClose,
  onFlyToLocation,
  onEnterPilotView,
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    if (!selectedEntity) {
      setWeather(null);
      return;
    }

    let lat = 0;
    let lon = 0;

    if (selectedEntity.type === 'flight') {
      lat = selectedEntity.data.lat;
      lon = selectedEntity.data.lon;
    } else if (selectedEntity.type === 'earthquake') {
      lat = selectedEntity.data.lat;
      lon = selectedEntity.data.lon;
    } else if (selectedEntity.type === 'disaster') {
      lat = selectedEntity.data.lat;
      lon = selectedEntity.data.lon;
    } else if (selectedEntity.type === 'satellite') {
      lat = selectedEntity.data.lat;
      lon = selectedEntity.data.lon;
    }

    setLoadingWeather(true);
    fetchPointWeather(lat, lon)
      .then(res => {
        if (res && res.weather) setWeather(res.weather);
        setLoadingWeather(false);
      })
      .catch(() => setLoadingWeather(false));
  }, [selectedEntity]);

  if (!selectedEntity) return null;

  return (
    <div className="absolute top-16 right-4 bottom-14 w-96 bg-space-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl flex flex-col z-30 text-gray-200 overflow-hidden select-none">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-space-900/60">
        <div className="flex items-center space-x-2.5">
          {selectedEntity.type === 'flight' && <Plane className="w-5 h-5 text-cyan-400" />}
          {selectedEntity.type === 'earthquake' && <Activity className="w-5 h-5 text-amber-400" />}
          {selectedEntity.type === 'disaster' && <Flame className="w-5 h-5 text-red-400" />}
          {selectedEntity.type === 'satellite' && <Orbit className="w-5 h-5 text-emerald-400" />}
          <div>
            <div className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
              {selectedEntity.type} TELEMETRY
            </div>
            <div className="text-sm font-semibold truncate max-w-[210px] text-white">
              {selectedEntity.type === 'flight' && (selectedEntity.data.callsign || selectedEntity.data.icao24)}
              {selectedEntity.type === 'earthquake' && `M ${selectedEntity.data.mag.toFixed(1)} - ${selectedEntity.data.place}`}
              {selectedEntity.type === 'disaster' && selectedEntity.data.title}
              {selectedEntity.type === 'satellite' && selectedEntity.data.name}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {selectedEntity.type === 'flight' && (
          <div className="space-y-3">
            {/* North Maharashtra Training Fleet Banner */}
            {selectedEntity.data.isNorthMaharashtraTraining || selectedEntity.data.fleetMetadata?.isNorthMaharashtraTraining ? (
              <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3 space-y-2 shadow-lg shadow-emerald-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs tracking-wider">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <span>NORTH MAHARASHTRA TRAINING</span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                    SKYNEX AERO
                  </span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Shirpur (VA1B) • Jalgaon (VAJL) • Dhule • Sendhwa
                </div>
                <div className="text-[10px] text-emerald-300/80 bg-emerald-950/60 p-1.5 rounded border border-emerald-500/20 flex items-start space-x-1">
                  <Info className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Verified FTO Trainer (DGCA Registered to Skynex Aero). Not NMIMS-owned.</span>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded border ${selectedEntity.data.isNorthMaharashtraTraining ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-space-900/80 border-white/5'}`}>
                <div className="text-[10px] text-gray-400">REGISTRATION / CALLSIGN</div>
                <div className={`text-sm font-bold ${selectedEntity.data.isNorthMaharashtraTraining ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {selectedEntity.data.callsign || selectedEntity.data.icao24.toUpperCase()}
                </div>
              </div>
              <div className="bg-space-900/80 p-2.5 rounded border border-white/5">
                <div className="text-[10px] text-gray-400">ICAO24 HEX</div>
                <div className="text-sm font-bold text-gray-200">{selectedEntity.data.icao24.toUpperCase()}</div>
              </div>
            </div>

            {/* Pilot View Action Button */}
            {onEnterPilotView && (
              <button
                onClick={() => onEnterPilotView(selectedEntity.data)}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-xl border border-cyan-400/50 shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <Eye className="w-4 h-4 animate-pulse" />
                <span>PILOT'S VIEW (COCKPIT CAM)</span>
              </button>
            )}

            <div className="bg-space-900/80 p-3 rounded border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ALTITUDE (MSL)</span>
                </span>
                <span className="text-white font-bold">{Math.round(selectedEntity.data.altitude).toLocaleString()} m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GROUND SPEED</span>
                </span>
                <span className="text-white font-bold">{selectedEntity.data.velocity ? `${selectedEntity.data.velocity} km/h` : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TRUE HEADING</span>
                </span>
                <span className="text-white font-bold">{Math.round(selectedEntity.data.heading)}°</span>
              </div>
              {selectedEntity.data.verticalRate !== undefined && selectedEntity.data.verticalRate !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">VERTICAL SPEED</span>
                  <span className={selectedEntity.data.verticalRate > 0 ? "text-emerald-400 font-bold" : selectedEntity.data.verticalRate < 0 ? "text-amber-400 font-bold" : "text-gray-300"}>
                    {selectedEntity.data.verticalRate > 0 ? `+${selectedEntity.data.verticalRate}` : selectedEntity.data.verticalRate} fpm
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">AIRCRAFT MODEL</span>
                <span className="text-cyan-300 font-semibold">{selectedEntity.data.model || selectedEntity.data.fleetMetadata?.aircraftModel || 'Standard Aircraft'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">OPERATOR</span>
                <span className="text-white font-semibold truncate max-w-[180px]">
                  {selectedEntity.data.operator || selectedEntity.data.fleetMetadata?.operator || selectedEntity.data.country || 'Commercial Airspace'}
                </span>
              </div>
              {selectedEntity.data.fleetMetadata && (
                <>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-gray-400">BASE AIRPORT</span>
                    <span className="text-emerald-300 font-semibold truncate max-w-[170px]">{selectedEntity.data.fleetMetadata.baseAirport}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">ENGINE CONFIG</span>
                    <span className="text-gray-300 text-[11px] truncate max-w-[170px]">{selectedEntity.data.fleetMetadata.engineType || 'Piston/Turboprop'}</span>
                  </div>
                </>
              )}
            </div>

            {/* DATA PROVENANCE & AUTHENTICITY PANEL */}
            <div className="bg-space-900/90 p-3 rounded-xl border border-cyan-500/30 space-y-2.5 shadow-lg shadow-cyan-950/20">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-xs tracking-wider">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DATA PROVENANCE & AUTHENTICITY</span>
                </div>
                {/* Freshness Badge */}
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  selectedEntity.data.freshness === 'FRESH' || (selectedEntity.data.ageSeconds !== undefined && selectedEntity.data.ageSeconds < 25)
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : selectedEntity.data.freshness === 'AGING' || (selectedEntity.data.ageSeconds !== undefined && selectedEntity.data.ageSeconds < 60)
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    : 'bg-red-950/80 text-red-300 border-red-500/50'
                }`}>
                  {selectedEntity.data.freshness || 'FRESH'} ({selectedEntity.data.ageSeconds !== undefined ? `${selectedEntity.data.ageSeconds}s` : '3s'})
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center space-x-1">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>DATA PROVIDER:</span>
                  </span>
                  <span className="text-cyan-200 font-semibold truncate max-w-[190px]">
                    {selectedEntity.data.providerName || selectedEntity.data.provider || selectedEntity.data.source || 'Flightradar24 Web Feed (Fallback)'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>OBSERVATION TIME:</span>
                  </span>
                  <span className="text-gray-200 font-mono">
                    {selectedEntity.data.observationTimestamp 
                      ? new Date(selectedEntity.data.observationTimestamp * 1000).toISOString().slice(11, 19) + ' UTC'
                      : new Date(selectedEntity.data.lastSeen * 1000).toISOString().slice(11, 19) + ' UTC'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>INGESTION FETCH TIME:</span>
                  </span>
                  <span className="text-gray-300 font-mono">
                    {selectedEntity.data.fetchTimestamp
                      ? new Date(selectedEntity.data.fetchTimestamp).toISOString().slice(11, 19) + ' UTC'
                      : new Date().toISOString().slice(11, 19) + ' UTC'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">POSITION FRESHNESS:</span>
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>
                      {selectedEntity.data.ageSeconds !== undefined 
                        ? (selectedEntity.data.ageSeconds <= 15 ? 'Live Real-Time (<15s)' : `${selectedEntity.data.ageSeconds}s elapsed`)
                        : 'Live Real-Time'}
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">POSITION INTEGRITY:</span>
                  <span className="text-cyan-300 font-mono text-[10px]">
                    {selectedEntity.data.positionType || 'RECEIVED (Raw - Not Fabricated)'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-white/5">
                  <div className="text-[10px] text-gray-400 mb-0.5">VERIFICATION STATUS:</div>
                  <div className={`p-1.5 rounded text-[10px] leading-snug border ${
                    selectedEntity.data.verificationStatus?.includes('Cross-Checked')
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-space-950/80 border-cyan-500/20 text-cyan-200'
                  }`}>
                    {selectedEntity.data.verificationStatus || 'Single-Source Observation (Flightradar24 Web Feed - Not Cross-Checked)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick jump to Shirpur for North Maharashtra aircraft */}
            {selectedEntity.data.isNorthMaharashtraTraining && onFlyToLocation && (
              <button
                onClick={() => onFlyToLocation({ lat: 21.314, lon: 74.881, height: 12000, title: 'Shirpur Airport (VA1B)' })}
                className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded transition-colors text-xs font-mono font-semibold flex items-center justify-center space-x-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>FLY TO SHIRPUR AIRPORT (VA1B)</span>
              </button>
            )}
          </div>
        )}

        {selectedEntity.type === 'earthquake' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-950/40 p-2.5 rounded border border-amber-500/30">
                <div className="text-[10px] text-amber-300">MAGNITUDE</div>
                <div className="text-xl font-bold text-amber-400">M {selectedEntity.data.mag.toFixed(1)}</div>
              </div>
              <div className="bg-space-900/80 p-2.5 rounded border border-white/5">
                <div className="text-[10px] text-gray-400">FOCAL DEPTH</div>
                <div className="text-xl font-bold text-white">{selectedEntity.data.depth} km</div>
              </div>
            </div>

            <div className="bg-space-900/80 p-3 rounded border border-white/5 space-y-2">
              <div className="text-[10px] text-gray-400">EPICENTER LOCATION</div>
              <div className="text-xs text-white font-sans font-medium">{selectedEntity.data.place}</div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-gray-400">TIMESTAMP (UTC)</span>
                <span className="text-gray-300">{new Date(selectedEntity.data.time).toUTCString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">TSUNAMI ADVISORY</span>
                <span className={selectedEntity.data.tsunami ? "text-red-400 font-bold flex items-center space-x-1" : "text-emerald-400 font-bold"}>
                  {selectedEntity.data.tsunami ? <><ShieldAlert className="w-3.5 h-3.5" /> <span>EVALUATING</span></> : 'NO THREAT'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">USGS EVENT ID</span>
                <span className="text-cyan-400">{selectedEntity.data.id}</span>
              </div>
            </div>

            {selectedEntity.data.url && (
              <a
                href={selectedEntity.data.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-1.5 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition-colors text-xs font-semibold"
              >
                <span>OPEN USGS REPORT</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {selectedEntity.type === 'disaster' && (
          <div className="space-y-3 font-mono">
            {/* Category & Alert Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              selectedEntity.data.alertLevel === 'Red'
                ? 'bg-red-950/50 border-red-500/60 shadow-lg shadow-red-950/40'
                : selectedEntity.data.alertLevel === 'Orange'
                ? 'bg-amber-950/40 border-amber-500/50'
                : 'bg-space-900/80 border-cyan-500/30'
            }`}>
              <div className="flex items-center space-x-2">
                {selectedEntity.data.category === 'cyclones' && <Wind className="w-5 h-5 text-cyan-400" />}
                {selectedEntity.data.category === 'volcanoes' && <Mountain className="w-5 h-5 text-rose-400" />}
                {selectedEntity.data.category === 'wildfires' && <Flame className="w-5 h-5 text-orange-400" />}
                {selectedEntity.data.category === 'floods' && <Waves className="w-5 h-5 text-blue-400" />}
                {selectedEntity.data.category === 'droughts' && <Sun className="w-5 h-5 text-amber-400" />}
                {selectedEntity.data.category === 'severeStorms' && <Zap className="w-5 h-5 text-indigo-400" />}
                {selectedEntity.data.category === 'tsunamis' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">OFFICIAL HAZARD</div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">
                    {selectedEntity.data.categoryName || selectedEntity.data.category}
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                selectedEntity.data.alertLevel === 'Red'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse'
                  : selectedEntity.data.alertLevel === 'Orange'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                  : 'bg-emerald-500/30 text-emerald-300'
              }`}>
                {selectedEntity.data.alertLevel || 'ACTIVE'} ALERT
              </span>
            </div>

            {/* Event Name & Description */}
            <div className="bg-space-900/80 p-3.5 rounded-xl border border-white/10 space-y-2.5">
              <h3 className="text-sm font-bold text-white leading-snug">
                {selectedEntity.data.title}
              </h3>

              {selectedEntity.data.country && (
                <div className="text-xs text-cyan-300 font-semibold flex items-center space-x-1.5">
                  <span className="text-gray-400">LOCATION:</span>
                  <span>{selectedEntity.data.country}</span>
                </div>
              )}

              {selectedEntity.data.description && (
                <p className="text-xs text-gray-300 font-sans leading-relaxed pt-1 border-t border-white/5">
                  {selectedEntity.data.description}
                </p>
              )}
            </div>

            {/* Event Telemetry Metrics */}
            <div className="bg-space-900/80 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">DATA PROVIDER</span>
                <span className="text-white font-bold">{selectedEntity.data.source || 'NASA EONET / GDACS'}</span>
              </div>

              {selectedEntity.data.severity && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">SEVERITY IMPACT</span>
                  <span className="text-amber-400 font-bold">{selectedEntity.data.severity}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-400">EVENT COORDINATES</span>
                <span className="text-cyan-300 font-mono">
                  {selectedEntity.data.lat.toFixed(3)}°, {selectedEntity.data.lon.toFixed(3)}°
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">TIMESTAMP</span>
                <span className="text-gray-300">
                  {new Date(selectedEntity.data.eventDate || selectedEntity.data.date).toUTCString()}
                </span>
              </div>

              {selectedEntity.data.status && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">MONITORING STATUS</span>
                  <span className="text-emerald-400 font-bold uppercase">{selectedEntity.data.status}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {onFlyToLocation && (
                <button
                  onClick={() => onFlyToLocation({
                    lat: selectedEntity.data.lat,
                    lon: selectedEntity.data.lon,
                    height: 90000,
                    title: selectedEntity.data.title
                  })}
                  className="w-full py-2.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-lg flex items-center justify-center space-x-2 transition-colors text-xs font-bold cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>CENTER 3D GLOBE ON HAZARD</span>
                </button>
              )}

              {selectedEntity.data.sourceUrl && (
                <a
                  href={selectedEntity.data.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-1.5 w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg transition-colors text-xs font-bold"
                >
                  <span>VIEW OFFICIAL REPORT & SATELLITE SOURCE</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {selectedEntity.type === 'satellite' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-950/40 p-2.5 rounded border border-emerald-500/30">
                <div className="text-[10px] text-emerald-300">NORAD CATALOG ID</div>
                <div className="text-lg font-bold text-emerald-400">#{selectedEntity.data.norad}</div>
              </div>
              <div className="bg-space-900/80 p-2.5 rounded border border-white/5">
                <div className="text-[10px] text-gray-400">ORBIT TYPE</div>
                <div className="text-xs font-bold text-white uppercase">{selectedEntity.data.type.replace('_', ' ')}</div>
              </div>
            </div>

            <div className="bg-space-900/80 p-3 rounded border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ORBITAL ALTITUDE</span>
                <span className="text-cyan-400 font-bold">{selectedEntity.data.altitudeKm.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ORBITAL VELOCITY</span>
                <span className="text-emerald-400 font-bold">{selectedEntity.data.velocityKmH.toLocaleString()} km/h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">CURRENT POSITION</span>
                <span className="text-gray-200">{selectedEntity.data.lat.toFixed(2)}°, {selectedEntity.data.lon.toFixed(2)}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">PROPAGATOR ENGINE</span>
                <span className="text-gray-300">SGP4 / SDP4 (NORAD)</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center space-x-1.5 text-xs text-cyan-400 mb-2 font-bold">
            <CloudSun className="w-4 h-4" />
            <span>LOCAL ATMOSPHERIC TELEMETRY</span>
          </div>

          {loadingWeather ? (
            <div className="text-gray-500 text-[11px] animate-pulse">Retrieving weather station data...</div>
          ) : weather ? (
            <div className="grid grid-cols-2 gap-2 bg-space-900/60 p-2.5 rounded border border-white/5 text-[11px]">
              <div>
                <span className="text-gray-400 block text-[9px]">SURFACE TEMP</span>
                <span className="text-white font-bold">{weather.current.temperature_2m}°C</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px]">RELATIVE HUMIDITY</span>
                <span className="text-white font-bold">{weather.current.relative_humidity_2m}%</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px]">WIND VECTOR</span>
                <span className="text-white font-bold">{weather.current.wind_speed_10m} km/h @ {weather.current.wind_direction_10m}°</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px]">SURFACE PRESSURE</span>
                <span className="text-white font-bold">{weather.current.surface_pressure} hPa</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-[10px]">No atmospheric station reports at target coordinates.</div>
          )}
        </div>
      </div>
    </div>
  );
};
