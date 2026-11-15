import React, { useState } from 'react';
import type { NorthMaharashtraReport, NorthMaharashtraAircraft, Flight } from '../types';
import { 
  X, 
  Plane, 
  Radio, 
  Gauge, 
  Compass, 
  MapPin, 
  ShieldCheck, 
  Navigation, 
  Activity, 
  Search, 
  ExternalLink,
  Clock,
  Database,
  Building2,
  Info
} from 'lucide-react';

interface NorthMaharashtraAviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: NorthMaharashtraReport | null;
  onFlyToAircraft: (aircraft: NorthMaharashtraAircraft) => void;
  onFlyToAirport: (coords: { lat: number; lon: number; height: number; title: string }) => void;
  onSelectFlight: (flight: Flight) => void;
  onEnterPilotView?: (flight: Flight) => void;
}

export const NorthMaharashtraAviationModal: React.FC<NorthMaharashtraAviationModalProps> = ({
  isOpen,
  onClose,
  report,
  onFlyToAircraft,
  onFlyToAirport,
  onSelectFlight,
  onEnterPilotView,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'AIRBORNE' | 'GROUND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const fleet = report?.fleet || [];
  const stats = report?.stats || {
    totalRegistered: 8,
    airborneCount: 0,
    groundCount: 8,
    regionalAirborneTotal: 0,
    avgAltitude: 0,
    avgSpeed: 0
  };

  const filteredFleet = fleet.filter(ac => {
    if (filter === 'AIRBORNE' && ac.status !== 'AIRBORNE') return false;
    if (filter === 'GROUND' && ac.status !== 'GROUND') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReg = ac.registration.toLowerCase().includes(q);
      const matchModel = ac.aircraftModel.toLowerCase().includes(q);
      const matchHex = ac.icao24.toLowerCase().includes(q);
      const matchOp = ac.operator.toLowerCase().includes(q);
      return matchReg || matchModel || matchHex || matchOp;
    }
    return true;
  });

  const handleLocateAircraft = (ac: NorthMaharashtraAircraft) => {
    if (!ac.live) return;
    onFlyToAircraft(ac);
    onSelectFlight({
      icao24: ac.icao24,
      callsign: ac.registration,
      country: `${ac.operator} • North Maharashtra`,
      lon: ac.live.lon,
      lat: ac.live.lat,
      altitude: ac.live.altitude,
      velocity: ac.live.velocity,
      heading: ac.live.heading,
      verticalRate: ac.live.verticalRate,
      squawk: null,
      lastSeen: ac.live.lastSeen,
      model: ac.aircraftModel,
      operator: ac.operator,
      category: 'training',
      isNorthMaharashtraTraining: true,
      ownershipStatus: ac.ownershipStatus,
      baseAirport: ac.baseAirport,
      sourceOfVerification: ac.sourceOfVerification,
      verificationNotes: ac.verificationNotes,
      provider: ac.live.provider,
      providerType: ac.live.providerType,
      observationTimestamp: ac.live.observationTimestamp,
      fetchTimestamp: ac.live.fetchTimestamp,
      freshness: ac.live.freshness,
      ageSeconds: ac.live.ageSeconds,
      verificationStatus: ac.live.verificationStatus,
      positionType: 'RECEIVED',
      isInterpolated: false,
      fleetMetadata: ac,
      trail: ac.live.trail
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-space-950/95 border border-cyan-500/40 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-space-900 via-cyan-950/40 to-space-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Plane className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm tracking-wide text-white">
                  NORTH MAHARASHTRA AVIATION
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  TRAINING CORRIDOR
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Verified Training Airframes • Skynex Aero Fleet • Shirpur • Jalgaon • Dhule • Sendhwa
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Airport Sector Quick Jump Bar */}
        <div className="px-4 py-2 bg-space-900/70 border-b border-white/5 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-gray-400 text-[11px] flex items-center space-x-1 mr-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>SECTOR BASES:</span>
          </span>
          <button
            onClick={() => {
              onFlyToAirport({ lat: 21.314, lon: 74.881, height: 12000, title: 'Shirpur Airport (VA1B)' });
              onClose();
            }}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>SHIRPUR (VA1B)</span>
          </button>
          <button
            onClick={() => {
              onFlyToAirport({ lat: 20.963, lon: 75.626, height: 20000, title: 'Jalgaon Airport (VAJL)' });
              onClose();
            }}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>JALGAON (VAJL)</span>
          </button>
          <button
            onClick={() => {
              onFlyToAirport({ lat: 20.923, lon: 74.729, height: 18000, title: 'Dhule Airport (VA53)' });
              onClose();
            }}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>DHULE (VA53)</span>
          </button>
          <button
            onClick={() => {
              onFlyToAirport({ lat: 21.683, lon: 75.093, height: 25000, title: 'Sendhwa Training Sector' });
              onClose();
            }}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>SENDHWA SECTOR</span>
          </button>
        </div>

        {/* 4 Stat KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-space-900/40 border-b border-white/5">
          <div className="bg-space-900/80 border border-cyan-500/30 rounded-lg p-3">
            <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between">
              <span>ACTIVE AIRBORNE</span>
              <span className={`w-2 h-2 rounded-full ${stats.airborneCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`}></span>
            </div>
            <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
              {stats.airborneCount} <span className="text-xs text-gray-400 font-normal">/ {stats.totalRegistered} Trainers</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Operating in Practice Sector</div>
          </div>

          <div className="bg-space-900/80 border border-white/10 rounded-lg p-3">
            <div className="text-[10px] font-mono text-gray-400">VERIFIED OPERATOR</div>
            <div className="text-sm font-mono font-bold text-emerald-400 mt-1 truncate">
              Skynex Aero
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">DGCA Approved Flight School</div>
          </div>

          <div className="bg-space-900/80 border border-white/10 rounded-lg p-3">
            <div className="text-[10px] font-mono text-gray-400">TRAINING AIRFRAMES</div>
            <div className="text-sm font-mono font-bold text-white mt-1 truncate">
              Piper PA-28-181 Archer DX
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Continental CD-155 Diesel</div>
          </div>

          <div className="bg-space-900/80 border border-white/10 rounded-lg p-3">
            <div className="text-[10px] font-mono text-gray-400">REGISTRY CLASSIFICATION</div>
            <div className="text-xs font-mono font-semibold text-emerald-300 mt-1">
              Verified Skynex Fleet
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Corrected from NMIMS attribution</div>
          </div>
        </div>

        {/* Authenticity Notice */}
        <div className="px-4 py-2 bg-amber-950/30 border-b border-amber-500/20 text-[11px] text-amber-200/90 flex items-center space-x-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Authenticity Correction:</strong> These Piper Archer DX trainers (VT-KTU, VT-NXJ, VT-NXS, VT-CZR, VT-NXQ, VT-NXO, etc.) are operated by <strong>Skynex Aero</strong> in the Shirpur/Jalgaon corridor. They are not NMIMS-owned.
          </span>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-space-950">
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ALL ({fleet.length})
            </button>
            <button
              onClick={() => setFilter('AIRBORNE')}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'AIRBORNE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              AIRBORNE ({stats.airborneCount})
            </button>
            <button
              onClick={() => setFilter('GROUND')}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'GROUND'
                  ? 'bg-gray-500/20 text-gray-300 border border-gray-500/40 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ON GROUND ({stats.groundCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search registration, hex, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-space-900 border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono w-64"
            />
          </div>
        </div>

        {/* Aircraft Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFleet.map((ac) => {
            const isAirborne = ac.status === 'AIRBORNE' && ac.live;
            return (
              <div
                key={ac.icao24}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  isAirborne
                    ? 'bg-space-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                    : 'bg-space-900/40 border-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-lg border ${
                      isAirborne 
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' 
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-base text-white">
                          {ac.registration}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-space-950 text-gray-400 border border-white/10">
                          {ac.icao24.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 font-medium">
                        {ac.aircraftModel}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isAirborne
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 animate-pulse'
                      : 'bg-space-950 text-gray-400 border border-white/10'
                  }`}>
                    {ac.status}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400">OPERATOR</span>
                    <div className="text-emerald-400 font-semibold truncate">{ac.operator}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400">BASE AIRPORT</span>
                    <div className="text-gray-300 truncate">{ac.baseAirport}</div>
                  </div>
                </div>

                {/* Telemetry if airborne */}
                {isAirborne && ac.live && (
                  <div className="mt-3 bg-space-950/80 rounded-lg p-2.5 border border-cyan-500/20 space-y-1.5 font-mono text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <span className="text-[10px] text-gray-400">ALTITUDE</span>
                        <div className="text-white font-bold">{Math.round(ac.live.altitude).toLocaleString()} m</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">SPEED</span>
                        <div className="text-white font-bold">{ac.live.velocity} km/h</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">HEADING</span>
                        <div className="text-white font-bold">{Math.round(ac.live.heading)}°</div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                      <span>OBS: {new Date(ac.live.observationTimestamp * 1000).toISOString().slice(11, 19)} UTC</span>
                      <span className="text-cyan-300">{ac.live.provider}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() => handleLocateAircraft(ac)}
                        className="py-1.5 bg-space-900 hover:bg-space-800 text-cyan-200 border border-cyan-500/40 rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>TRACK</span>
                      </button>

                      {onEnterPilotView && (
                        <button
                          onClick={() => {
                            if (!ac.live) return;
                            onEnterPilotView({
                              icao24: ac.icao24,
                              callsign: ac.registration,
                              country: `${ac.operator} • North Maharashtra`,
                              lon: ac.live.lon,
                              lat: ac.live.lat,
                              altitude: ac.live.altitude,
                              velocity: ac.live.velocity,
                              heading: ac.live.heading,
                              verticalRate: ac.live.verticalRate,
                              squawk: null,
                              lastSeen: ac.live.lastSeen,
                              model: ac.aircraftModel,
                              operator: ac.operator,
                              category: 'training',
                              isNorthMaharashtraTraining: true,
                              ownershipStatus: ac.ownershipStatus,
                              baseAirport: ac.baseAirport,
                              sourceOfVerification: ac.sourceOfVerification,
                              verificationNotes: ac.verificationNotes,
                              provider: ac.live.provider,
                              providerType: ac.live.providerType,
                              observationTimestamp: ac.live.observationTimestamp,
                              fetchTimestamp: ac.live.fetchTimestamp,
                              freshness: ac.live.freshness,
                              ageSeconds: ac.live.ageSeconds,
                              verificationStatus: ac.live.verificationStatus,
                              positionType: 'RECEIVED',
                              isInterpolated: false,
                              fleetMetadata: ac,
                              trail: ac.live.trail
                            });
                            onClose();
                          }}
                          className="py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-cyan-950 cursor-pointer"
                        >
                          <Plane className="w-3.5 h-3.5" />
                          <span>PILOT'S VIEW</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>{ac.sourceOfVerification}</span>
                  <span className="text-emerald-400">Verified DGCA FTO</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-space-900/60 flex items-center justify-between text-xs text-gray-400 font-mono">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Configurable Organization & Fleet Registry Service Active</span>
          </div>
          <div>Shirpur • Jalgaon • Dhule • Sendhwa</div>
        </div>

      </div>
    </div>
  );
};
