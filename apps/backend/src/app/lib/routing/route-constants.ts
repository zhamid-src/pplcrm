// Deliveries routing constants (spec §14 / YARD-SIGN-ROUTES-PLAN §4). This is intentionally the
// simple model: fixed ~1-hour routes, straight-line-distance time estimates. No OR-tools, no
// external routing API. 1-hour neighbourhoods forgive estimate error.

/** Minutes spent at each stop: park, grab the sign, plant it, photo. User-tweakable in Advanced. */
export const SERVICE_MINUTES_PER_STOP = 5;
/** Residential driving speed used to turn distance into time. User-tweakable in Advanced. */
export const AVG_SPEED_KMH = 30;
/** Straight-line → road-distance fudge factor. */
export const ROAD_WINDING_FACTOR = 1.3;
/** The product promise: routes are sized to about an hour. */
export const TARGET_ROUTE_MINUTES = 60;
/** Stop adding stops past this, leaving a buffer for reality. */
export const ROUTE_FILL_TARGET_MIN = 52;
/** A stop whose nearest other stop is farther than this can't chain into a route → "isolated". */
export const OUTLIER_NEAREST_KM = 8;
/** O(n²) guard and a sane campaign ceiling for a single plan. */
export const MAX_STOPS_PER_PLAN = 500;
/** Default validity of a volunteer capability link. */
export const SHARE_TOKEN_TTL_DAYS = 30;
/** 2-opt improvement pass iteration cap. */
export const TWO_OPT_MAX_ITERATIONS = 200;
