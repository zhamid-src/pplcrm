import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
    return route.data['shouldReuse'] ? this.handlers[route.data['key']] : false;
  }

  public shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['shouldReuse'] && !!this.handlers[route.data['key']];
  }

  public shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.data['shouldReuse'];
  }

  public shouldReuseRoute(future: ActivatedRouteSnapshot): boolean {
    return !!future.data['shouldReuse'];
  }

  public store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if (route.data['shouldReuse']) {
      this.handlers[route.data['key']] = handle;
    }
  }
}
