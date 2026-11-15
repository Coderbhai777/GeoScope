import React, { useEffect, useState } from 'react';
import type { Flight, PilotViewMode } from '../types';
import { 
  X, 
  Eye, 
  Compass, 
  Gauge, 
  Navigation, 
  Maximize2, 
  Minimize2, 
  Radio, 
  ShieldCheck, 
  Plane,
  RotateCcw
} from 'lucide-react';

interface CockpitHudOverlayProps {
  flight: Flight;
  viewMode: PilotViewMode;
  onSetViewMode: (mode: PilotViewMode) => void;
  onExit: () => void;
}

export const CockpitHudOverlay: React.FC<CockpitHudOverlayProps> = ({
  flight,
  viewMode,
  onSetViewMode,
  onExit,
}) => {
  // ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  const heading = Math.round(flight.heading || 0);
  const altM = Math.round(flight.altitude || 0);
  const altFt = Math.round(altM * 3.28084);
  const speedKmh = Math.round(flight.velocity || 0);
  const speedKts = Math.round(speedKmh * 0.539957);
  const vspeed = flight.verticalRate || 0;

  // Cardinal point calculation
  const getCardinal = (deg: number) => {
    const d = (deg % 360 + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 font-mono text-cyan-400 overflow-hidden">
      {/* Cockpit Canopy Vignette in Cockpit Mode */}
      {viewMode === 'COCKPIT' && (
        <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />
      )}

      {/* Top Banner: Flight Callout & Compass Tape */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1.5 pointer-events-auto">
        <div className="bg-space-950/80 backdrop-blur-md border border-cyan-500/50 rounded-xl px-4 py-1.5 flex items-center space-x-4 shadow-xl shadow-cyan-950/40 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-bold text-white tracking-widest text-sm">
              {flight.callsign || flight.icao24.toUpperCase()}
            </span>
            <span className="text-[10px] text-cyan-300 font-medium px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/30">
              {flight.model || flight.fleetMetadata?.aircraftModel || 'Commercial Aircraft'}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <div className="text-gray-300 text-xs truncate max-w-[200px]">
            {flight.operator || flight.fleetMetadata?.operator || flight.country}
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Satellite Map High-Res Indicator */}
          <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30">
            <span>🛰️</span>
            <span>ESRI SATELLITE HD</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Heading Pill */}
          <div className="flex items-center space-x-1 font-bold text-cyan-300">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>HDG {String(heading).padStart(3, '0')}° ({getCardinal(heading)})</span>
          </div>
        </div>

        {/* Heading Compass Ribbon */}
        <div className="w-72 h-7 bg-space-950/70 border border-cyan-500/30 rounded-md flex items-center justify-center overflow-hidden text-[10px] shadow-lg relative">
          <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 left-1/2 -translate-x-1/2 z-10" />
          <div className="flex items-center space-x-4 font-mono">
            <span>{((heading - 40 + 360) % 360).toString().padStart(3, '0')}</span>
            <span>{((heading - 20 + 360) % 360).toString().padStart(3, '0')}</span>
            <span className="text-yellow-400 font-bold text-xs">{heading.toString().padStart(3, '0')}°</span>
            <span>{((heading + 20) % 360).toString().padStart(3, '0')}</span>
            <span>{((heading + 40) % 360).toString().padStart(3, '0')}</span>
          </div>
        </div>
      </div>

      {/* Center Reticle / Pitch Ladder Boresight */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80">
        {/* Central Crosshair */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Aircraft Symbol */}
          <div className="w-8 h-0.5 bg-yellow-400 shadow-[0_0_6px_#facc15]" />
          <div className="w-0.5 h-3 bg-yellow-400 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 shadow-[0_0_6px_#facc15]" />
          <div className="w-3 h-3 rounded-full border border-yellow-400/80 absolute shadow-[0_0_6px_#facc15]" />

          {/* Left / Right Winglines */}
          <div className="w-12 h-0.5 bg-cyan-400 absolute left-[-48px] shadow-[0_0_6px_#06b6d4]" />
          <div className="w-12 h-0.5 bg-cyan-400 absolute right-[-48px] shadow-[0_0_6px_#06b6d4]" />

          {/* Pitch Bars */}
          <div className="absolute -top-14 w-24 border-t-2 border-cyan-400/60 flex justify-between text-[9px] px-1">
            <span>+10</span>
            <span>+10</span>
          </div>
          <div className="absolute -top-7 w-16 border-t border-cyan-400/40 flex justify-between text-[8px] px-1">
            <span>+5</span>
            <span>+5</span>
          </div>
          <div className="absolute -bottom-7 w-16 border-b border-cyan-400/40 flex justify-between text-[8px] px-1">
            <span>-5</span>
            <span>-5</span>
          </div>
          <div className="absolute -bottom-14 w-24 border-b-2 border-cyan-400/60 flex justify-between text-[9px] px-1">
            <span>-10</span>
            <span>-10</span>
          </div>
        </div>
      </div>

      {/* Left Tape: Airspeed Indicator */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-space-950/80 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col items-center space-y-1 w-24">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SPEED</div>
        <div className="text-xl font-bold text-yellow-400 tracking-tight">
          {speedKts}
        </div>
        <div className="text-[10px] text-cyan-300">KNOTS</div>
        <div className="w-full h-px bg-white/10 my-1" />
        <div className="text-sm font-semibold text-white">
          {speedKmh}
        </div>
        <div className="text-[9px] text-gray-400">KM/H</div>
      </div>

      {/* Right Tape: Altitude & Vertical Speed Indicator */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-space-950/80 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md flex flex-col items-center space-y-1 w-28">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ALTITUDE</div>
        <div className="text-xl font-bold text-emerald-400 tracking-tight">
          {altFt.toLocaleString()}
        </div>
        <div className="text-[10px] text-cyan-300">FT (MSL)</div>
        <div className="w-full h-px bg-white/10 my-1" />
        <div className="text-sm font-semibold text-white">
          {altM.toLocaleString()} m
        </div>
        <div className="text-[9px] text-gray-400">METERS</div>

        {/* Vertical speed indicator */}
        <div className="w-full pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
          <span className="text-gray-400">V/S:</span>
          <span className={vspeed > 0 ? "text-emerald-400 font-bold" : vspeed < 0 ? "text-amber-400 font-bold" : "text-gray-300"}>
            {vspeed > 0 ? `+${vspeed}` : vspeed} fpm
          </span>
        </div>
      </div>

      {/* Bottom Telemetry & View Controls Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-auto">
        {/* Navigation & Position Coordinates Bar */}
        <div className="bg-space-950/85 backdrop-blur-md border border-cyan-500/30 rounded-lg px-3 py-1 flex items-center space-x-3 text-[11px] text-gray-300 shadow-xl">
          <span>LAT: <strong className="text-cyan-300">{flight.lat.toFixed(4)}°</strong></span>
          <span>LON: <strong className="text-cyan-300">{flight.lon.toFixed(4)}°</strong></span>
          {flight.squawk && <span>SQUAWK: <strong className="text-yellow-400">{flight.squawk}</strong></span>}
          <span>SOURCE: <strong className="text-emerald-300">{flight.providerName || flight.source || 'ADS-B'}</strong></span>
        </div>

        {/* Cockpit View Modes & Exit Toolbar */}
        <div className="bg-space-950/90 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-1.5 flex items-center space-x-1.5 shadow-2xl shadow-cyan-950/60">
          <button
            onClick={() => onSetViewMode('COCKPIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'COCKPIT'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>COCKPIT VIEW</span>
          </button>

          <button
            onClick={() => onSetViewMode('CHASE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'CHASE'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>CHASE VIEW</span>
          </button>

          <button
            onClick={() => onSetViewMode('WING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'WING'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>WING VIEW</span>
          </button>

          <button
            onClick={() => onSetViewMode('DOWN_LOOK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'DOWN_LOOK'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title="Belly Cam: Look directly down at the satellite ground"
          >
            <Navigation className="w-4 h-4 rotate-180" />
            <span>LOOK DOWN (GROUND)</span>
          </button>

          <button
            onClick={() => onSetViewMode('TOP_DOWN')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'TOP_DOWN'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>TOP-DOWN</span>
          </button>

          <div className="h-6 w-px bg-white/20 mx-1" />

          {/* Exit Button */}
          <button
            onClick={onExit}
            className="px-3.5 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/50 rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 transition-all hover:shadow-lg hover:shadow-red-950 cursor-pointer"
            title="Exit Pilot View (or press ESC)"
          >
            <X className="w-4 h-4" />
            <span>EXIT PILOT VIEW</span>
            <span className="text-[9px] opacity-75 font-normal px-1 py-0.2 bg-black/40 rounded">ESC</span>
          </button>
        </div>
      </div>
    </div>
  );
};
