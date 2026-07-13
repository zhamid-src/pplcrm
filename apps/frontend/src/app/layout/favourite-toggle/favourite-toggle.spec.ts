import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { describe, expect, it, vi } from 'vitest';
import { FavouriteToggle } from './favourite-toggle';
import { SidebarService } from '../sidebar/sidebar-service';

describe('FavouriteToggle', () => {
  let fixture: ComponentFixture<FavouriteToggle>;
  let component: FavouriteToggle;
  let mockRouter: { currentNavigation: () => null; url: string };
  let mockSidebarSvc: {
    findItemForUrl: ReturnType<typeof vi.fn>;
    toggleFavourite: ReturnType<typeof vi.fn>;
  };
  let mockAlertSvc: {
    showInfo: ReturnType<typeof vi.fn>;
    showSuccess: ReturnType<typeof vi.fn>;
  };

  function setup(url: string, item?: { name: string; route: string; favourite?: boolean }) {
    mockRouter = { currentNavigation: () => null, url };
    mockSidebarSvc = {
      findItemForUrl: vi.fn().mockReturnValue(item),
      toggleFavourite: vi.fn().mockReturnValue(true),
    };
    mockAlertSvc = {
      showInfo: vi.fn(),
      showSuccess: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [FavouriteToggle],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: SidebarService, useValue: mockSidebarSvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    });

    fixture = TestBed.createComponent(FavouriteToggle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function clickButton(): void {
    fixture.debugElement.query(By.css('button')).triggerEventHandler('click');
  }

  it('shows an active (pinnable) toggle when the URL exactly matches a sidebar item route', () => {
    setup('/people', { name: 'People', route: '/people' });

    const button = fixture.debugElement.query(By.css('button'));
    expect(button).toBeTruthy();
    expect(button.attributes['data-tip']).toBe('Pin People to the sidebar');
  });

  it('keeps the toggle visible but dimmed on a record detail page, with the reason in the tooltip (§2 disclosure over suppression)', () => {
    setup('/people/123', { name: 'People', route: '/people' });

    const button = fixture.debugElement.query(By.css('button'));
    expect(button).toBeTruthy();
    expect(button.attributes['data-tip']).toBe('Only main pages can be pinned. Open People to pin it');
  });

  it('hides the toggle when no sidebar item matches the URL', () => {
    setup('/unknown', undefined);

    expect(fixture.debugElement.query(By.css('button'))).toBeFalsy();
  });

  it('reflects an already-favourited item as favourite', () => {
    setup('/people', { name: 'People', route: '/people', favourite: true });

    expect((component as unknown as { favourite: () => boolean }).favourite()).toBe(true);
  });

  it('clicking the pinnable toggle flips the favourite state via the sidebar service and narrates it', () => {
    setup('/people', { name: 'People', route: '/people', favourite: false });

    clickButton();

    expect(mockSidebarSvc.toggleFavourite).toHaveBeenCalledWith('/people');
    expect((component as unknown as { favourite: () => boolean }).favourite()).toBe(true);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Pinned People to the sidebar.');
  });

  it('clicking on a record page narrates the reason as a toast instead of pinning', () => {
    setup('/people/123', { name: 'People', route: '/people' });

    clickButton();

    expect(mockSidebarSvc.toggleFavourite).not.toHaveBeenCalled();
    expect(mockAlertSvc.showInfo).toHaveBeenCalledWith('Only main pages can be pinned. Open People to pin it.');
  });

  it('normalizes trailing slashes and query strings when matching the current URL', () => {
    setup('/people/?tab=active', { name: 'People', route: '/people/' });

    expect((component as unknown as { pinnable: () => boolean }).pinnable()).toBe(true);
  });
});
