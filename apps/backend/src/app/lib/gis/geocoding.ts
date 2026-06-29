import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { isBlankAddress, isIncompleteAddress } from '../address-normalize';
import { env } from '../../../env';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../logger';

let boundariesCache: any = null;

export async function loadBoundaries(): Promise<any> {
  if (boundariesCache) return boundariesCache;
  const filePath = path.resolve(process.cwd(), 'apps/backend/src/app/lib/gis/boundaries.geojson');
  try {
    const data = await fs.readFile(filePath, 'utf8');
    boundariesCache = JSON.parse(data);
    return boundariesCache;
  } catch (err) {
    logger.warn({ err }, `Failed to read boundaries GeoJSON from ${filePath}. Using empty collection.`);
    return { type: 'FeatureCollection', features: [] };
  }
}

function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInPolygon(lng: number, lat: number, polygon: number[][][]): boolean {
  const outerRing = polygon[0];
  if (!outerRing || !isPointInRing(lng, lat, outerRing)) {
    return false;
  }
  // If it's inside any inner rings (holes), it is NOT in the polygon
  for (let i = 1; i < polygon.length; i++) {
    if (isPointInRing(lng, lat, polygon[i]!)) {
      return false;
    }
  }
  return true;
}

export function isPointInMultiPolygon(lng: number, lat: number, multipolygon: number[][][][]): boolean {
  for (const polygon of multipolygon) {
    if (isPointInPolygon(lng, lat, polygon)) {
      return true;
    }
  }
  return false;
}

export async function matchCoordinatesToDistrict(
  lat: number,
  lng: number,
): Promise<{ district: string | null; precinct: string | null; ward: string | null }> {
  const geojson = await loadBoundaries();
  if (!geojson || !geojson.features) {
    return { district: null, precinct: null, ward: null };
  }

  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    const properties = feature.properties || {};

    if (geometry.type === 'Polygon') {
      if (isPointInPolygon(lng, lat, geometry.coordinates)) {
        return {
          district: properties.district || null,
          precinct: properties.precinct || null,
          ward: properties.ward || null,
        };
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (isPointInMultiPolygon(lng, lat, geometry.coordinates)) {
        return {
          district: properties.district || null,
          precinct: properties.precinct || null,
          ward: properties.ward || null,
        };
      }
    }
  }

  return { district: null, precinct: null, ward: null };
}

export async function geocodeAndMapHousehold(householdId: string, tenantId: string, db: Kysely<Models>): Promise<void> {
  const hh = await db
    .selectFrom('households')
    .selectAll()
    .where('id', '=', householdId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();

  if (!hh) {
    logger.warn(`Geocoding job skipped: Household ${householdId} not found.`);
    return;
  }

  // 1. Check if the address is blank or incomplete
  if (isBlankAddress(hh) || isIncompleteAddress(hh)) {
    logger.info(`Geocoding job: Household ${householdId} has a blank or incomplete address. Marking as failed.`);
    await db
      .updateTable('households')
      .set({
        geocoding_status: 'failed',
        district: null,
        precinct: null,
        ward: null,
        updated_at: new Date(),
      })
      .where('id', '=', householdId)
      .where('tenant_id', '=', tenantId)
      .execute();
    return;
  }

  // 2. Throttle API calls to protect rate limits (e.g. 200ms sleep)
  await new Promise((resolve) => setTimeout(resolve, 200));

  let lat: number | null = null;
  let lng: number | null = null;
  let formattedAddress: string | null = null;
  let addressType: string | null = null;

  const apiKey = env.googleMapsApiKey;
  const isMockOrTest = !apiKey || apiKey.includes('mock') || process.env['NODE_ENV'] === 'test';

  const addressStr = [hh.street_num, hh.street1, hh.street2, hh.city, hh.state, hh.zip, hh.country]
    .filter(Boolean)
    .join(', ');

  if (!isMockOrTest) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        addressStr,
      )}&key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Maps Geocoding API returned status ${response.status}`);
      }
      const data: any = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        lat = result.geometry.location.lat;
        lng = result.geometry.location.lng;
        formattedAddress = result.formatted_address;
        addressType = result.geometry.location_type;
      } else if (data.status === 'ZERO_RESULTS') {
        logger.info(`Geocoding job: Address "${addressStr}" returned zero results. Marking as failed.`);
        await db
          .updateTable('households')
          .set({
            geocoding_status: 'failed',
            district: null,
            precinct: null,
            ward: null,
            updated_at: new Date(),
          })
          .where('id', '=', householdId)
          .where('tenant_id', '=', tenantId)
          .execute();
        return;
      } else {
        // Transient error like OVER_QUERY_LIMIT, REQUEST_DENIED, etc.
        throw new Error(`Google Maps Geocoding API error status: ${data.status}`);
      }
    } catch (err) {
      logger.error({ err }, `Geocoding API call failed for household ${householdId}`);
      // Re-throw to trigger worker retry with backoff
      throw err;
    }
  } else {
    // 3. Fallback deterministic coordinates for testing and development
    // Create a simple hash of the address string to get reproducible coordinates
    let hash = 0;
    for (let i = 0; i < addressStr.length; i++) {
      hash = addressStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = Math.abs(hash % 1000) / 1000; // Value between 0 and 1

    // Map address to Chicago Loop, North Side, or West Side coordinates
    // Lat bounds: 41.85 to 41.93. Lng bounds: -87.69 to -87.61
    lat = 41.85 + val * 0.08;
    lng = -87.69 + val * 0.08;
    formattedAddress = `${hh.street_num || '123'} ${hh.street1 || 'Main St'}, ${hh.city || 'Chicago'}, ${hh.state || 'IL'} ${hh.zip || '60601'}`;
    addressType = 'rooftop';
    logger.info(`Geocoding job simulated in dev/test for household ${householdId} at lat=${lat}, lng=${lng}`);
  }

  // 4. Match against GIS Boundaries
  let district: string | null = null;
  let precinct: string | null = null;
  let ward: string | null = null;

  if (lat !== null && lng !== null) {
    const matched = await matchCoordinatesToDistrict(lat, lng);
    district = matched.district;
    precinct = matched.precinct;
    ward = matched.ward;
  }

  // 5. Update household record
  await db
    .updateTable('households')
    .set({
      lat,
      lng,
      formatted_address: formattedAddress,
      type: addressType,
      district,
      precinct,
      ward,
      geocoding_status: 'success',
      updated_at: new Date(),
    })
    .where('id', '=', householdId)
    .where('tenant_id', '=', tenantId)
    .execute();

  logger.info(`Geocoding & GIS mapping completed successfully for household ${householdId}. Status set to success.`);
}
