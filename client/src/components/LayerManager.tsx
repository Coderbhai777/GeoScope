import React, { useState } from 'react';
import type { LayerConfig, DisasterSummaryCounts } from '../types';
import { 
  Plane, 
  Activity, 
  Flame, 
  Orbit, 
  CloudRain, 
  Globe2, 
  Eye, 
  EyeOff, 
  Sliders,
  Sparkles,
  Wind,
  Mountain,
  Waves,
  Sun,
  Zap,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

interface LayerManagerProps {
  layers: Record<string, LayerConfig>;
  onToggleLayer: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  flightCount: number;
  quakeCount: number;
  disasterCount: number;
  satCount: number;
  disasterCounts?: DisasterSummaryCounts | null;
  disasterCategoryFilter?: Record<string, boolean>;
  onToggleDisasterCategory?: (cat: string) => void;
  disasterAlertFilter?: string;
  onSetDisasterAlertFilter?: (filter: string) => void;
  onOpenDisasterDashboard?: () => void;
  showNmimsFleet?: boolean;
  onToggleNmimsFleet?: () => void;
  showCommercialFlights?: boolean;
  onToggleCommercialFlights?: () => void;
  nmimsAirborneCount?: number;
  onOpenNmimsWatchlist?: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  onToggleLayer,
  onOpacityChange,
  searchQuery,
  onSearchChange,
  flightCount,
  quakeCount,
  disasterCount,
  satCount,
  disasterCounts,
  disasterCategoryFilter,
  onToggleDisasterCategory,
  disasterAlertFilter = 'ALL',
  onSetDisasterAlertFilter,
  onOpenDisasterDashboard,
  showNmimsFleet = true,
  onToggleNmimsFleet,
  showCommercialFlights = true,
  onToggleCommercialFlights,
  nmimsAirborneCount = 0,
  onOpenNmimsWatchlist,
}) => {
  const [disasterSubmenuOpen, setDisasterSubmenuOpen] = useState(true);
  const getIcon = (id: string) => {
    switch (id) {
      case 'flights': return <Plane className="w-4 h-4 text-yellow-400" />;
      case 'earthquakes': return <Activity className="w-4 h-4 text-amber-400" />;
      case 'disasters': return <Flame className="w-4 h-4 text-red-400" />;
      case 'satellites': return <Orbit className="w-4 h-4 text-emerald-400" />;
      case 'weather': return <CloudRain className="w-4 h-4 text-purple-400" />;
      default: return <Globe2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDynamicCount = (id: string) => {
    switch (id) {
      case 'flights': return flightCount;
      case 'earthquakes': return quakeCount;
      case 'disasters': return disasterCount;
      case 'satellites': return satCount;
      default: return 0;
    }
  };

  const filteredLayers = Object.values(layers).filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-space-950/80 backdrop-blur-md border-r border-cyan-500/20 w-80 text-gray-200 select-none">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe2 className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span className="font-mono font-bold tracking-wider text-sm text-cyan-300">INTELLIGENCE LAYERS</span>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
          {Object.values(layers).filter(l => l.enabled).length}/{Object.keys(layers).length} ACTIVE
        </span>
      </div>

      <div className="p-3 border-b border-white/5">
        <input
          type="text"
          placeholder="Filter layers by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-space-900/90 border border-white/10 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredLayers.map((layer) => {
          const count = getDynamicCount(layer.id);
          return (
            <div
              key={layer.id}
              className={`rounded-lg border p-3 transition-all duration-200 ${
                layer.enabled
                  ? 'bg-space-900/90 border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                  : 'bg-space-900/40 border-white/5 opacity-60 hover:opacity-85'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded bg-white/5 border border-white/10">
                    {getIcon(layer.id)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-100 flex items-center space-x-1.5">
                      <span>{layer.name}</span>
                      {layer.enabled && count > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950 text-cyan-400 rounded-full border border-cyan-500/30">
                          {count.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize">{layer.category}</div>
                  </div>
                </div>

                <button
                  onClick={() => onToggleLayer(layer.id)}
                  className={`p-1.5 rounded transition-colors ${
                    layer.enabled 
                      ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title={layer.enabled ? "Disable layer" : "Enable layer"}
                >
                  {layer.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-gray-400 mb-2 leading-relaxed">
                {layer.description}
              </div>

              {layer.enabled && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      <span>OPACITY</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <span className="w-8 text-right text-cyan-300">{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  </div>

                  {layer.id === 'flights' && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                      {onOpenNmimsWatchlist && (
                        <button
                          onClick={onOpenNmimsWatchlist}
                          className="w-full py-1.5 px-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/40 rounded text-[11px] font-mono font-semibold text-cyan-200 flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-950/40"
                        >
                          <Plane className="w-3.5 h-3.5 text-cyan-400" />
                          <span>NORTH MAHARASHTRA AVIATION</span>
                        </button>
                      )}

                      <div className="space-y-1.5 pt-1">
                        {/* North Maharashtra Training Fleet Toggle */}
                        <div
                          onClick={onToggleNmimsFleet}
                          className={`flex items-center justify-between p-1.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                            showNmimsFleet ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/40 shadow-sm' : 'bg-transparent text-gray-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="font-semibold">Skynex Training Fleet</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                              {nmimsAirborneCount} AIRBORNE
                            </span>
                            {showNmimsFleet ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-gray-500" />}
                          </div>
                        </div>

                        {/* Commercial Flights Toggle */}
                        <div
                          onClick={onToggleCommercialFlights}
                          className={`flex items-center justify-between p-1.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                            showCommercialFlights ? 'bg-white/5 text-gray-200 hover:bg-white/10' : 'bg-transparent text-gray-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <Plane className="w-3 h-3 text-yellow-400" />
                            <span>Commercial Traffic</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-gray-400">
                              {Math.max(0, flightCount - nmimsAirborneCount).toLocaleString()}
                            </span>
                            {showCommercialFlights ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-gray-500" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {layer.id === 'disasters' && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                      {onOpenDisasterDashboard && (
                        <button
                          onClick={onOpenDisasterDashboard}
                          className="w-full py-1.5 px-2 bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/50 hover:to-amber-600/50 border border-red-500/40 rounded text-[11px] font-mono font-semibold text-red-200 flex items-center justify-center space-x-2 transition-all shadow-md shadow-red-950/40"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-red-400" />
                          <span>DISASTER COMMAND CENTER</span>
                        </button>
                      )}

                      <div>
                        <button
                          onClick={() => setDisasterSubmenuOpen(!disasterSubmenuOpen)}
                          className="w-full flex items-center justify-between text-[10px] font-mono text-gray-400 hover:text-cyan-300 py-1"
                        >
                          <span className="flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span className="tracking-wide">HAZARD SUB-CATEGORIES</span>
                          </span>
                          {disasterSubmenuOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>

                        {disasterSubmenuOpen && (
                          <div className="mt-1 space-y-1.5 pl-1">
                            {/* Alert Level Filter */}
                            <div className="flex items-center justify-between text-[9px] font-mono bg-black/40 p-1 rounded border border-white/5">
                              <span className="text-gray-400">ALERT LEVEL:</span>
                              <div className="flex space-x-1">
                                {(['ALL', 'ORANGE', 'RED'] as const).map((lvl) => (
                                  <button
                                    key={lvl}
                                    onClick={() => onSetDisasterAlertFilter && onSetDisasterAlertFilter(lvl)}
                                    className={`px-1.5 py-0.5 rounded transition-all ${
                                      disasterAlertFilter === lvl
                                        ? lvl === 'RED'
                                          ? 'bg-red-600 text-white font-bold'
                                          : lvl === 'ORANGE'
                                          ? 'bg-amber-600 text-white font-bold'
                                          : 'bg-cyan-600 text-white font-bold'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Subcategories list */}
                            {[
                              { id: 'cyclones', label: 'Cyclones & Storms', icon: <Wind className="w-3 h-3 text-cyan-400" />, count: disasterCounts?.cyclones || 0 },
                              { id: 'volcanoes', label: 'Active Volcanoes', icon: <Mountain className="w-3 h-3 text-red-500" />, count: disasterCounts?.volcanoes || 0 },
                              { id: 'wildfires', label: 'Wildfires & Fires', icon: <Flame className="w-3 h-3 text-orange-400" />, count: disasterCounts?.wildfires || 0 },
                              { id: 'floods', label: 'Severe Floods', icon: <Waves className="w-3 h-3 text-blue-400" />, count: disasterCounts?.floods || 0 },
                              { id: 'droughts', label: 'Drought Regions', icon: <Sun className="w-3 h-3 text-amber-500" />, count: disasterCounts?.droughts || 0 },
                              { id: 'severeStorms', label: 'Severe Weather', icon: <Zap className="w-3 h-3 text-yellow-400" />, count: disasterCounts?.severeStorms || 0 },
                              { id: 'tsunamis', label: 'Tsunami Bulletins', icon: <AlertTriangle className="w-3 h-3 text-emerald-400" />, count: disasterCounts?.tsunamis || 0 },
                            ].map((subcat) => {
                              const isEnabled = disasterCategoryFilter ? disasterCategoryFilter[subcat.id] !== false : true;
                              return (
                                <div
                                  key={subcat.id}
                                  onClick={() => onToggleDisasterCategory && onToggleDisasterCategory(subcat.id)}
                                  className={`flex items-center justify-between p-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                                    isEnabled ? 'bg-white/5 text-gray-200 hover:bg-white/10' : 'bg-transparent text-gray-500 opacity-50 hover:opacity-75'
                                  }`}
                                >
                                  <div className="flex items-center space-x-1.5 truncate">
                                    {subcat.icon}
                                    <span className="truncate">{subcat.label}</span>
                                  </div>
                                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/50 text-gray-400">
                                      {subcat.count}
                                    </span>
                                    {isEnabled ? (
                                      <Eye className="w-3 h-3 text-cyan-400" />
                                    ) : (
                                      <EyeOff className="w-3 h-3 text-gray-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10 bg-space-950/90 text-xs font-mono flex items-center justify-between text-gray-400">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>DATA FEEDS ACTIVE</span>
        </span>
        <span className="text-emerald-400 font-bold">LIVE SYNC</span>
      </div>
    </div>
  );
};
