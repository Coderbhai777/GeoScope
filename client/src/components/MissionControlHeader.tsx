import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe2, 
  Search, 
  Wifi, 
  Clock, 
  RefreshCw,
  MapPin,
  Loader2,
  GraduationCap,
  Plane
} from 'lucide-react';
import type { Flight } from '../types';

interface MissionControlHeaderProps {
  onSearchSelect: (coords: { lat: number; lon: number; height: number; title: string }) => void;
  flightCount: number;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  flights?: Flight[];
  onOpenNmimsWatchlist?: () => void;
}

interface GeocodedPlace {
  name: string;
  country: string;
  state?: string;
  county?: string;
  type?: string;
  postcode?: string;
  lat: number;
  lon: number;
  height: number;
  isFlight?: boolean;
}

const GLOBAL_CITY_PRESETS: GeocodedPlace[] = [
  { name: 'Shirpur Airport / Airstrip (VA1B)', state: 'Dhule, Maharashtra', country: 'India', type: 'Training Base', lat: 21.3140, lon: 74.8810, height: 12000 },
  { name: 'Jalgaon Airport (VAJL)', state: 'Maharashtra', country: 'India', type: 'Aviation Base', lat: 20.9630, lon: 75.6260, height: 20000 },
  { name: 'Dhule Airport (VA53)', state: 'Maharashtra', country: 'India', type: 'Airfield', lat: 20.9230, lon: 74.7290, height: 18000 },
  { name: 'Sendhwa Training Sector', state: 'MP / Maharashtra Border', country: 'India', type: 'Airspace Sector', lat: 21.6830, lon: 75.0930, height: 25000 },
  { name: 'Shirpur', state: 'Maharashtra', country: 'India', type: 'City', lat: 21.3500, lon: 74.8800, height: 25000 },
  { name: 'New Delhi', state: 'Delhi', country: 'India', type: 'Capital', lat: 28.6139, lon: 77.2090, height: 120000 },
  { name: 'Mumbai', state: 'Maharashtra', country: 'India', type: 'City', lat: 19.0760, lon: 72.8777, height: 120000 },
  { name: 'Bengaluru', state: 'Karnataka', country: 'India', type: 'City', lat: 12.9716, lon: 77.5946, height: 120000 },
  { name: 'Hyderabad', state: 'Telangana', country: 'India', type: 'City', lat: 17.3850, lon: 78.4867, height: 120000 },
  { name: 'Kolkata', state: 'West Bengal', country: 'India', type: 'City', lat: 22.5726, lon: 88.3639, height: 120000 },
  { name: 'Chennai', state: 'Tamil Nadu', country: 'India', type: 'City', lat: 13.0827, lon: 80.2707, height: 120000 },
  { name: 'Ahmedabad', state: 'Gujarat', country: 'India', type: 'City', lat: 23.0225, lon: 72.5714, height: 120000 },
  { name: 'Jaipur', state: 'Rajasthan', country: 'India', type: 'City', lat: 26.9124, lon: 75.7873, height: 120000 },
  { name: 'Indore', state: 'Madhya Pradesh', country: 'India', type: 'City', lat: 22.7196, lon: 75.8577, height: 100000 },
  { name: 'Pune', state: 'Maharashtra', country: 'India', type: 'City', lat: 18.5204, lon: 73.8567, height: 100000 },
  { name: 'Dubai', state: 'Dubai', country: 'UAE', type: 'City', lat: 25.2048, lon: 55.2708, height: 150000 },
  { name: 'Singapore', state: '', country: 'Singapore', type: 'City', lat: 1.3521, lon: 103.8198, height: 150000 },
  { name: 'London', state: 'England', country: 'United Kingdom', type: 'Capital', lat: 51.5074, lon: -0.1278, height: 150000 },
  { name: 'New York', state: 'New York', country: 'United States', type: 'City', lat: 40.7128, lon: -74.0060, height: 150000 },
  { name: 'Tokyo', state: 'Kanto', country: 'Japan', type: 'Capital', lat: 35.6762, lon: 139.6503, height: 150000 },
  { name: 'Paris', state: 'Île-de-France', country: 'France', type: 'Capital', lat: 48.8566, lon: 2.3522, height: 150000 },
  { name: 'Frankfurt', state: 'Hesse', country: 'Germany', type: 'City', lat: 50.1109, lon: 8.6821, height: 150000 },
  { name: 'Sydney', state: 'NSW', country: 'Australia', type: 'City', lat: -33.8688, lon: 151.2093, height: 150000 },
  { name: 'San Francisco', state: 'California', country: 'United States', type: 'City', lat: 37.7749, lon: -122.4194, height: 150000 },
];

export const MissionControlHeader: React.FC<MissionControlHeaderProps> = ({
  onSearchSelect,
  onRefresh,
  isRefreshing,
  flights = [],
  onOpenNmimsWatchlist,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<any>(null);

  const [utcTime, setUtcTime] = useState(new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global OSM / Photon Geocoding with 250ms debounce
  useEffect(() => {
    const query = searchVal.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // First match live airborne flights by registration or callsign
        const qNorm = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const flightMatches: GeocodedPlace[] = flights
          .filter(f => {
            const cs = (f.callsign || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const hex = (f.icao24 || '').toLowerCase();
            return cs.includes(qNorm) || hex.includes(qNorm);
          })
          .slice(0, 4)
          .map(f => {
            const isTraining = f.isNorthMaharashtraTraining || f.fleetMetadata?.isNorthMaharashtraTraining;
            const op = f.operator || f.fleetMetadata?.operator || 'Skynex Aero';
            return {
              name: isTraining ? `${f.callsign} • Piper PA-28 (${op})` : `${f.callsign} (${f.model || 'Aircraft'})`,
              county: isTraining ? `${op} Flight Training Fleet` : f.country,
              state: `Alt: ${Math.round(f.altitude)}m • Spd: ${Math.round(f.velocity || 0)}km/h • Hdg: ${Math.round(f.heading)}°`,
              country: isTraining ? 'Shirpur / Jalgaon Sector' : 'Active Airspace',
              type: isTraining ? 'TRAINING' : 'LIVE AIRCRAFT',
              lat: f.lat,
              lon: f.lon,
              height: Math.max(f.altitude * 2.5, 8000),
              isFlight: true
            };
          });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Geocoding request failed');
        const data = await res.json();

        if (data.features && Array.isArray(data.features)) {
          const places: GeocodedPlace[] = data.features.map((f: any) => {
            const p = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const type = p.type || p.osm_value || 'city';

            let height = 50000;
            if (type === 'country') height = 2000000;
            else if (type === 'state') height = 600000;
            else if (type === 'district' || type === 'county') height = 120000;
            else if (type === 'city') height = 65000;
            else if (type === 'town' || type === 'village') height = 28000;
            else if (type === 'aerodrome' || type === 'airport') height = 22000;

            return {
              name: p.name || 'Location',
              county: p.county || p.district || '',
              state: p.state || '',
              country: p.country || '',
              postcode: p.postcode || '',
              type: p.type || p.osm_value || '',
              lon: coords[0],
              lat: coords[1],
              height
            };
          });
          setSearchResults([...flightMatches, ...places]);
        } else {
          setSearchResults(flightMatches);
        }
      } catch (_) {
        // Fallback to local preset filter + live flight matches
        const qNorm = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const flightMatches: GeocodedPlace[] = flights
          .filter(f => {
            const cs = (f.callsign || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const hex = (f.icao24 || '').toLowerCase();
            return cs.includes(qNorm) || hex.includes(qNorm);
          })
          .slice(0, 4)
          .map(f => ({
            name: f.isNmimsFleet ? `${f.callsign} • Piper PA-28 (NMIMS Academy)` : `${f.callsign} (${f.model || 'Aircraft'})`,
            county: f.isNmimsFleet ? "SVKM's NMIMS Academy of Aviation" : f.country,
            state: `Alt: ${Math.round(f.altitude)}m • Spd: ${Math.round(f.velocity || 0)}km/h`,
            country: f.isNmimsFleet ? 'Shirpur (VA1B)' : 'Active Airspace',
            type: f.isNmimsFleet ? 'NMIMS CADET' : 'LIVE AIRCRAFT',
            lat: f.lat,
            lon: f.lon,
            height: Math.max(f.altitude * 2.5, 8000),
            isFlight: true
          }));

        const fallback = GLOBAL_CITY_PRESETS.filter(c => 
          c.name.toLowerCase().includes(query.toLowerCase()) || 
          c.country.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults([...flightMatches, ...fallback]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchVal]);

  const handlePlaceSelect = (place: GeocodedPlace) => {
    const subtitle = [place.county, place.state, place.country].filter(Boolean).slice(0, 2).join(', ');
    const displayName = subtitle ? `${place.name} (${subtitle})` : place.name;
    onSearchSelect({ 
      lat: place.lat, 
      lon: place.lon, 
      height: place.height || 50000, 
      title: displayName 
    });
    setSearchVal(displayName);
    setDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const candidates = searchResults.length > 0 ? searchResults : GLOBAL_CITY_PRESETS.filter(c => 
        c.name.toLowerCase().includes(searchVal.toLowerCase()) || 
        c.country.toLowerCase().includes(searchVal.toLowerCase())
      );
      if (candidates.length > 0) {
        handlePlaceSelect(candidates[0]);
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const displayList = searchVal.trim().length >= 2 
    ? searchResults 
    : GLOBAL_CITY_PRESETS;

  return (
    <header className="h-14 bg-space-950/90 backdrop-blur-xl border-b border-cyan-500/20 px-4 flex items-center justify-between text-gray-200 z-40 select-none">
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 shadow-lg shadow-cyan-950/40">
          <Globe2 className="w-5 h-5 text-cyan-400" />
          <div className="absolute inset-0 rounded-lg bg-cyan-400/10 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-mono font-black text-base tracking-widest text-white">GEOSCOPE</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              v2.0 LIVE
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-400 tracking-wider">
            GLOBAL EARTH & SPACE MONITORING PLATFORM
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onSearchSelect({ lat: 21.314, lon: 74.881, height: 12000, title: 'NMIMS Shirpur Campus & Airfield (VA1B)' })}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm"
          title="Quick Jump: Fly directly to SVKM NMIMS Shirpur Airport (VA1B)"
        >
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>NMIMS SHIRPUR (VA1B)</span>
        </button>

        {onOpenNmimsWatchlist && (
          <button
            onClick={onOpenNmimsWatchlist}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-space-900/90 hover:bg-emerald-950 text-gray-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-mono transition-all"
            title="Open NMIMS Cadet Fleet Intelligence Watchlist"
          >
            <Plane className="w-3.5 h-3.5 text-emerald-400" />
            <span>FLEET WATCHLIST</span>
          </button>
        )}
      </div>

      <div className="relative w-96">
        <div className="flex items-center bg-space-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus-within:border-cyan-500">
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 mr-2 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
          )}
          <input
            type="text"
            placeholder="Search any global city, airport, or region..."
            value={searchVal}
            onFocus={() => setDropdownOpen(true)}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent focus:outline-none text-xs font-mono text-white placeholder-gray-500"
          />
        </div>

        {dropdownOpen && (
          <div 
            className="absolute top-11 left-0 w-[420px] bg-space-950/98 border border-cyan-500/40 rounded-xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto backdrop-blur-2xl"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="px-3.5 py-1.5 text-[10px] font-mono text-cyan-400 font-bold border-b border-white/10 flex justify-between items-center bg-cyan-950/40">
              <span>{searchVal.trim().length >= 2 ? 'WORLDWIDE GEOCODING RESULTS' : 'RECOMMENDED GLOBAL METROPOLISES'}</span>
              <span className="text-[9px] text-gray-400 font-normal">PRESS ENTER TO FLY</span>
            </div>

            {displayList.length === 0 && !isSearching && (
              <div className="px-4 py-4 text-xs text-gray-400 font-mono text-center">
                No locations found matching "{searchVal}". Try another spelling.
              </div>
            )}

            {displayList.map((place, idx) => {
              const hierarchy = [place.county, place.state, place.country].filter(Boolean).join(', ');
              return (
                <button
                  key={`${place.name}-${place.lat}-${place.lon}-${idx}`}
                  onClick={() => handlePlaceSelect(place)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start space-x-3 transition-colors font-mono cursor-pointer border-b border-white/5 last:border-0 group ${
                    place.isFlight && place.type === 'TRAINING'
                      ? 'bg-cyan-950/20 hover:bg-cyan-500/20'
                      : 'hover:bg-cyan-500/15'
                  }`}
                >
                  {place.isFlight ? (
                    <Plane className={`w-4 h-4 shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${place.type === 'TRAINING' ? 'text-cyan-400' : 'text-yellow-400'}`} />
                  ) : (
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-xs tracking-wide ${place.isFlight && place.type === 'TRAINING' ? 'text-cyan-300' : 'text-white'}`}>
                          {place.name}
                        </span>
                        {place.type && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                            place.type === 'TRAINING'
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            {place.type}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-cyan-400/90 font-mono shrink-0 ml-2">
                        {place.lat.toFixed(2)}°, {place.lon.toFixed(2)}°
                      </span>
                    </div>

                    {hierarchy && (
                      <div className="text-[11px] text-gray-400 truncate mt-0.5">
                        {hierarchy}
                        {place.postcode ? ` • ${place.postcode}` : ''}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4 text-xs font-mono">
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-space-900/70 border border-white/10">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-gray-300">GATEWAY</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>

        <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-space-900/70 border border-white/10">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400">UTC</span>
          <span className="text-cyan-300 font-bold">{utcTime}</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
          title="Refresh real-time data feeds"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">SYNC</span>
        </button>
      </div>
    </header>
  );
};
