import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from "@angular/router";

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  // Add all the paths we want to reuse. Generally, we want paths that download
  // a lot of data here
  private routesToReuse: string[] = [
    "summary",
    "people",
    "households",
    "canvassing",
    "map",
    "emails",
    "lists",
    "tags",
    "volunteers",
    "teams",
    "donors",
    "donations",
    "forms",
  ];
  private routeStore = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path;
    return (path && this.routesToReuse.includes(path)) || false;
  }
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    route.routeConfig?.path &&
      this.routeStore.set(route.routeConfig.path, handle);
  }
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = route.routeConfig?.path;
    return (
      (path &&
        this.routesToReuse.includes(path) &&
        !!this.routeStore.get(path)) ||
      false
    );
  }
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
    const path = route.routeConfig?.path;
    return (path && this.routeStore.get(path)) || false;
  }
  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
