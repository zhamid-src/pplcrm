/**
 * @fileoverview Custom route reuse strategy for intelligent component caching.
 * Provides selective route component caching based on route metadata configuration
 * to improve performance and preserve user state across navigation.
 */
import { Injectable, inject, Injector } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  destroyDetachedRouteHandle,
  DetachedRouteHandle,
  NavigationEnd,
  Router,
  RouteReuseStrategy,
} from '@angular/router';

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
 * - **Memory Management**: Controlled caching with explicit route keys, max size limits (LRU), and cleanup.
 *
 * **Configuration:**
 * Routes must include specific data properties to enable reuse:
 * - `shouldReuse: true` - Enables caching for the route
 * - `key: string` - Unique identifier for the cached route
 */
@Injectable()
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  /**
   * A map of route keys to their stored detached route handles.
   * Used to cache and restore route components.
   */
  private handlers = new Map<string, DetachedRouteHandle>();

  /**
   * The maximum number of route handles to cache.
   * When this limit is exceeded, the least recently used (oldest) handle is evicted.
   */
  private readonly maxCacheSize = 5;

  private injector = inject(Injector);
  private _router: Router | null = null;
  private isSubscribedToRouterEvents = false;

  private get router(): Router {
    if (!this._router) {
      this._router = this.injector.get(Router);
    }
    return this._router;
  }

  /**
   * Ensures subscription to Router events to clear the cache when navigating to auth routes.
   */
  private ensureRouterSubscription(): void {
    if (this.isSubscribedToRouterEvents) {
      return;
    }
    this.isSubscribedToRouterEvents = true;
    try {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          if (event.urlAfterRedirects.includes('/signin') || event.urlAfterRedirects.includes('/signup')) {
            this.clearAllHandlers();
          }
        }
      });
    } catch (e) {
      // Reset flag if router couldn't be resolved yet
      this.isSubscribedToRouterEvents = false;
    }
  }

  private getKey(route: ActivatedRouteSnapshot): string {
    return route.data['key'] || route.routeConfig?.path || 'unknown';
  }

  /**
   * Retrieves a previously stored route handle if reuse is enabled for the route.
   * Removes it from cache upon retrieval since it is now active.
   *
   * @param route - The route snapshot to retrieve the handle for.
   * @returns The stored route handle, or `null` if reuse is not enabled or not found.
   */
  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    this.ensureRouterSubscription();
    if (!route.data['shouldReuse']) {
      return null;
    }
    const key = this.getKey(route);
    const handle = this.handlers.get(key) || null;
    if (handle) {
      this.handlers.delete(key);
    }
    return handle;
  }

  /**
   * Determines whether a route should be reattached from cache.
   *
   * @param route - The route snapshot to check.
   * @returns `true` if a cached handle exists and reuse is enabled, otherwise `false`.
   */
  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return !!route.data['shouldReuse'] && this.handlers.has(this.getKey(route));
  }

  /**
   * Determines whether a route should be detached and stored for later reuse.
   *
   * @param route - The route snapshot to check.
   * @returns `true` if reuse is enabled for the route, otherwise `false`.
   */
  public shouldDetach(route: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return !!route.data['shouldReuse'];
  }

  /**
   * Determines whether the future route should be reused. This bypasses default Angular route reloading.
   *
   * @param future - The route being navigated to.
   * @returns `true` if reuse is enabled for the route, otherwise `false`.
   */
  public shouldReuseRoute(future: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return !!future.data['shouldReuse'];
  }

  /**
   * Stores a detached route handle for reuse if the route allows it.
   *
   * @param route - The route snapshot to store.
   * @param handle - The route handle to store.
   */
  public store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    this.ensureRouterSubscription();
    if (!route.data['shouldReuse']) {
      return;
    }
    const key = this.getKey(route);

    if (!handle) {
      this.clearHandle(key);
      return;
    }

    if (this.handlers.has(key)) {
      const oldHandle = this.handlers.get(key);
      if (oldHandle && oldHandle !== handle) {
        destroyDetachedRouteHandle(oldHandle);
      }
      this.handlers.delete(key);
    } else if (this.handlers.size >= this.maxCacheSize) {
      // Evict oldest (Map maintains insertion order, so keys().next().value is the oldest)
      const oldestKey = this.handlers.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestHandle = this.handlers.get(oldestKey);
        if (oldestHandle) {
          destroyDetachedRouteHandle(oldestHandle);
        }
        this.handlers.delete(oldestKey);
      }
    }

    this.handlers.set(key, handle);
  }

  private clearHandle(key: string): void {
    const handle = this.handlers.get(key);
    if (handle) {
      destroyDetachedRouteHandle(handle);
      this.handlers.delete(key);
    }
  }

  /**
   * Clears all stored route handles and properly destroys their components.
   */
  public clearAllHandlers(): void {
    this.handlers.forEach((handle) => {
      destroyDetachedRouteHandle(handle);
    });
    this.handlers.clear();
  }
}
