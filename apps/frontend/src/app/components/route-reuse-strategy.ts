import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * A custom route reuse strategy to control caching and reusing of Angular routes
 * based on route-specific metadata (`shouldReuse` and `key` in `data`).
 *
 * This can be used to preserve component state, improve performance, or provide a smoother UX
 * when navigating back to previously visited routes.
 */
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  /**
   * A map of route keys to their stored detached route handles.
   * Used to cache and restore route components.
   */
  private _handlers: { [key: string]: DetachedRouteHandle } = {};

  /**
   * Retrieves a previously stored route handle if reuse is enabled for the route.
   *
   * @param route - The route snapshot to retrieve the handle for.
   * @returns The stored route handle, or `false` if reuse is not enabled.
   */
  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null | false {
    return route.data['shouldReuse'] ? this._handlers[route.data['key']] : false;
  }

  /**
   * Determines whether a route should be reattached from cache.
   *
   * @param route - The route snapshot to check.
   * @returns `true` if a cached handle exists and reuse is enabled, otherwise `false`.
   */
  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['shouldReuse'] && !!this._handlers[route.data['key']];
  }

  /**
   * Determines whether a route should be detached and stored for later reuse.
   *
   * @param route - The route snapshot to check.
   * @returns `true` if reuse is enabled for the route, otherwise `false`.
   */
  public shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['shouldReuse'];
  }

  /**
   * Determines whether the future route should be reused. This bypasses default Angular route reloading.
   *
   * @param future - The route being navigated to.
   * @returns `true` if reuse is enabled for the route, otherwise `false`.
   */
  public shouldReuseRoute(future: ActivatedRouteSnapshot): boolean {
    return !!future.data['shouldReuse'];
  }

  /**
   * Stores a detached route handle for reuse if the route allows it.
   *
   * @param route - The route snapshot to store.
   * @param handle - The route handle to store.
   */
  public store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if (route.data['shouldReuse']) {
      this._handlers[route.data['key']] = handle;
    }
  }
}
