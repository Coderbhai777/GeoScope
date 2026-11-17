import type { AtcStation } from '../types';

const API_BASE = 'http://localhost:5050/api';

export async function getGatewayStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error(`Gateway offline: ${res.status}`);
  return res.json();
}

export async function fetchLiveFlights() {
  const res = await fetch(`${API_BASE}/flights`);
  if (!res.ok) throw new Error(`Flights API error: ${res.status}`);
  return res.json();
}

export async function fetchLiveEarthquakes(feed = 'all_day') {
  const res = await fetch(`${API_BASE}/earthquakes?feed=${feed}`);
  if (!res.ok) throw new Error(`Earthquakes API error: ${res.status}`);
  return res.json();
}

export async function fetchLiveDisasters() {
  const res = await fetch(`${API_BASE}/disasters`);
  if (!res.ok) throw new Error(`Disasters API error: ${res.status}`);
  return res.json();
}

export async function fetchLiveSatellites() {
  const res = await fetch(`${API_BASE}/satellites`);
  if (!res.ok) throw new Error(`Satellites API error: ${res.status}`);
  return res.json();
}

export async function fetchNmimsFleetReport() {
  const res = await fetch(`${API_BASE}/aviation/north-maharashtra`);
  if (!res.ok) {
    // fallback to legacy endpoint if needed
    const fallbackRes = await fetch(`${API_BASE}/nmims/fleet`);
    if (!fallbackRes.ok) throw new Error(`Aviation Fleet API error: ${res.status}`);
    return fallbackRes.json();
  }
  return res.json();
}

export async function fetchNorthMaharashtraAviationReport() {
  const res = await fetch(`${API_BASE}/aviation/north-maharashtra`);
  if (!res.ok) throw new Error(`North Maharashtra Aviation API error: ${res.status}`);
  return res.json();
}

export async function fetchAviationProviders() {
  const res = await fetch(`${API_BASE}/aviation/providers`);
  if (!res.ok) throw new Error(`Aviation Providers API error: ${res.status}`);
  return res.json();
}

export async function fetchPointWeather(lat: number, lon: number) {
  const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export async function fetchAtcStations(): Promise<{ success: boolean; count: number; stations: AtcStation[] }> {
  const res = await fetch(`${API_BASE}/atc/stations`);
  if (!res.ok) throw new Error(`ATC Stations API error: ${res.status}`);
  return res.json();
}

export async function fetchNearestAtcStation(lat: number, lon: number): Promise<{ success: boolean; station: AtcStation }> {
  const res = await fetch(`${API_BASE}/atc/nearest?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Nearest ATC Station API error: ${res.status}`);
  return res.json();
}

export function getAtcAudioStreamUrl(stationId: string): string {
  return `${API_BASE}/atc/stream?station=${encodeURIComponent(stationId)}`;
}
