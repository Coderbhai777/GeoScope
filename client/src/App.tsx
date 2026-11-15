import React, { useState, useEffect } from 'react';
import { CesiumGlobe } from './components/CesiumGlobe';
import { LayerManager } from './components/LayerManager';
import { DetailDrawer } from './components/DetailDrawer';
import { MissionControlHeader } from './components/MissionControlHeader';
import { BottomTelemetryBar } from './components/BottomTelemetryBar';
import { DisasterDashboardModal } from './components/DisasterDashboardModal';
import { NorthMaharashtraAviationModal } from './components/NorthMaharashtraAviationModal';
import { DetectionAlerts } from './components/DetectionAlerts';
import { CockpitHudOverlay } from './components/CockpitHudOverlay';
import type { 
  Flight, 
  Earthquake, 
  Disaster, 
  SatelliteTrack, 
  SelectedEntity, 
  LayerConfig,
  DisasterSummaryCounts,
  DisasterProviderReport,
  NorthMaharashtraReport,
  PilotViewMode
} from './types';
import { 
  fetchLiveFlights, 
  fetchLiveEarthquakes, 
  fetchLiveDisasters, 
  fetchLiveSatellites,
  fetchNorthMaharashtraAviationReport
} from './services/api';

const INITIAL_LAYERS: Record<string, LayerConfig> = {
  flights: {
    id: 'flights',
    name: 'Worldwide Flights (ADS-B / Gateway)',
    category: 'aviation',
    enabled: true,
    opacity: 0.9,
    count: 0,
    color: '#00F0FF',
    iconName: 'plane',
    description: 'Real-time civilian and commercial aircraft tracking via Flightradar24 web feed and ADS-B multi-provider gateway.'
  },
  earthquakes: {
    id: 'earthquakes',
    name: 'USGS Earthquakes (24h)',
    category: 'seismic',
    enabled: true,
    opacity: 0.8,
    count: 0,
    color: '#F59E0B',
    iconName: 'activity',
    description: 'Seismic events from the United States Geological Survey real-time feeds.'
  },
  disasters: {
    id: 'disasters',
    name: 'Natural Disasters (NASA & GDACS)',
    category: 'disaster',
    enabled: true,
    opacity: 0.85,
    count: 0,
    color: '#EF4444',
    iconName: 'flame',
    description: 'NASA Earth Observatory Natural Event Tracker (wildfires, volcanoes, cyclones, severe storms).'
  },
  satellites: {
    id: 'satellites',
    name: 'Satellites & ISS (SGP4)',
    category: 'space',
    enabled: true,
    opacity: 1.0,
    count: 0,
    color: '#10B981',
    iconName: 'orbit',
    description: 'CelesTrak NORAD orbital propagation of space stations, weather, and science satellites.'
  }
};

export const App: React.FC = () => {
  const [layers, setLayers] = useState<Record<string, LayerConfig>>(INITIAL_LAYERS);
  const [layerSearch, setLayerSearch] = useState('');
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [satellites, setSatellites] = useState<SatelliteTrack[]>([]);
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [coordinates, setCoordinates] = useState({ lat: 0, lon: 0, height: 18000000 });
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lon: number; height: number; title?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Natural Disaster Engine state
  const [isDisasterDashboardOpen, setIsDisasterDashboardOpen] = useState(false);
  const [disasterCounts, setDisasterCounts] = useState<DisasterSummaryCounts | null>(null);
  const [disasterProviders, setDisasterProviders] = useState<DisasterProviderReport[]>([]);
  const [disasterCategoryFilter, setDisasterCategoryFilter] = useState<Record<string, boolean>>({
    cyclones: true,
    volcanoes: true,
    wildfires: true,
    floods: true,
    droughts: true,
    severeStorms: true,
    tsunamis: true,
    earthquakes: true,
  });
  const [disasterAlertFilter, setDisasterAlertFilter] = useState<string>('ALL');

  // North Maharashtra Aviation state
  const [isNorthMaharashtraOpen, setIsNorthMaharashtraOpen] = useState(false);
  const [northMaharashtraReport, setNorthMaharashtraReport] = useState<NorthMaharashtraReport | null>(null);
  const [showNmimsFleet, setShowNmimsFleet] = useState(true);
  const [showCommercialFlights, setShowCommercialFlights] = useState(true);

  // Pilot's View / Cockpit Camera Mode state
  const [pilotViewFlight, setPilotViewFlight] = useState<Flight | null>(null);
  const [pilotViewMode, setPilotViewMode] = useState<PilotViewMode | null>(null);

  const handleEnterPilotView = (flight: Flight) => {
    setPilotViewFlight(flight);
    setPilotViewMode('COCKPIT');
  };

  const handleExitPilotView = () => {
    setPilotViewFlight(null);
    setPilotViewMode(null);
  };

  const trainingAirborneCount = flights.filter(f => f.isNorthMaharashtraTraining || f.fleetMetadata?.isNorthMaharashtraTraining).length;

  const refreshAllFeeds = async () => {
    setIsRefreshing(true);
    try {
      const [flightRes, quakeRes, disasterRes, satRes, trainingRes] = await Promise.allSettled([
        fetchLiveFlights(),
        fetchLiveEarthquakes('all_day'),
        fetchLiveDisasters(),
        fetchLiveSatellites(),
        fetchNorthMaharashtraAviationReport(),
      ]);

      if (flightRes.status === 'fulfilled' && flightRes.value.flights) {
        setFlights(flightRes.value.flights);
      }
      if (quakeRes.status === 'fulfilled' && quakeRes.value.earthquakes) {
        setEarthquakes(quakeRes.value.earthquakes);
      }
      if (disasterRes.status === 'fulfilled' && disasterRes.value.disasters) {
        setDisasters(disasterRes.value.disasters);
        if (disasterRes.value.counts) setDisasterCounts(disasterRes.value.counts);
        if (disasterRes.value.providers) setDisasterProviders(disasterRes.value.providers);
      }
      if (satRes.status === 'fulfilled' && satRes.value.satellites) {
        setSatellites(satRes.value.satellites);
      }
      if (trainingRes.status === 'fulfilled') {
        setNorthMaharashtraReport(trainingRes.value);
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error fetching feeds:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAllFeeds();

    const flightTimer = setInterval(() => {
      fetchLiveFlights().then(res => {
        if (res.flights && res.flights.length > 0) setFlights(res.flights);
      }).catch(console.warn);

      fetchNorthMaharashtraAviationReport().then(rep => setNorthMaharashtraReport(rep)).catch(console.warn);
    }, 6000);

    const satTimer = setInterval(() => {
      fetchLiveSatellites().then(res => {
        if (res.satellites) setSatellites(res.satellites);
      }).catch(console.warn);
    }, 6000);

    const eventTimer = setInterval(() => {
      fetchLiveEarthquakes('all_day').then(res => {
        if (res.earthquakes) setEarthquakes(res.earthquakes);
      }).catch(console.warn);

      fetchLiveDisasters().then(res => {
        if (res.disasters) {
          setDisasters(res.disasters);
          if (res.counts) setDisasterCounts(res.counts);
          if (res.providers) setDisasterProviders(res.providers);
        }
      }).catch(console.warn);
    }, 120000);

    return () => {
      clearInterval(flightTimer);
      clearInterval(satTimer);
      clearInterval(eventTimer);
    };
  }, []);

  const handleToggleLayer = (id: string) => {
    setLayers(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled }
    }));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers(prev => ({
      ...prev,
      [id]: { ...prev[id], opacity }
    }));
  };

  const handleToggleDisasterCategory = (cat: string) => {
    setDisasterCategoryFilter(prev => ({
      ...prev,
      [cat]: prev[cat] === false ? true : false
    }));
  };


  const handleSearchSelectCity = (target: { lat: number; lon: number; height: number; title: string }) => {
    setCoordinates({ lat: target.lat, lon: target.lon, height: target.height });
    setCameraTarget({ ...target });
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-space-950 text-gray-100 overflow-hidden font-sans">
      <MissionControlHeader
        onSearchSelect={handleSearchSelectCity}
        flightCount={flights.length}
        lastUpdated={lastUpdated}
        onRefresh={refreshAllFeeds}
        isRefreshing={isRefreshing}
        flights={flights}
        onOpenNmimsWatchlist={() => setIsNorthMaharashtraOpen(true)}
      />

      <div className="flex-1 relative flex overflow-hidden">
        <LayerManager
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onOpacityChange={handleOpacityChange}
          searchQuery={layerSearch}
          onSearchChange={setLayerSearch}
          flightCount={flights.length}
          quakeCount={earthquakes.length}
          disasterCount={disasters.length}
          satCount={satellites.length}
          disasterCounts={disasterCounts}
          disasterCategoryFilter={disasterCategoryFilter}
          onToggleDisasterCategory={handleToggleDisasterCategory}
          disasterAlertFilter={disasterAlertFilter}
          onSetDisasterAlertFilter={setDisasterAlertFilter}
          onOpenDisasterDashboard={() => setIsDisasterDashboardOpen(true)}
          showNmimsFleet={showNmimsFleet}
          onToggleNmimsFleet={() => setShowNmimsFleet(prev => !prev)}
          showCommercialFlights={showCommercialFlights}
          onToggleCommercialFlights={() => setShowCommercialFlights(prev => !prev)}
          nmimsAirborneCount={trainingAirborneCount}
          onOpenNmimsWatchlist={() => setIsNorthMaharashtraOpen(true)}
        />

        <div className="flex-1 relative h-full">
          <CesiumGlobe
            layers={layers}
            flights={flights}
            earthquakes={earthquakes}
            disasters={disasters}
            satellites={satellites}
            selectedEntity={selectedEntity}
            cameraTarget={cameraTarget}
            disasterCategoryFilter={disasterCategoryFilter}
            disasterAlertFilter={disasterAlertFilter}
            showNmimsFleet={showNmimsFleet}
            showCommercialFlights={showCommercialFlights}
            pilotViewFlight={pilotViewFlight}
            pilotViewMode={pilotViewMode}
            onSelectEntity={setSelectedEntity}
            onCoordinatesChange={setCoordinates}
          />

          {/* Cockpit HUD Overlay when in Pilot View Mode */}
          {pilotViewFlight && pilotViewMode && (
            <CockpitHudOverlay
              flight={flights.find(f => (f.icao24 && f.icao24.toLowerCase() === pilotViewFlight.icao24?.toLowerCase()) || f.callsign === pilotViewFlight.callsign) || pilotViewFlight}
              viewMode={pilotViewMode}
              onSetViewMode={setPilotViewMode}
              onExit={handleExitPilotView}
            />
          )}

          <DetailDrawer
            selectedEntity={selectedEntity}
            onClose={() => setSelectedEntity(null)}
            onFlyToLocation={(coords) => setCameraTarget(coords)}
            onEnterPilotView={handleEnterPilotView}
          />

          <DisasterDashboardModal
            isOpen={isDisasterDashboardOpen}
            onClose={() => setIsDisasterDashboardOpen(false)}
            disasters={disasters}
            counts={disasterCounts}
            providers={disasterProviders}
            onFlyToLocation={(target) => setCameraTarget(target)}
            onSelectEvent={(d) => {
              setSelectedEntity({ type: 'disaster', data: d });
              setCameraTarget({ lat: d.lat, lon: d.lon, height: 1200000, title: d.title });
            }}
            onRefresh={refreshAllFeeds}
            isRefreshing={isRefreshing}
          />

          <NorthMaharashtraAviationModal
            isOpen={isNorthMaharashtraOpen}
            onClose={() => setIsNorthMaharashtraOpen(false)}
            report={northMaharashtraReport}
            onFlyToAircraft={(ac) => {
              if (ac.live) setCameraTarget({ lat: ac.live.lat, lon: ac.live.lon, height: 15000, title: ac.registration });
            }}
            onFlyToAirport={(airport) => {
              setCameraTarget({ lat: airport.lat, lon: airport.lon, height: airport.height, title: airport.title });
            }}
            onSelectFlight={(f) => {
              setSelectedEntity({ type: 'flight', data: f });
              setCameraTarget({ lat: f.lat, lon: f.lon, height: 15000, title: f.callsign });
            }}
            onEnterPilotView={handleEnterPilotView}
          />

          <DetectionAlerts
            flights={flights}
            onFlyToFlight={(f) => {
              setSelectedEntity({ type: 'flight', data: f });
              setCameraTarget({ lat: f.lat, lon: f.lon, height: 15000, title: f.callsign });
            }}
          />
        </div>
      </div>

      <BottomTelemetryBar
        coordinates={coordinates}
        flightCount={flights.length}
        quakeCount={earthquakes.length}
        disasterCount={disasters.length}
        satCount={satellites.length}
      />
    </div>
  );
};

export default App;
