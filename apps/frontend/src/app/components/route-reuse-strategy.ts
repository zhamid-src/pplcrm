/**
 * @fileoverview Custom route reuse strategy for intelligent component caching.
 * Provides selective route component caching based on route metadata configuration
 * to improve performance and preserve user state across navigation.
 */
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * Custom route reuse strategy for intelligent component caching and state preservation.
 *
 * This strategy extends Angular's default routing behavior to selectively cache and reuse
 * route components based on route configuration metadata. It provides fine-grained control
 * over which routes should be cached, improving performance and user experience.
 *
 * **Key Benefits:**
 * - **Performance**: Avoid re-creating expensive components
 * - **State Preservation**: Maintain form data, scroll position, and component state
 * - **Selective Caching**: Only cache routes that explicitly opt-in
 * - **Memory Management**: Controlled caching with explicit route keys
 *
 * **Configuration:**
 * Routes must include specific data properties to enable reuse:
 * - `shouldReuse: true` - Enables caching for the route
 * - `key: string` - Unique identifier for the cached route
 *
 * **Use Cases:**
 * - Data grids with filters and pagination state
 * - Complex forms with user input
 * - Dashboard components with expensive calculations
 * - Search results with applied filters
 *
 * @example
 * ```typescript
 * // In app.routes.ts
 * {
 *   path: 'persons',
 *   component: PersonsGridComponent,
 *   data: {
 *     shouldReuse: true,
 *     key: 'persons-grid'
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * {
 *   provide: RouteReuseStrategy,
 *   useClass: CustomRouteReuseStrategy
 * }
 * ```
 */
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  /**
   * A map of route keys to their stored detached route handles.
   * Used to cache and restore route components.
   */
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  /**
   * Retrieves a previously stored route handle if reuse is enabled for the route.
   *
   * @param route - The route snapshot to retrieve the handle for.
   * @returns The stored route handle, or `false` if reuse is not enabled.
   */
  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null | false {
    return route.data['shouldReuse'] ? this.handlers[route.data['key']] : false;
  }

  /**
   * Determines whether a route should be reattached from cache.
   *
   * @param route - The route snapshot to check.
   * @returns `true` if a cached handle exists and reuse is enabled, otherwise `false`.
   */
  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['shouldReuse'] && !!this.handlers[route.data['key']];
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
      this.handlers[route.data['key']] = handle;
    }
  }
}
