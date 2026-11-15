import React, { useState } from 'react';
import type { Disaster, DisasterProviderReport, DisasterSummaryCounts } from '../types';
import { 
  X, 
  Flame, 
  Wind, 
  Waves, 
  Mountain, 
  Sun, 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Clock, 
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

interface DisasterDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  disasters: Disaster[];
  counts: DisasterSummaryCounts | null;
  providers: DisasterProviderReport[];
  onFlyToLocation: (target: { lat: number; lon: number; height: number; title: string }) => void;
  onSelectEvent: (event: Disaster) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const DisasterDashboardModal: React.FC<DisasterDashboardModalProps> = ({
  isOpen,
  onClose,
  disasters,
  counts,
  providers,
  onFlyToLocation,
  onSelectEvent,
  onRefresh,
  isRefreshing,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'diagnostics'>('events');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'RED' | 'ORANGE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const totalEvents = counts?.total || disasters.length;
  const redAlerts = counts?.redAlerts || disasters.filter(d => d.alertLevel === 'Red').length;
  const orangeAlerts = counts?.orangeAlerts || disasters.filter(d => d.alertLevel === 'Orange').length;
  const cyclones = counts?.cyclones || disasters.filter(d => d.category === 'cyclones').length;
  const floods = counts?.floods || disasters.filter(d => d.category === 'floods').length;
  const volcanoes = counts?.volcanoes || disasters.filter(d => d.category === 'volcanoes').length;
  const wildfires = counts?.wildfires || disasters.filter(d => d.category === 'wildfires').length;
  const droughts = counts?.droughts || disasters.filter(d => d.category === 'droughts').length;

  const filteredEvents = disasters.filter(d => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (alertFilter === 'RED' && d.alertLevel !== 'Red') return false;
    if (alertFilter === 'ORANGE' && d.alertLevel !== 'Orange') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchCountry = d.country?.toLowerCase().includes(q);
      const matchCat = d.categoryName?.toLowerCase().includes(q);
      return matchTitle || matchCountry || matchCat;
    }
    return true;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'cyclones': return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'volcanoes': return <Mountain className="w-4 h-4 text-rose-500" />;
      case 'wildfires': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'floods': return <Waves className="w-4 h-4 text-blue-400" />;
      case 'droughts': return <Sun className="w-4 h-4 text-amber-500" />;
      case 'severeStorms': return <Zap className="w-4 h-4 text-indigo-400" />;
      case 'tsunamis': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <ShieldAlert className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-space-950 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-space-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 shadow-lg shadow-red-950/50">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono tracking-wider text-white">
                  GLOBAL NATURAL DISASTER INTELLIGENCE COMMAND
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                  MULTI-AGENCY LIVE
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Real-Time Ingestion: NASA EONET • GDACS (UN/EC) • NOAA Tsunami.gov • NASA FIRMS
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>SYNC FEEDS</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-4 bg-space-900/40 border-b border-white/5 font-mono">
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-white/10 flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase">TRACKED HAZARDS</span>
            <span className="text-lg font-black text-cyan-400 mt-0.5">{totalEvents}</span>
          </div>
          <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-500/40 flex flex-col">
            <span className="text-[10px] text-red-300 uppercase font-bold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
              <span>RED ALERTS</span>
            </span>
            <span className="text-lg font-black text-red-400 mt-0.5">{redAlerts}</span>
          </div>
          <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30 flex flex-col">
            <span className="text-[10px] text-amber-300 uppercase">ORANGE ALERTS</span>
            <span className="text-lg font-black text-amber-400 mt-0.5">{orangeAlerts}</span>
          </div>
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-cyan-500/20 flex flex-col">
            <span className="text-[10px] text-cyan-300 uppercase flex items-center space-x-1">
              <Wind className="w-3 h-3 text-cyan-400" />
              <span>CYCLONES</span>
            </span>
            <span className="text-lg font-black text-cyan-400 mt-0.5">{cyclones}</span>
          </div>
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-blue-500/20 flex flex-col">
            <span className="text-[10px] text-blue-300 uppercase flex items-center space-x-1">
              <Waves className="w-3 h-3 text-blue-400" />
              <span>FLOODS</span>
            </span>
            <span className="text-lg font-black text-blue-400 mt-0.5">{floods}</span>
          </div>
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-rose-500/20 flex flex-col">
            <span className="text-[10px] text-rose-300 uppercase flex items-center space-x-1">
              <Mountain className="w-3 h-3 text-rose-400" />
              <span>VOLCANOES</span>
            </span>
            <span className="text-lg font-black text-rose-400 mt-0.5">{volcanoes}</span>
          </div>
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-orange-500/20 flex flex-col">
            <span className="text-[10px] text-orange-300 uppercase flex items-center space-x-1">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>WILDFIRES</span>
            </span>
            <span className="text-lg font-black text-orange-400 mt-0.5">{wildfires}</span>
          </div>
          <div className="bg-space-900/80 p-2.5 rounded-xl border border-amber-500/20 flex flex-col">
            <span className="text-[10px] text-amber-300 uppercase flex items-center space-x-1">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>DROUGHTS</span>
            </span>
            <span className="text-lg font-black text-amber-400 mt-0.5">{droughts}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 py-2 border-b border-white/10 flex items-center justify-between bg-space-950 font-mono">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'events'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              LIVE DISASTER FEED ({filteredEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              PROVIDER DIAGNOSTICS & STATUS
            </button>
          </div>

          {activeTab === 'events' && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-space-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                <input
                  type="text"
                  placeholder="Filter by event title, country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-52"
                />
              </div>

              {/* Alert Level Pill */}
              <div className="flex items-center space-x-1 bg-space-900 border border-white/10 p-0.5 rounded-lg text-[10px]">
                <button
                  onClick={() => setAlertFilter('ALL')}
                  className={`px-2 py-0.5 rounded ${alertFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400'}`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setAlertFilter('RED')}
                  className={`px-2 py-0.5 rounded ${alertFilter === 'RED' ? 'bg-red-500/30 text-red-300 font-bold' : 'text-gray-400'}`}
                >
                  RED
                </button>
                <button
                  onClick={() => setAlertFilter('ORANGE')}
                  className={`px-2 py-0.5 rounded ${alertFilter === 'ORANGE' ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-gray-400'}`}
                >
                  ORANGE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter Chips Bar */}
        {activeTab === 'events' && (
          <div className="px-6 py-2 bg-space-900/50 border-b border-white/5 flex items-center space-x-2 overflow-x-auto text-[11px] font-mono">
            <span className="text-gray-400 flex items-center space-x-1 text-[10px] mr-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>CATEGORY:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Hazards' },
              { id: 'cyclones', label: `Cyclones (${cyclones})` },
              { id: 'volcanoes', label: `Volcanoes (${volcanoes})` },
              { id: 'floods', label: `Floods (${floods})` },
              { id: 'wildfires', label: `Wildfires (${wildfires})` },
              { id: 'droughts', label: `Droughts (${droughts})` },
              { id: 'severeStorms', label: 'Severe Storms' },
              { id: 'tsunamis', label: 'Tsunamis' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold'
                    : 'bg-space-900 hover:bg-space-800 text-gray-400 border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab 1: Live Disaster Event Table */}
        {activeTab === 'events' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono">
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                No natural disaster events match your active filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEvents.map(event => {
                  const isRed = event.alertLevel === 'Red';
                  const isOrange = event.alertLevel === 'Orange';

                  return (
                    <div
                      key={event.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isRed
                          ? 'bg-red-950/20 border-red-500/50 hover:border-red-400 shadow-lg shadow-red-950/20'
                          : isOrange
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                          : 'bg-space-900/60 border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(event.category)}
                            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
                              {event.categoryName}
                            </span>
                            <span className="text-[10px] text-gray-400 px-1.5 py-0.2 rounded bg-white/5">
                              {event.source}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                isRed
                                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse'
                                  : isOrange
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {event.alertLevel} ALERT
                            </span>
                          </div>
                        </div>

                        <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">
                          {event.title}
                        </h3>

                        {event.country && (
                          <div className="text-[11px] text-cyan-300 font-semibold mt-1">
                            📍 {event.country}
                          </div>
                        )}

                        {event.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 font-sans">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
                        <div>
                          <span>COORD: <b className="text-white">{event.lat.toFixed(2)}°, {event.lon.toFixed(2)}°</b></span>
                          <span className="mx-2">•</span>
                          <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onFlyToLocation({
                                lat: event.lat,
                                lon: event.lon,
                                height: 80000,
                                title: event.title
                              });
                              onSelectEvent(event);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Fly 3D Globe camera to this disaster event"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>FOCUS GLOBE</span>
                          </button>

                          {event.sourceUrl && (
                            <a
                              href={event.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10"
                              title="Open original official report"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Provider Diagnostics & Health Table */}
        {activeTab === 'diagnostics' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono">
            <div className="p-4 bg-space-900/60 rounded-xl border border-white/10">
              <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1">
                DISASTER DATA ENGINE HEALTH & INTEGRATION STATUS
              </h3>
              <p className="text-[11px] text-gray-400 font-sans">
                Each independent disaster adapter is monitored in real-time. Verified responses from official agencies are aggregated with exponential backoff and rate-limit preservation.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-space-900/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-space-900 border-b border-white/10 text-gray-400 text-[10px] uppercase">
                    <th className="py-3 px-4">Provider Agency</th>
                    <th className="py-3 px-4">Operational Status</th>
                    <th className="py-3 px-4">Events Ingested</th>
                    <th className="py-3 px-4">Last Sync Timestamp</th>
                    <th className="py-3 px-4">Diagnostics / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {providers.map(p => {
                    const isOnline = p.status === 'ONLINE';
                    const isNotConfig = p.status === 'NOT_CONFIGURED';

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {p.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isOnline
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isNotConfig
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : isNotConfig ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-cyan-300 font-bold">
                          {p.eventsReceived.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {p.lastSync ? new Date(p.lastSync).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
                          {p.error ? (
                            <span className="text-amber-400 font-sans text-[11px]">{p.error}</span>
                          ) : p.note ? (
                            <span className="text-gray-400 font-sans text-[11px]">{p.note}</span>
                          ) : (
                            <span className="text-emerald-400 font-sans text-[11px]">Healthy & Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* NASA FIRMS Configuration Guidance */}
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>NASA FIRMS VIIRS/MODIS SATELLITE HOTSPOTS CONFIGURATION</span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                NASA FIRMS provides direct thermal hotspot satellite detections. To enable FIRMS live VIIRS feeds, obtain a free API key at{' '}
                <a
                  href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  firms.modaps.eosdis.nasa.gov/api/map_key/
                </a>{' '}
                and set <code className="bg-space-900 px-1 py-0.5 rounded text-amber-300 font-mono">FIRMS_MAP_KEY=your_key</code> in your server environment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
