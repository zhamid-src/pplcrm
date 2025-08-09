import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomRouteReuseStrategy } from './route-reuse-strategy';

describe('CustomRouteReuseStrategy', () => {
  let strategy: CustomRouteReuseStrategy;

  beforeEach(() => {
    strategy = new CustomRouteReuseStrategy();
  });

  it('should store and retrieve handles when reuse is enabled', () => {
    const route = { data: { shouldReuse: true, key: 'a' } } as unknown as ActivatedRouteSnapshot;
    const handle = {} as any;
    expect(strategy.shouldDetach(route)).toBe(true);
    strategy.store(route, handle);
    expect(strategy.shouldAttach(route)).toBe(true);
    expect(strategy.retrieve(route)).toBe(handle);
  });

  it('should not reuse routes when flag is false', () => {
    const route = { data: { shouldReuse: false, key: 'b' } } as unknown as ActivatedRouteSnapshot;
    expect(strategy.shouldDetach(route)).toBe(false);
    expect(strategy.shouldAttach(route)).toBe(false);
    expect(strategy.retrieve(route)).toBe(false);
    expect(strategy.shouldReuseRoute(route)).toBe(false);
  });
});
