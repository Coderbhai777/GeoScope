import React, { useState, useEffect } from 'react';
import type { Flight } from '../types';
import { Plane, X, Navigation } from 'lucide-react';

interface DetectionAlertsProps {
  flights: Flight[];
  onFlyToFlight: (flight: Flight) => void;
}

interface AlertItem {
  id: string;
  registration: string;
  model: string;
  operator: string;
  flight: Flight;
  timestamp: string;
}

export const DetectionAlerts: React.FC<DetectionAlertsProps> = ({ flights, onFlyToFlight }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [seenHexes, setSeenHexes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const trainingAirborne = flights.filter(f => (f.isNorthMaharashtraTraining || f.fleetMetadata?.isNorthMaharashtraTraining) && f.lon && f.lat);
    const newAlerts: AlertItem[] = [];
    const nextSeen = new Set(seenHexes);

    for (const f of trainingAirborne) {
      if (!nextSeen.has(f.icao24)) {
        nextSeen.add(f.icao24);
        newAlerts.push({
          id: `${f.icao24}-${Date.now()}`,
          registration: f.callsign || f.fleetMetadata?.registration || 'Training Aircraft',
          model: f.model || f.fleetMetadata?.aircraftModel || 'Piper PA-28',
          operator: f.operator || f.fleetMetadata?.operator || 'Skynex Aero',
          flight: f,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    if (newAlerts.length > 0) {
      setSeenHexes(nextSeen);
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 3)); // Keep at most 3 alerts
    }
  }, [flights]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-40 space-y-2 pointer-events-auto max-w-sm">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="bg-space-950/95 border border-cyan-500/60 rounded-lg p-3 shadow-2xl shadow-cyan-950/50 backdrop-blur-md font-sans text-xs text-white transition-all transform animate-in slide-in-from-right"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 text-cyan-400 font-mono font-bold">
              <Plane className="w-4 h-4 animate-bounce" />
              <span>NORTH MAHARASHTRA TRAINING AIRBORNE</span>
              <span className="text-[10px] text-gray-400 font-normal">({alert.timestamp})</span>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-sm text-cyan-300">
                {alert.registration}
              </div>
              <div className="text-[11px] text-gray-300">
                {alert.model} • <span className="text-emerald-400">{alert.operator}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onFlyToFlight(alert.flight);
                dismissAlert(alert.id);
              }}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-[11px] font-semibold flex items-center space-x-1 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              <span>TRACK</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
