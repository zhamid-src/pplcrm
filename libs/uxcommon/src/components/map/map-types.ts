/**
 * Shared value types for the single Google Maps primitive, `<pc-map>`.
 *
 * These are the binding contract consumed by §6 (household card), §13
 * (canvassing turf polygons) and §14 (delivery routes / per-door dots). Keep
 * them free of any Google Maps SDK types so consumers and unit tests can build
 * marker/polygon inputs without loading the SDK.
 */

/** A plain latitude/longitude pair (never a `google.maps.LatLng`). */
export interface PcLatLng {
  lat: number;
  lng: number;
}

/**
 * Semantic colour bucket. Maps 1:1 to a DaisyUI `--color-*` token, resolved at
 * runtime so overlays stay correct across a light/dark theme flip. `muted`
 * resolves to `base-content` at reduced opacity.
 */
export type PcMapVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'muted';

/** One point marker. `payload` is echoed back on `markerClicked`. */
export interface PcMapMarker<T = unknown> {
  position: PcLatLng;
  variant?: PcMapVariant;
  tooltip?: string;
  id?: string;
  payload?: T;
}

/** One filled polygon (a turf boundary). `payload` is echoed on `polygonClicked`. */
export interface PcMapPolygon<T = unknown> {
  path: PcLatLng[];
  variant?: PcMapVariant;
  label?: string;
  dashed?: boolean;
  id?: string;
  payload?: T;
}
