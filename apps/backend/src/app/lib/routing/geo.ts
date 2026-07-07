import { AVG_SPEED_KMH, ROAD_WINDING_FACTOR } from './route-constants';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const MINUTES_PER_HOUR = 60;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two coordinates. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated road distance in kilometres (straight-line × winding factor). */
export function roadKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * ROAD_WINDING_FACTOR;
}

/** Estimated travel time in minutes from a to b at the given average speed. */
export function legMinutes(a: LatLng, b: LatLng, avgSpeedKmh: number = AVG_SPEED_KMH): number {
  return (roadKm(a, b) / avgSpeedKmh) * MINUTES_PER_HOUR;
}
