import { Injectable, inject, Injector } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  destroyDetachedRouteHandle,
  DetachedRouteHandle,
  NavigationEnd,
  Router,
  RouteReuseStrategy,
} from '@angular/router';

@Injectable()
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers = new Map<string, DetachedRouteHandle>();

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
    } catch (_e) {
      // Reset flag if router couldn't be resolved yet
      this.isSubscribedToRouterEvents = false;
    }
  }

  private getKey(route: ActivatedRouteSnapshot): string {
    return route.data['key'] || route.routeConfig?.path || 'unknown';
  }

  // Pure lookup — the router calls retrieve() twice per reattach (once while
  // building the router state, once at activation via shouldAttach). Deleting
  // here makes the second lookup miss, so the outlet creates a fresh component
  // instead of reattaching the stored one. The router clears a consumed handle
  // itself by calling store(route, null) after attaching.
  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    this.ensureRouterSubscription();
    if (!route.data['shouldReuse']) {
      return null;
    }
    return this.handlers.get(this.getKey(route)) ?? null;
  }

  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return !!route.data['shouldReuse'] && this.handlers.has(this.getKey(route));
  }

  public shouldDetach(route: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return !!route.data['shouldReuse'];
  }

  public shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    this.ensureRouterSubscription();
    return future.routeConfig === curr.routeConfig;
  }

  public store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    this.ensureRouterSubscription();
    if (!route.data['shouldReuse']) {
      return;
    }
    const key = this.getKey(route);

    if (!handle) {
      // store(route, null) is the router saying the handle was just re-attached
      // and is live in an outlet again — forget it WITHOUT destroying it.
      this.handlers.delete(key);
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

  public clearAllHandlers(): void {
    this.handlers.forEach((handle) => {
      destroyDetachedRouteHandle(handle);
    });
    this.handlers.clear();
  }
}
