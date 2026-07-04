import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../auth/auth-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let userSignal: ReturnType<typeof signal<{ role: string } | null>>;
  let mockSidebarSvc: { isMobileOpen: () => boolean };

  beforeEach(async () => {
    userSignal = signal<{ role: string } | null>(null);
    mockSidebarSvc = { isMobileOpen: () => false };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUserSignal: () => userSignal } },
        { provide: SidebarService, useValue: mockSidebarSvc },
      ],
    })
      // Child components (navbar/sidebar/alerts) have their own specs; here we
      // only exercise Dashboard's own DI wiring and computed state.
      .overrideComponent(Dashboard, { set: { template: '<div></div>' } })
      .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  it('is not in viewer mode for a non-viewer user', () => {
    userSignal.set({ role: 'admin' });
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as { isViewer: () => boolean }).isViewer()).toBe(false);
  });

  it('is in viewer mode when the current user has the viewer role', () => {
    userSignal.set({ role: 'viewer' });
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as { isViewer: () => boolean }).isViewer()).toBe(true);
  });

  it('is not in viewer mode when there is no signed-in user', () => {
    userSignal.set(null);
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as { isViewer: () => boolean }).isViewer()).toBe(false);
  });

  it('delegates isMobileOpen() to the sidebar service', () => {
    mockSidebarSvc.isMobileOpen = () => true;

    expect(fixture.componentInstance.isMobileOpen()).toBe(true);
  });
});
