/**
 * Turf-cutting engine (§13.2) — pure, deterministic, and dependency-free so it
 * is unit-testable without a DB or a map.
 *
 * ## What it does
 * Clusters geocoded households (one door per household) into contiguous groups
 * near a target size. It reuses the SAME geocoded lat/lng the household map and
 * geocoding job already fill (Wave 1A) — it never geocodes anything itself.
 *
 * ## Barriers (highways / rail / water)
 * The spec requires turfs never to cross a hard barrier. The only barrier data
 * the app ships is the ward/precinct GIS polygon set (`lib/gis/boundaries.geojson`),
 * whose edges in practice follow exactly those features (rivers, rail lines,
 * arterial roads). So the engine treats the **ward boundary as the barrier**: a
 * turf is never allowed to span two wards. This is an honest proxy given the
 * available data — true per-street barrier linework is not in the dataset, so
 * finer barrier avoidance is deferred to the manual "rebalance on the map" step
 * the spec already calls for.
 *
 * ## Contiguity
 * Within a ward the doors are laid out along a boustrophedon ("snake") sweep —
 * banded by latitude, alternating east/west within each band — which yields a
 * locality-preserving 1-D order. Chunking that order into near-equal runs gives
 * spatially compact, contiguous turfs without needing a full TSP/graph solve.
 */

export interface DoorPoint {
  household_id: string;
  lat: number | null;
  lng: number | null;
  ward: string | null;
}

export interface TurfCluster {
  households: string[];
  centroid_lat: number;
  centroid_lng: number;
  ward: string | null;
}

export interface CutPlan {
  /** Proposed turfs, in a stable order. */
  turfs: TurfCluster[];
  /** Household ids that were placed into a turf. */
  placedCount: number;
  /** Household ids with no usable geocode — can't be mapped, reported honestly. */
  unplaced: string[];
}

const MIN_TARGET = 1;

function isFinitePoint(d: DoorPoint): d is DoorPoint & { lat: number; lng: number } {
  return typeof d.lat === 'number' && Number.isFinite(d.lat) && typeof d.lng === 'number' && Number.isFinite(d.lng);
}

/** Split `items` into `k` contiguous, near-equal chunks preserving order. */
function evenChunks<T>(items: readonly T[], k: number): T[][] {
  const chunks: T[][] = [];
  const n = items.length;
  const base = Math.floor(n / k);
  let remainder = n % k;
  let start = 0;
  for (let i = 0; i < k; i++) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    const end = start + base + extra;
    chunks.push(items.slice(start, end));
    start = end;
  }
  return chunks.filter((c) => c.length > 0);
}

/**
 * Order points along a latitude-banded snake sweep so that consecutive points
 * are spatially close — the key to producing contiguous chunks.
 */
function snakeOrder(points: readonly (DoorPoint & { lat: number; lng: number })[]): (DoorPoint & {
  lat: number;
  lng: number;
})[] {
  const n = points.length;
  if (n <= 2) return [...points];

  const bandCount = Math.max(1, Math.round(Math.sqrt(n)));
  const byLat = [...points].sort((a, b) => a.lat - b.lat);
  const bands = evenChunks(byLat, bandCount);

  const ordered: (DoorPoint & { lat: number; lng: number })[] = [];
  bands.forEach((band, index) => {
    const sorted = [...band].sort((a, b) => a.lng - b.lng);
    if (index % 2 === 1) sorted.reverse(); // alternate direction each band
    ordered.push(...sorted);
  });
  return ordered;
}

function centroid(points: readonly { lat: number; lng: number }[]): { lat: number; lng: number } {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/**
 * Cut a set of doors into contiguous turfs of ~`targetDoors` each, never
 * crossing a ward boundary.
 */
export function cutTurfs(doors: readonly DoorPoint[], targetDoors: number): CutPlan {
  const target = Math.max(MIN_TARGET, Math.floor(targetDoors));

  const placed: (DoorPoint & { lat: number; lng: number })[] = [];
  const unplaced: string[] = [];
  for (const d of doors) {
    if (isFinitePoint(d)) placed.push(d);
    else unplaced.push(d.household_id);
  }

  // Partition by ward — a turf never spans two wards (the barrier proxy).
  const byWard = new Map<string, (DoorPoint & { lat: number; lng: number })[]>();
  for (const d of placed) {
    const key = d.ward ?? '';
    const bucket = byWard.get(key);
    if (bucket) bucket.push(d);
    else byWard.set(key, [d]);
  }

  const turfs: TurfCluster[] = [];
  // Stable ward order for deterministic output.
  const wardKeys = [...byWard.keys()].sort();
  for (const wardKey of wardKeys) {
    const wardDoors = byWard.get(wardKey) ?? [];
    if (wardDoors.length === 0) continue;

    const ordered = snakeOrder(wardDoors);
    // Number of turfs for this ward: round to nearest, at least one.
    const k = Math.max(1, Math.round(ordered.length / target));
    const chunks = evenChunks(ordered, k);
    for (const chunk of chunks) {
      const c = centroid(chunk);
      turfs.push({
        households: chunk.map((d) => d.household_id),
        centroid_lat: c.lat,
        centroid_lng: c.lng,
        ward: wardKey === '' ? null : wardKey,
      });
    }
  }

  return { turfs, placedCount: placed.length, unplaced };
}

/**
 * Preview math for the dialog ("~860 doors → 21 turfs of ~41 doors each"),
 * computed from the same engine so the preview can never disagree with the cut.
 */
export interface CutPreview {
  doors: number;
  unplaced: number;
  turfCount: number;
  avgDoorsPerTurf: number;
}

export function previewCut(doors: readonly DoorPoint[], targetDoors: number): CutPreview {
  const plan = cutTurfs(doors, targetDoors);
  const turfCount = plan.turfs.length;
  const avg = turfCount > 0 ? Math.round(plan.placedCount / turfCount) : 0;
  return { doors: plan.placedCount, unplaced: plan.unplaced.length, turfCount, avgDoorsPerTurf: avg };
}
