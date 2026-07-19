import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import type * as RouterModuleType from '@angular/router';
import * as routerModule from '@angular/router';
import { Subject } from 'rxjs';
import { CustomRouteReuseStrategy } from './route-reuse-strategy';

const mockDestroyDetachedRouteHandle = vi.fn();

vi.mock('@angular/router', async (importOriginal) => {
  const original = await importOriginal<typeof RouterModuleType>();
  return {
    ...original,
    destroyDetachedRouteHandle: (handle: any) => mockDestroyDetachedRouteHandle(handle),
  };
});

describe('CustomRouteReuseStrategy', () => {
  let strategy: CustomRouteReuseStrategy;
  let mockRouter: any;
  let routerEvents$: Subject<any>;

  beforeEach(() => {
    mockDestroyDetachedRouteHandle.mockClear();
    routerEvents$ = new Subject<any>();
    mockRouter = {
      events: routerEvents$,
    };

    TestBed.configureTestingModule({
      providers: [CustomRouteReuseStrategy, { provide: Router, useValue: mockRouter }],
    });

    strategy = TestBed.inject(CustomRouteReuseStrategy);
  });

  it('should store and retrieve handles when reuse is enabled, keeping the handle cached across retrievals', () => {
    const route = { data: { shouldReuse: true, key: 'a' } } as unknown as ActivatedRouteSnapshot;
    const handle = {} as any;
    expect(strategy.shouldDetach(route)).toBe(true);
    strategy.store(route, handle);
    expect(strategy.shouldAttach(route)).toBe(true);
    // The router calls retrieve() twice per reattach (router-state creation,
    // then activation) — both calls must return the same handle.
    expect(strategy.retrieve(route)).toBe(handle);
    expect(strategy.shouldAttach(route)).toBe(true);
    expect(strategy.retrieve(route)).toBe(handle);
  });

  it('should not reuse routes when flag is false', () => {
    const route = { data: { shouldReuse: false, key: 'b' } } as unknown as ActivatedRouteSnapshot;
    expect(strategy.shouldDetach(route)).toBe(false);
    expect(strategy.shouldAttach(route)).toBe(false);
    expect(strategy.retrieve(route)).toBeNull();
    expect(strategy.shouldReuseRoute(route, { routeConfig: { path: 'other' } } as any)).toBe(false);
  });

  it('should handle store(route, null) by forgetting the handle without destroying it', () => {
    const route = { data: { shouldReuse: true, key: 'a' } } as unknown as ActivatedRouteSnapshot;
    const handle = {} as any;
    strategy.store(route, handle);
    expect(strategy.shouldAttach(route)).toBe(true);

    // The router calls store(route, null) right after re-attaching the handle
    // to an outlet — destroying it here would destroy the live component.
    strategy.store(route, null);
    expect(strategy.shouldAttach(route)).toBe(false);
    expect(mockDestroyDetachedRouteHandle).not.toHaveBeenCalled();
  });

  it('should evict the oldest route handle (LRU) when cache limit is exceeded', () => {
    // Store 5 routes
    const routes: ActivatedRouteSnapshot[] = [];
    const handles: any[] = [];
    for (let i = 0; i < 5; i++) {
      const key = `route-${i}`;
      routes.push({ data: { shouldReuse: true, key } } as unknown as ActivatedRouteSnapshot);
      handles.push({ name: `handle-${i}` } as any);
      strategy.store(routes[i], handles[i]);
    }

    // All 5 should be attached
    for (let i = 0; i < 5; i++) {
      expect(strategy.shouldAttach(routes[i])).toBe(true);
    }

    // Store a 6th route, which should evict route-0 (the oldest)
    const route5 = { data: { shouldReuse: true, key: 'route-5' } } as unknown as ActivatedRouteSnapshot;
    const handle5 = { name: 'handle-5' } as any;
    strategy.store(route5, handle5);

    // Check that route-0 is evicted and destroyed
    expect(strategy.shouldAttach(routes[0])).toBe(false);
    expect(mockDestroyDetachedRouteHandle).toHaveBeenCalledWith(handles[0]);

    // Routes 1-5 should still be attached
    for (let i = 1; i < 5; i++) {
      expect(strategy.shouldAttach(routes[i])).toBe(true);
    }
    expect(strategy.shouldAttach(route5)).toBe(true);
  });

  it('should clear all handlers when navigating to /signin or /signup', () => {
    const route1 = { data: { shouldReuse: true, key: 'a' } } as unknown as ActivatedRouteSnapshot;
    const handle1 = {} as any;
    strategy.store(route1, handle1);
    expect(strategy.shouldAttach(route1)).toBe(true);

    // Simulate NavigationEnd event to signin
    const navEvent = new routerModule.NavigationEnd(1, '/signin', '/signin');
    routerEvents$.next(navEvent);

    expect(strategy.shouldAttach(route1)).toBe(false);
  });
});
