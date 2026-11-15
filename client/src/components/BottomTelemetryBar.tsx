import React from 'react';
import { Compass } from 'lucide-react';

interface BottomTelemetryBarProps {
  coordinates: { lat: number; lon: number; height: number };
  flightCount: number;
  quakeCount: number;
  disasterCount: number;
  satCount: number;
}

export const BottomTelemetryBar: React.FC<BottomTelemetryBarProps> = ({
  coordinates,
  flightCount,
  quakeCount,
  disasterCount,
  satCount,
}) => {
  return (
    <footer className="h-10 bg-space-950/90 backdrop-blur-md border-t border-cyan-500/20 px-4 flex items-center justify-between text-[11px] font-mono text-gray-300 z-40 select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-gray-400">AIRBORNE AIRCRAFT:</span>
          <span className="text-cyan-300 font-bold">{flightCount.toLocaleString()}</span>
        </div>

        <div className="hidden md:flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-gray-400">USGS SEISMIC:</span>
          <span className="text-amber-300 font-bold">{quakeCount}</span>
        </div>

        <div className="hidden md:flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-gray-400">ACTIVE DISASTERS:</span>
          <span className="text-red-300 font-bold">{disasterCount}</span>
        </div>

        <div className="hidden lg:flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-gray-400">PROPAGATED SATELLITES:</span>
          <span className="text-emerald-300 font-bold">{satCount}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3 bg-space-900/80 px-3 py-1 rounded border border-white/10 text-cyan-400">
        <Compass className="w-3.5 h-3.5" />
        <span>
          LAT: <b className="text-white">{coordinates.lat.toFixed(4)}°</b>
        </span>
        <span>
          LON: <b className="text-white">{coordinates.lon.toFixed(4)}°</b>
        </span>
        <span>
          ALT: <b className="text-white">{Math.round(coordinates.height / 1000).toLocaleString()} km</b>
        </span>
      </div>
    </footer>
  );
};
