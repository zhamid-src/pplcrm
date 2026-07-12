import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BreadcrumbsService } from '@uxcommon/components/breadcrumbs/breadcrumbs.service';
import { beforeEach, describe, expect, it } from 'vitest';

import { BreadcrumbDefaultsService } from './breadcrumb-defaults.service';

@Component({ template: '' })
class BlankComponent {}

describe('BreadcrumbDefaultsService', () => {
  let router: Router;
  let breadcrumbs: BreadcrumbsService;
  let service: BreadcrumbDefaultsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: BlankComponent, data: { breadcrumb: 'Dashboard' } },
          {
            path: 'deliveries',
            data: { breadcrumb: 'Deliveries' },
            children: [
              { path: '', component: BlankComponent },
              { path: 'plan', component: BlankComponent, data: { breadcrumb: 'Plan routes' } },
            ],
          },
          {
            path: 'imports/new',
            component: BlankComponent,
            data: { breadcrumb: [{ label: 'Import / export', route: '/imports' }, { label: 'New import' }] },
          },
          { path: 'bare', component: BlankComponent },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    breadcrumbs = TestBed.inject(BreadcrumbsService);
    service = TestBed.inject(BreadcrumbDefaultsService);
    service.start();
  });

  it('publishes a single crumb from a top-level route', async () => {
    await router.navigateByUrl('/dashboard');
    expect(breadcrumbs.trail()?.crumbs).toEqual([{ label: 'Dashboard', route: '/dashboard' }]);
  });

  it('builds a trail from parent and child route data, linking each level', async () => {
    await router.navigateByUrl('/deliveries/plan');
    expect(breadcrumbs.trail()?.crumbs).toEqual([
      { label: 'Deliveries', route: '/deliveries' },
      { label: 'Plan routes', route: '/deliveries/plan' },
    ]);
  });

  it('does not duplicate a component-less parent label onto the child (inherited data)', async () => {
    await router.navigateByUrl('/deliveries');
    expect(breadcrumbs.trail()?.crumbs).toEqual([{ label: 'Deliveries', route: '/deliveries' }]);
  });

  it('spreads a pre-built PcBreadcrumb[] trail verbatim', async () => {
    await router.navigateByUrl('/imports/new');
    expect(breadcrumbs.trail()?.crumbs).toEqual([
      { label: 'Import / export', route: '/imports' },
      { label: 'New import' },
    ]);
  });

  it('replaces the previous trail on every navigation, even when the new route has no label', async () => {
    await router.navigateByUrl('/dashboard');
    await router.navigateByUrl('/bare');
    expect(breadcrumbs.trail()?.crumbs).toEqual([]);
  });

  it('start() is idempotent', async () => {
    service.start();
    await router.navigateByUrl('/dashboard');
    expect(breadcrumbs.trail()?.crumbs).toEqual([{ label: 'Dashboard', route: '/dashboard' }]);
  });
});
