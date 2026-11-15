import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Plus, Minus, Compass, Globe, Navigation, Layers, Check } from 'lucide-react';
import type { Flight, Earthquake, Disaster, SatelliteTrack, SelectedEntity, LayerConfig, PilotViewMode, BasemapMode } from '../types';

interface CesiumGlobeProps {
  layers: Record<string, LayerConfig>;
  flights: Flight[];
  earthquakes: Earthquake[];
  disasters: Disaster[];
  satellites: SatelliteTrack[];
  selectedEntity: SelectedEntity;
  cameraTarget?: { lat: number; lon: number; height: number; title?: string } | null;
  disasterCategoryFilter?: Record<string, boolean>;
  disasterAlertFilter?: string;
  showNmimsFleet?: boolean;
  showCommercialFlights?: boolean;
  pilotViewFlight?: Flight | null;
  pilotViewMode?: PilotViewMode | null;
  onSelectEntity: (entity: SelectedEntity) => void;
  onCoordinatesChange: (coords: { lat: number; lon: number; height: number }) => void;
}

function getDisasterVisuals(d: Disaster) {
  let color = Cesium.Color.fromCssColorString('#F59E0B');
  let pixelSize = 10;
  let icon = '⚠️';

  switch (d.category) {
    case 'cyclones':
      color = Cesium.Color.fromCssColorString('#0284C7'); // Deep sky blue
      pixelSize = 15;
      icon = '🌀';
      break;
    case 'volcanoes':
      color = Cesium.Color.fromCssColorString('#DC2626'); // Volcanic crimson
      pixelSize = 13;
      icon = '🌋';
      break;
    case 'wildfires':
      color = Cesium.Color.fromCssColorString('#EA580C'); // Fire orange
      pixelSize = 10;
      icon = '🔥';
      break;
    case 'floods':
      color = Cesium.Color.fromCssColorString('#2563EB'); // Azure flood
      pixelSize = 12;
      icon = '🌊';
      break;
    case 'droughts':
      color = Cesium.Color.fromCssColorString('#D97706'); // Drought amber
      pixelSize = 11;
      icon = '🏜️';
      break;
    case 'tsunamis':
      color = Cesium.Color.fromCssColorString('#06B6D4'); // Cyan tsunami beacon
      pixelSize = 16;
      icon = '⚠️';
      break;
    case 'severeStorms':
      color = Cesium.Color.fromCssColorString('#6366F1'); // Storm indigo
      pixelSize = 11;
      icon = '⚡';
      break;
    default:
      color = Cesium.Color.fromCssColorString('#E11D48');
      pixelSize = 10;
      icon = '⚠️';
      break;
  }

  let outlineColor = Cesium.Color.WHITE;
  let outlineWidth = 1.5;

  if (d.alertLevel === 'Red') {
    outlineColor = Cesium.Color.fromCssColorString('#EF4444');
    outlineWidth = 2.5;
    pixelSize += 3;
  } else if (d.alertLevel === 'Orange') {
    outlineColor = Cesium.Color.fromCssColorString('#F59E0B');
    outlineWidth = 2.0;
    pixelSize += 1;
  }

  return { color, pixelSize, outlineColor, outlineWidth, icon };
}

// Aeris Altitude Color Palette Function
// Low altitude glows cyan/emerald -> Mid altitude transitions to amber/gold -> High jetway shifts to magenta/sky
function getAerisAltitudeColor(altitudeM: number): Cesium.Color {
  if (altitudeM < 1500) {
    return Cesium.Color.fromCssColorString('#48D2A0'); // 0-1,500m: Aeris Mint Green
  } else if (altitudeM < 4000) {
    return Cesium.Color.fromCssColorString('#A0C350'); // 1,500-4,000m: Lime/Yellow-Green
  } else if (altitudeM < 7000) {
    return Cesium.Color.fromCssColorString('#EB963C'); // 4,000-7,000m: Amber Orange
  } else if (altitudeM < 10000) {
    return Cesium.Color.fromCssColorString('#F06E50'); // 7,000-10,000m: Sunset Coral
  } else if (altitudeM < 12000) {
    return Cesium.Color.fromCssColorString('#DC5582'); // 10,000-12,000m: Hot Magenta
  } else {
    return Cesium.Color.fromCssColorString('#64AAF0'); // 12,000m+: Sky Blue Cruise
  }
}

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({
  layers,
  flights,
  earthquakes,
  disasters,
  satellites,
  selectedEntity,
  cameraTarget,
  disasterCategoryFilter,
  disasterAlertFilter,
  showNmimsFleet = true,
  showCommercialFlights = true,
  pilotViewFlight = null,
  pilotViewMode = null,
  onSelectEntity,
  onCoordinatesChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const flightBillboardsRef = useRef<Cesium.BillboardCollection | null>(null);
  const flightLabelsRef = useRef<Cesium.LabelCollection | null>(null);
  const flightTrailsRef = useRef<Cesium.PolylineCollection | null>(null);
  const quakePointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const disasterPointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
  const disasterLabelsRef = useRef<Cesium.LabelCollection | null>(null);
  const disasterPolylinesRef = useRef<Cesium.PolylineCollection | null>(null);
  const satPointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);

  // Flightradar24-style live hover telemetry state
  const [hoveredFlight, setHoveredFlight] = useState<{
    flight: Flight;
    x: number;
    y: number;
  } | null>(null);

  // Basemap & Satellite Layer Switching State
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('satellite');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const imageryLayersRef = useRef<{
    satelliteLayer?: Cesium.ImageryLayer;
    boundariesLayer?: Cesium.ImageryLayer;
    streetsLayer?: Cesium.ImageryLayer;
  }>({});

  // Real-Time Disaster Hover Telemetry State
  const [hoveredDisaster, setHoveredDisaster] = useState<{
    disaster: Disaster;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let viewer: Cesium.Viewer | null = null;
    let removeWheelListener: (() => void) | null = null;

    try {
      // 1. High-Resolution Esri World Imagery (Photorealistic Satellite Map)
      const esriSatellite = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: '© Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, and GIS User Community',
        maximumLevel: 19
      });

      // 2. High-Resolution Reference Boundaries, Roads & Places Overlay
      const esriBoundaries = new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        credit: '© Esri, HERE, Garmin, OpenStreetMap contributors',
        maximumLevel: 19
      });

      // 3. Cartographic Vector Street Basemap (CARTO Voyager)
      const cartoKey = 'cb1_592q_1_fc5270cbabd38f18d48f7b6e';
      const cartoStreet = new Cesium.UrlTemplateImageryProvider({
        url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`,
        credit: 'CARTO Basemaps & OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19
      });

      const satelliteLayer = new Cesium.ImageryLayer(esriSatellite);
      const boundariesLayer = new Cesium.ImageryLayer(esriBoundaries);
      const streetsLayer = new Cesium.ImageryLayer(cartoStreet);

      viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        scene3DOnly: true,
        shadows: false,
        shouldAnimate: true,
        baseLayer: satelliteLayer,
      });

      // Add overlay and alternate layers
      viewer.imageryLayers.add(boundariesLayer);
      boundariesLayer.show = false;

      viewer.imageryLayers.add(streetsLayer);
      streetsLayer.show = false;

      imageryLayersRef.current = {
        satelliteLayer,
        boundariesLayer,
        streetsLayer
      };

      viewerRef.current = viewer;

      const scene = viewer.scene;
      scene.globe.enableLighting = false; // High-clarity illumination across all latitudes & longitudes
      scene.globe.showGroundAtmosphere = true;
      scene.highDynamicRange = true;
      if (scene.skyAtmosphere) {
        scene.skyAtmosphere.show = true;
        scene.skyAtmosphere.atmosphereLightIntensity = 10.0;
      }
      if (scene.fog) {
        scene.fog.enabled = true;
        scene.fog.density = 0.00012;
        scene.fog.screenSpaceErrorFactor = 2.0;
      }

      // Configure smooth zooming and strict anti-subsurface camera collision boundaries
      // Floor of 150m allows close inspection of runways, terrain features, rivers, and cities in high resolution
      const MIN_CAMERA_ALTITUDE = 150.0;
      const MAX_CAMERA_ALTITUDE = 30000000.0;

      const ssc = scene.screenSpaceCameraController;
      ssc.enableZoom = true;
      ssc.enableRotate = true;
      ssc.enableTilt = true;
      ssc.enableTranslate = true;
      ssc.enableCollisionDetection = true; // STRICT: Prevents camera from passing underground into the globe
      ssc.minimumZoomDistance = MIN_CAMERA_ALTITUDE;
      ssc.maximumZoomDistance = MAX_CAMERA_ALTITUDE;
      ssc.inertiaZoom = 0.8;

      // Direct smooth wheel zooming listener on canvas with strict altitude clamping
      const canvas = scene.canvas;
      const onCanvasWheel = (e: WheelEvent) => {
        e.preventDefault();
        const camera = viewer?.camera;
        if (!camera) return;

        const currentHeight = camera.positionCartographic.height;
        if (e.deltaY < 0) {
          // Zoom In: Stop strictly at MIN_CAMERA_ALTITUDE (never penetrate globe surface)
          if (currentHeight <= MIN_CAMERA_ALTITUDE) return;
          const available = currentHeight - MIN_CAMERA_ALTITUDE;
          const step = Math.min(currentHeight * 0.20, available);
          if (step > 5) {
            camera.zoomIn(step);
          }
        } else {
          // Zoom Out: Stop at space orbit limit
          if (currentHeight >= MAX_CAMERA_ALTITUDE) return;
          camera.zoomOut(currentHeight * 0.20);
        }
      };
      canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
      removeWheelListener = () => {
        canvas.removeEventListener('wheel', onCanvasWheel);
      };

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 7000000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0,
        },
      });

      flightBillboardsRef.current = scene.primitives.add(new Cesium.BillboardCollection());
      flightLabelsRef.current = scene.primitives.add(new Cesium.LabelCollection());
      flightTrailsRef.current = scene.primitives.add(new Cesium.PolylineCollection());
      quakePointsRef.current = scene.primitives.add(new Cesium.PointPrimitiveCollection());
      disasterPointsRef.current = scene.primitives.add(new Cesium.PointPrimitiveCollection());
      disasterLabelsRef.current = scene.primitives.add(new Cesium.LabelCollection());
      disasterPolylinesRef.current = scene.primitives.add(new Cesium.PolylineCollection());
      satPointsRef.current = scene.primitives.add(new Cesium.PointPrimitiveCollection());

      const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

      // Mouse Move: Coordinates + Flight & Disaster Hover Detection
      handler.setInputAction((movement: any) => {
        try {
          // Update geographic coordinates under mouse
          const ray = viewer!.camera.getPickRay(movement.endPosition);
          if (ray) {
            const cartesian = scene.globe.pick(ray, scene);
            if (cartesian) {
              const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              onCoordinatesChange({
                lat: Cesium.Math.toDegrees(cartographic.latitude),
                lon: Cesium.Math.toDegrees(cartographic.longitude),
                height: Math.round(viewer!.camera.positionCartographic.height),
              });
            }
          }

          // Hover detection for aircraft and disasters
          const pickedObject = scene.pick(movement.endPosition);
          if (Cesium.defined(pickedObject) && pickedObject.primitive && pickedObject.primitive.id) {
            const pid = pickedObject.primitive.id;
            if (pid._geoScopeType === 'flight' && pid._geoScopeData) {
              scene.canvas.style.cursor = 'pointer';
              setHoveredFlight({
                flight: pid._geoScopeData.data,
                x: movement.endPosition.x,
                y: movement.endPosition.y,
              });
              setHoveredDisaster(null);
              return;
            }

            if (pid._geoScopeType === 'disaster' && pid._geoScopeData) {
              scene.canvas.style.cursor = 'pointer';
              setHoveredDisaster({
                disaster: pid._geoScopeData.data,
                x: movement.endPosition.x,
                y: movement.endPosition.y,
              });
              setHoveredFlight(null);
              return;
            }
          }

          // Reset cursor and tooltips when not hovering an entity
          scene.canvas.style.cursor = 'default';
          setHoveredFlight(null);
          setHoveredDisaster(null);
        } catch (_) {}
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Left Click: Open full flight telemetry drawer
      handler.setInputAction((click: any) => {
        try {
          const pickedObject = scene.pick(click.position);
          if (Cesium.defined(pickedObject)) {
            if (pickedObject.primitive && pickedObject.primitive.id) {
              const pid = pickedObject.primitive.id;
              if (pid._geoScopeData) {
                onSelectEntity(pid._geoScopeData);
                return;
              }
            }
            if (pickedObject.id && pickedObject.id._geoScopeData) {
              onSelectEntity(pickedObject.id._geoScopeData);
              return;
            }
          }
        } catch (_) {}
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Double Click: Smooth Zoom In to Click Location
      handler.setInputAction((click: any) => {
        try {
          const ray = viewer!.camera.getPickRay(click.position);
          if (!ray) return;
          const cartesian = scene.globe.pick(ray, scene);
          if (cartesian) {
            const currentHeight = viewer!.camera.positionCartographic.height;
            const targetHeight = Math.max(currentHeight * 0.35, 10000);
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            viewer!.camera.flyTo({
              destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, targetHeight),
              duration: 1.0,
            });
          }
        } catch (_) {}
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    } catch (err) {
      console.error('Cesium Viewer Initialization Error:', err);
    }

    return () => {
      try {
        if (removeWheelListener) removeWheelListener();
        if (viewer && !viewer.isDestroyed()) {
          viewer.destroy();
        }
      } catch (_) {}
      viewerRef.current = null;
    };
  }, []);

  // Synchronize Basemap Imagery Mode (Satellite / Hybrid / Streets)
  useEffect(() => {
    const { satelliteLayer, boundariesLayer, streetsLayer } = imageryLayersRef.current;
    if (!satelliteLayer || !boundariesLayer || !streetsLayer) return;

    if (basemapMode === 'satellite') {
      satelliteLayer.show = true;
      boundariesLayer.show = false;
      streetsLayer.show = false;
    } else if (basemapMode === 'hybrid') {
      satelliteLayer.show = true;
      boundariesLayer.show = true;
      streetsLayer.show = false;
    } else if (basemapMode === 'streets') {
      satelliteLayer.show = false;
      boundariesLayer.show = false;
      streetsLayer.show = true;
    }
  }, [basemapMode]);

  // Sync Aircraft Layer with Flightradar24 Yellow Planes + NMIMS Emerald Trainers + Trails
  useEffect(() => {
    const billboards = flightBillboardsRef.current;
    const labels = flightLabelsRef.current;
    const trails = flightTrailsRef.current;
    if (!billboards || !labels || !viewerRef.current) return;

    try {
      billboards.removeAll();
      labels.removeAll();
      if (trails) trails.removeAll();

      if (!layers.flights?.enabled) return;

      const limit = Math.min(flights.length, 14000);
      for (let i = 0; i < limit; i++) {
        const f = flights[i];
        if (f.lon === null || f.lat === null || isNaN(f.lon) || isNaN(f.lat)) continue;

        const isTraining = f.isNorthMaharashtraTraining === true || f.isNmimsFleet === true || f.fleetMetadata?.isNorthMaharashtraTraining === true;
        if (isTraining && showNmimsFleet === false) continue;
        if (!isTraining && showCommercialFlights === false) continue;

        const isCurrentPilotPlane = pilotViewFlight && (f.icao24?.toLowerCase() === pilotViewFlight.icao24?.toLowerCase() || f.callsign === pilotViewFlight.callsign);
        if (isCurrentPilotPlane && (pilotViewMode === 'COCKPIT' || pilotViewMode === 'DOWN_LOOK')) {
          // In forward Cockpit and Look Down mode, omit billboard so user gets a crystal-clear panoramic view of the satellite ground!
          continue;
        }

        const rotationRad = -Cesium.Math.toRadians(f.heading || 0);

        // Render pure Flightradar24 golden yellow or North Maharashtra training cyan/emerald
        billboards.add({
          position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, Math.max(f.altitude || 1000, 100)),
          image: isTraining ? '/plane-cyan.svg' : '/plane-yellow.svg',
          rotation: rotationRad,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          width: isTraining ? 22 : 18,
          height: isTraining ? 22 : 18,
          scaleByDistance: new Cesium.NearFarScalar(5.0e4, isTraining ? 1.5 : 1.3, 1.2e7, isTraining ? 0.6 : 0.45),
          translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 2.8e7, 0.35),
          color: Cesium.Color.WHITE.withAlpha(layers.flights.opacity),
          id: {
            _geoScopeType: 'flight',
            _geoScopeData: { type: 'flight', data: f }
          }
        });

        // Flight callsign label: High-contrast cyan/emerald badge for Training fleet, amber for commercial
        labels.add({
          position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, Math.max(f.altitude || 1000, 100)),
          text: isTraining ? `✈️ ${f.callsign || f.icao24}` : (f.callsign || f.icao24).toUpperCase(),
          font: isTraining ? 'bold 11px monospace, system-ui, sans-serif' : 'bold 10px monospace, system-ui, sans-serif',
          fillColor: isTraining ? Cesium.Color.fromCssColorString('#06B6D4') : Cesium.Color.fromCssColorString('#F5CE27'),
          outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
          outlineWidth: isTraining ? 4 : 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, 16),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isTraining ? 3500000 : 2200000),
          scaleByDistance: new Cesium.NearFarScalar(5.0e4, 1.1, 2.2e6, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1.2e6, 1.0, 2.2e6, 0.0),
        });

        // Render Historical Flight Trail Breadcrumbs for Training aircraft
        if (isTraining && trails && Array.isArray(f.trail) && f.trail.length > 1) {
          const positions = f.trail
            .filter((pt: any) => Array.isArray(pt) && !isNaN(pt[0]) && !isNaN(pt[1]))
            .map((pt: any) => Cesium.Cartesian3.fromDegrees(pt[0], pt[1], Math.max(pt[2] || 500, 50)));

          if (positions.length > 1) {
            trails.add({
              positions,
              width: 3.5,
              material: Cesium.Material.fromType('Color', {
                color: Cesium.Color.fromCssColorString('#06B6D4').withAlpha(0.8)
              })
            });
          }
        }
      }
    } catch (e) {
      console.warn('Flight sync error:', e);
    }
  }, [flights, layers.flights?.enabled, layers.flights?.opacity, showNmimsFleet, showCommercialFlights]);

  // Sync Earthquakes Layer
  useEffect(() => {
    const points = quakePointsRef.current;
    if (!points || !viewerRef.current) return;

    try {
      points.removeAll();

      if (!layers.earthquakes?.enabled) return;

      for (const q of earthquakes) {
        if (q.lon === null || q.lat === null || isNaN(q.lon) || isNaN(q.lat)) continue;

        let color = Cesium.Color.fromCssColorString('#EF4444');
        if (q.depth > 70) color = Cesium.Color.fromCssColorString('#A855F7');
        else if (q.depth > 30) color = Cesium.Color.fromCssColorString('#F59E0B');

        points.add({
          position: Cesium.Cartesian3.fromDegrees(q.lon, q.lat, 1000),
          color: color.withAlpha(layers.earthquakes.opacity),
          pixelSize: Math.max(q.mag * 3.5, 6),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          id: {
            _geoScopeType: 'earthquake',
            _geoScopeData: { type: 'earthquake', data: q }
          }
        });
      }
    } catch (e) {
      console.warn('Earthquake sync error:', e);
    }
  }, [earthquakes, layers.earthquakes?.enabled, layers.earthquakes?.opacity]);

  // Sync Natural Disasters Layer with Genuine Multi-Provider Visualization
  useEffect(() => {
    const points = disasterPointsRef.current;
    const labels = disasterLabelsRef.current;
    const polylines = disasterPolylinesRef.current;
    if (!points || !viewerRef.current) return;

    try {
      points.removeAll();
      if (labels) labels.removeAll();
      if (polylines) polylines.removeAll();

      if (!layers.disasters?.enabled) return;

      for (const d of disasters) {
        if (d.lon === null || d.lat === null || isNaN(d.lon) || isNaN(d.lat)) continue;

        // Apply Category and Alert Level filters
        if (disasterCategoryFilter && disasterCategoryFilter[d.category] === false) continue;
        if (disasterAlertFilter === 'RED' && d.alertLevel !== 'Red') continue;
        if (disasterAlertFilter === 'ORANGE' && d.alertLevel !== 'Orange' && d.alertLevel !== 'Red') continue;

        const visual = getDisasterVisuals(d);

        // Render genuine point marker
        points.add({
          position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 4000),
          pixelSize: visual.pixelSize,
          color: visual.color.withAlpha(layers.disasters.opacity),
          outlineColor: visual.outlineColor,
          outlineWidth: visual.outlineWidth,
          id: {
            _geoScopeType: 'disaster',
            _geoScopeData: { type: 'disaster', data: d }
          }
        });

        // If cyclone track LineString exists, draw actual storm trajectory
        if (polylines && d.geometry?.type === 'LineString' && Array.isArray(d.geometry.coordinates)) {
          const positions = d.geometry.coordinates
            .filter((c: any) => Array.isArray(c) && !isNaN(c[0]) && !isNaN(c[1]))
            .map((c: any) => Cesium.Cartesian3.fromDegrees(c[0], c[1], 2500));

          if (positions.length > 1) {
            polylines.add({
              positions,
              width: 3.5,
              material: Cesium.Material.fromType('Color', {
                color: Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.8)
              })
            });
          }
        }

        // Add prominent map labels for Red and Orange alerts
        if (labels && (d.alertLevel === 'Red' || d.category === 'cyclones' || d.category === 'volcanoes')) {
          labels.add({
            position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 4500),
            text: `${visual.icon} ${d.title.slice(0, 32)}`,
            font: 'bold 11px monospace, system-ui, sans-serif',
            fillColor: d.alertLevel === 'Red' ? Cesium.Color.fromCssColorString('#FF4444') : Cesium.Color.fromCssColorString('#F59E0B'),
            outlineColor: Cesium.Color.fromCssColorString('#0B0F19'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5500000), // Visible within 5,500 km
            scaleByDistance: new Cesium.NearFarScalar(1.0e5, 1.1, 5.5e6, 0.7),
            translucencyByDistance: new Cesium.NearFarScalar(3.5e6, 1.0, 5.5e6, 0.0),
          });
        }
      }
    } catch (e) {
      console.warn('Disaster sync error:', e);
    }
  }, [disasters, layers.disasters?.enabled, layers.disasters?.opacity, disasterCategoryFilter, disasterAlertFilter]);

  // Sync Satellites & ISS Layer
  useEffect(() => {
    const points = satPointsRef.current;
    if (!points || !viewerRef.current) return;

    try {
      points.removeAll();

      if (!layers.satellites?.enabled) return;

      for (const s of satellites) {
        if (s.lon === null || s.lat === null || isNaN(s.lon) || isNaN(s.lat)) continue;

        const color = Cesium.Color.fromCssColorString(s.color || '#00F0FF');
        const pos = Cesium.Cartesian3.fromDegrees(s.lon, s.lat, (s.altitudeKm || 400) * 1000);

        points.add({
          position: pos,
          pixelSize: s.norad === 25544 ? 14 : 8,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          id: {
            _geoScopeType: 'satellite',
            _geoScopeData: { type: 'satellite', data: s }
          }
        });
      }
    } catch (e) {
      console.warn('Satellite sync error:', e);
    }
  }, [satellites, layers.satellites?.enabled]);

  // Selected Entity Camera Tracking
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedEntity) return;

    try {
      let targetLon = 0;
      let targetLat = 0;
      let targetAlt = 2500000;

      if (selectedEntity.type === 'flight') {
        targetLon = selectedEntity.data.lon;
        targetLat = selectedEntity.data.lat;
        targetAlt = 350000;
      } else if (selectedEntity.type === 'earthquake') {
        targetLon = selectedEntity.data.lon;
        targetLat = selectedEntity.data.lat;
        targetAlt = 800000;
      } else if (selectedEntity.type === 'disaster') {
        targetLon = selectedEntity.data.lon;
        targetLat = selectedEntity.data.lat;
        targetAlt = 1200000;
      } else if (selectedEntity.type === 'satellite') {
        targetLon = selectedEntity.data.lon;
        targetLat = selectedEntity.data.lat;
        targetAlt = (selectedEntity.data.altitudeKm || 400) * 1000 * 2.5;
      }

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, targetAlt),
        duration: 1.8,
      });
    } catch (_) {}
  }, [selectedEntity]);

  // Jump to Searched Global City or Region
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cameraTarget) return;

    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          cameraTarget.lon, 
          cameraTarget.lat, 
          cameraTarget.height || 350000
        ),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0,
        },
        duration: 1.6,
      });
    } catch (_) {}
  }, [cameraTarget]);

  // Real-Time Pilot View & Cockpit Camera Controller Loop
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !pilotViewFlight || !pilotViewMode) {
      if (viewer && !viewer.isDestroyed()) {
        const ssc = viewer.scene.screenSpaceCameraController;
        ssc.enableRotate = true;
        ssc.enableTranslate = true;
        ssc.enableZoom = true;
      }
      return;
    }

    const scene = viewer.scene;
    const ssc = scene.screenSpaceCameraController;
    ssc.enableRotate = false;
    ssc.enableTranslate = false;
    ssc.enableZoom = false;

    let modelPrimitive: any = null;
    let isDisposed = false;
    if (pilotViewMode === 'CHASE' || pilotViewMode === 'WING') {
      try {
        const loadPromise = (Cesium.Model as any).fromGltfAsync
          ? (Cesium.Model as any).fromGltfAsync({
              url: '/models/Cesium_Air.glb',
              scale: 25.0,
              minimumPixelSize: 64,
              maximumScale: 120,
            })
          : Promise.resolve((Cesium.Model as any).fromGltf({
              url: '/models/Cesium_Air.glb',
              scale: 25.0,
              minimumPixelSize: 64,
              maximumScale: 120,
            }));

        loadPromise.then((m: any) => {
          if (!isDisposed && viewer && !viewer.isDestroyed()) {
            modelPrimitive = scene.primitives.add(m);
          } else {
            try { m.destroy(); } catch (_) {}
          }
        }).catch(() => {});
      } catch (_) {}
    }

    const onPreRender = () => {
      try {
        // Find latest live telemetry for this flight
        const live = flights.find(f => 
          (f.icao24 && f.icao24.toLowerCase() === pilotViewFlight.icao24?.toLowerCase()) ||
          (f.callsign && f.callsign === pilotViewFlight.callsign)
        ) || pilotViewFlight;

        if (!live || live.lon === undefined || live.lat === undefined) return;

        const alt = Math.max(live.altitude || 500, 50);
        const headingDeg = live.heading || 0;
        const headingRad = Cesium.Math.toRadians(headingDeg);
        const position = Cesium.Cartesian3.fromDegrees(live.lon, live.lat, alt);
        const enu = Cesium.Transforms.eastNorthUpToFixedFrame(position);

        // Update 3D model orientation & position in Chase/Wing mode
        if (modelPrimitive && !modelPrimitive.isDestroyed()) {
          const hpr = new Cesium.HeadingPitchRoll(headingRad, 0, 0);
          const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
          const modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
            position,
            orientation,
            new Cesium.Cartesian3(25, 25, 25)
          );
          modelPrimitive.modelMatrix = modelMatrix;
        }

        let forwardDist = 4.0;
        let rightDist = 0.0;
        let upDist = 2.5;
        let pitchDeg = -4.5;
        let headingOffsetDeg = 0.0;

        if (pilotViewMode === 'COCKPIT') {
          // Pilot's cockpit forward eye perspective through the windshield looking forward and down
          forwardDist = 4.0;
          rightDist = 0.0;
          upDist = 2.5;
          pitchDeg = -4.5;
        } else if (pilotViewMode === 'CHASE') {
          // Tactical trailing chase view behind the tail looking forward and down at the earth
          forwardDist = -140.0;
          rightDist = 0.0;
          upDist = 32.0;
          pitchDeg = -8.5;
        } else if (pilotViewMode === 'WING') {
          // Left wing / passenger perspective looking past the wing and engine
          forwardDist = -8.0;
          rightDist = -35.0;
          upDist = 4.0;
          pitchDeg = -5.0;
          headingOffsetDeg = 15.0;
        } else if (pilotViewMode === 'DOWN_LOOK') {
          // Downward-looking reconnaissance / ground camera (looking straight down from aircraft belly at the satellite ground)
          forwardDist = 0.0;
          rightDist = 0.0;
          upDist = -1.5;
          pitchDeg = -88.5;
        } else if (pilotViewMode === 'TOP_DOWN') {
          // Nadir overhead tactical tracker
          forwardDist = 0.0;
          rightDist = 0.0;
          upDist = 1800.0;
          pitchDeg = -89.9;
        }

        const localOffset = new Cesium.Cartesian3(
          forwardDist * Math.sin(headingRad) + rightDist * Math.cos(headingRad),
          forwardDist * Math.cos(headingRad) - rightDist * Math.sin(headingRad),
          upDist
        );
        const cameraPos = Cesium.Matrix4.multiplyByPoint(enu, localOffset, new Cesium.Cartesian3());

        viewer.camera.setView({
          destination: cameraPos,
          orientation: {
            heading: headingRad + Cesium.Math.toRadians(headingOffsetDeg),
            pitch: Cesium.Math.toRadians(pitchDeg),
            roll: 0.0
          }
        });
      } catch (_) {}
    };

    const removePreRender = scene.preRender.addEventListener(onPreRender);

    return () => {
      isDisposed = true;
      removePreRender();
      if (modelPrimitive && !modelPrimitive.isDestroyed()) {
        try {
          scene.primitives.remove(modelPrimitive);
        } catch (_) {}
      }
      if (viewer && !viewer.isDestroyed()) {
        const ssc = viewer.scene.screenSpaceCameraController;
        ssc.enableRotate = true;
        ssc.enableTranslate = true;
        ssc.enableZoom = true;
      }
    };
  }, [pilotViewFlight, pilotViewMode, flights]);

  return (
    <div className="relative w-full h-full bg-space-950 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Mission Control & Flightradar24 Navigation HUD */}
      <div className="absolute right-4 top-20 flex flex-col space-y-2 z-20 select-none">
        <button
          onClick={() => {
            const cam = viewerRef.current?.camera;
            if (!cam) return;
            const h = cam.positionCartographic.height;
            if (h <= 150) return; // Strict clamp: never go below 150m (allows close runway & terrain view)
            const available = h - 150;
            const step = Math.min(h * 0.30, available);
            if (step > 5) cam.zoomIn(step);
          }}
          title="Zoom In (+)"
          className="w-10 h-10 bg-space-950/90 hover:bg-space-900 border border-yellow-500/40 hover:border-yellow-400 text-yellow-400 rounded-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            const cam = viewerRef.current?.camera;
            if (!cam) return;
            const h = cam.positionCartographic.height;
            if (h >= 30000000) return;
            cam.zoomOut(h * 0.30);
          }}
          title="Zoom Out (-)"
          className="w-10 h-10 bg-space-950/90 hover:bg-space-900 border border-yellow-500/40 hover:border-yellow-400 text-yellow-400 rounded-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="h-px bg-white/10 my-0.5" />

        {/* Photorealistic Satellite & Basemap Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBasemapMenu(prev => !prev)}
            title={`Earth Imagery: ${basemapMode.toUpperCase()} (Click to toggle)`}
            className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md border ${
              basemapMode === 'satellite'
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-cyan-950/50'
                : basemapMode === 'hybrid'
                ? 'bg-blue-950/90 border-blue-400 text-blue-300'
                : 'bg-space-950/90 border-white/20 text-gray-300'
            }`}
          >
            <Layers className="w-5 h-5" />
          </button>

          {showBasemapMenu && (
            <div className="absolute right-12 top-0 bg-space-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-1.5 shadow-2xl min-w-[180px] flex flex-col space-y-1 z-30 font-mono text-xs">
              <div className="text-[10px] text-gray-400 font-bold px-2 py-1 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                <span>Earth Imagery</span>
                <span className="text-[9px] text-cyan-400">ESRI HD</span>
              </div>
              <button
                onClick={() => { setBasemapMode('satellite'); setShowBasemapMenu(false); }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                  basemapMode === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>🛰️ Satellite (Photoreal)</span>
                {basemapMode === 'satellite' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => { setBasemapMode('hybrid'); setShowBasemapMenu(false); }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                  basemapMode === 'hybrid' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>🌐 Hybrid (Sat + Labels)</span>
                {basemapMode === 'hybrid' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <button
                onClick={() => { setBasemapMode('streets'); setShowBasemapMenu(false); }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                  basemapMode === 'streets' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>🗺️ Streets (Vector)</span>
                {basemapMode === 'streets' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 my-0.5" />

        <button
          onClick={() => {
            viewerRef.current?.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(78.9629, 20.5937, 3200000.0),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
              duration: 1.2
            });
          }}
          title="Fly to India Airspace"
          className="w-10 h-10 bg-space-950/90 hover:bg-space-900 border border-white/20 hover:border-cyan-400 text-cyan-400 rounded-lg flex items-center justify-center shadow-2xl text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          🇮🇳
        </button>

        <button
          onClick={() => {
            viewerRef.current?.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(20, 15, 18000000.0),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
              duration: 1.4
            });
          }}
          title="Global Orbit View"
          className="w-10 h-10 bg-space-950/90 hover:bg-space-900 border border-white/20 hover:border-cyan-400 text-gray-300 hover:text-white rounded-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Globe className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const carto = viewerRef.current?.camera.positionCartographic;
            if (!carto) return;
            viewerRef.current?.camera.flyTo({
              destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
              duration: 0.6
            });
          }}
          title="Reset North Orientation"
          className="w-10 h-10 bg-space-950/90 hover:bg-space-900 border border-white/20 hover:border-cyan-400 text-gray-300 hover:text-white rounded-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Flightradar24-Style & NMIMS Cadet Live Hover Badge */}
      {hoveredFlight && (
        <div
          style={{
            left: Math.min(hoveredFlight.x + 16, window.innerWidth - 290),
            top: Math.max(16, hoveredFlight.y - 32)
          }}
          className={`pointer-events-none absolute z-50 bg-space-950/95 backdrop-blur-md px-3 py-2 rounded-lg shadow-2xl text-xs font-mono text-white transition-transform border ${
            hoveredFlight.flight.isNmimsFleet 
              ? 'border-emerald-400 shadow-emerald-950/60 ring-1 ring-emerald-500/40' 
              : 'border-yellow-400/90'
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-sm">
            {hoveredFlight.flight.isNmimsFleet ? (
              <span className="text-emerald-400 flex items-center space-x-1.5">
                <span>🎓</span>
                <span className="tracking-wide">{hoveredFlight.flight.callsign}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  NMIMS CADET
                </span>
              </span>
            ) : (
              <span className="text-yellow-400 flex items-center space-x-1.5">
                <span>✈</span>
                <span className="tracking-wide">{hoveredFlight.flight.callsign}</span>
              </span>
            )}
            {hoveredFlight.flight.model && (
              <span className="text-[10px] font-sans font-normal text-gray-300 px-1 py-0.5 rounded bg-white/10">
                {hoveredFlight.flight.model}
              </span>
            )}
          </div>
          {hoveredFlight.flight.isNmimsFleet ? (
            <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
              SVKM's NMIMS Academy of Aviation • Shirpur (VA1B)
            </div>
          ) : (
            hoveredFlight.flight.country && (
              <div className="text-[11px] text-cyan-300 font-semibold mt-0.5 truncate max-w-[220px]">
                {hoveredFlight.flight.country}
              </div>
            )
          )}
          <div className="text-[10px] text-gray-300 flex items-center space-x-2 mt-1.5 pt-1.5 border-t border-white/10">
            <span>ALT: <b className="text-white">{Math.round(hoveredFlight.flight.altitude).toLocaleString()} m</b></span>
            <span>•</span>
            <span>SPD: <b className="text-white">{Math.round(hoveredFlight.flight.velocity || 0)} km/h</b></span>
            <span>•</span>
            <span>HDG: <b className={hoveredFlight.flight.isNmimsFleet ? "text-emerald-400" : "text-yellow-400"}>{Math.round(hoveredFlight.flight.heading)}°</b></span>
          </div>
        </div>
      )}

      {/* Genuine Natural Disaster Live Hover Badge */}
      {hoveredDisaster && (
        <div
          style={{
            left: Math.min(hoveredDisaster.x + 16, window.innerWidth - 300),
            top: Math.max(16, hoveredDisaster.y - 36)
          }}
          className="pointer-events-none absolute z-50 bg-space-950/98 backdrop-blur-md border border-red-500/80 px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-mono text-white animate-fadeIn"
        >
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-base">
                {hoveredDisaster.disaster.category === 'cyclones' ? '🌀' : hoveredDisaster.disaster.category === 'volcanoes' ? '🌋' : hoveredDisaster.disaster.category === 'wildfires' ? '🔥' : hoveredDisaster.disaster.category === 'floods' ? '🌊' : '⚠️'}
              </span>
              <span className="font-bold text-white text-xs uppercase tracking-wide">
                {hoveredDisaster.disaster.categoryName}
              </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
              hoveredDisaster.disaster.alertLevel === 'Red'
                ? 'bg-red-500 text-white'
                : hoveredDisaster.disaster.alertLevel === 'Orange'
                ? 'bg-amber-500/30 text-amber-300'
                : 'bg-emerald-500/30 text-emerald-300'
            }`}>
              {hoveredDisaster.disaster.alertLevel} ALERT
            </span>
          </div>

          <div className="text-xs font-bold text-gray-200 mt-1 line-clamp-2">
            {hoveredDisaster.disaster.title}
          </div>

          {hoveredDisaster.disaster.country && (
            <div className="text-[11px] text-cyan-300 mt-0.5">
              📍 {hoveredDisaster.disaster.country}
            </div>
          )}

          <div className="text-[10px] text-gray-400 flex items-center space-x-2 mt-1.5 pt-1.5 border-t border-white/10">
            <span>SOURCE: <b className="text-gray-200">{hoveredDisaster.disaster.source}</b></span>
            <span>•</span>
            <span>{hoveredDisaster.disaster.lat.toFixed(2)}°, {hoveredDisaster.disaster.lon.toFixed(2)}°</span>
          </div>
        </div>
      )}
    </div>
  );
};
