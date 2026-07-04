import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
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

  function setup(url: string, item?: { name: string; route: string; favourite?: boolean }) {
    mockRouter = { currentNavigation: () => null, url };
    mockSidebarSvc = {
      findItemForUrl: vi.fn().mockReturnValue(item),
      toggleFavourite: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      imports: [FavouriteToggle],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: SidebarService, useValue: mockSidebarSvc },
      ],
    });

    fixture = TestBed.createComponent(FavouriteToggle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows the toggle when the URL exactly matches a sidebar item route', () => {
    setup('/people', { name: 'People', route: '/people' });

    expect(fixture.debugElement.query(By.css('button'))).toBeTruthy();
  });

  it('hides the toggle on a record detail page (URL is only a prefix of the item route)', () => {
    setup('/people/123', { name: 'People', route: '/people' });

    expect(fixture.debugElement.query(By.css('button'))).toBeFalsy();
  });

  it('hides the toggle when no sidebar item matches the URL', () => {
    setup('/unknown', undefined);

    expect(fixture.debugElement.query(By.css('button'))).toBeFalsy();
  });

  it('reflects an already-favourited item as favourite', () => {
    setup('/people', { name: 'People', route: '/people', favourite: true });

    expect((component as unknown as { favourite: () => boolean }).favourite()).toBe(true);
  });

  it('toggleFavourite() flips the favourite state via the sidebar service', () => {
    setup('/people', { name: 'People', route: '/people', favourite: false });

    (component as unknown as { toggleFavourite: () => void }).toggleFavourite();

    expect(mockSidebarSvc.toggleFavourite).toHaveBeenCalledWith('/people');
    expect((component as unknown as { favourite: () => boolean }).favourite()).toBe(true);
  });

  it('toggleFavourite() is a no-op when there is no matched item', () => {
    setup('/unknown', undefined);

    (component as unknown as { toggleFavourite: () => void }).toggleFavourite();

    expect(mockSidebarSvc.toggleFavourite).not.toHaveBeenCalled();
  });

  it('normalizes trailing slashes and query strings when matching the current URL', () => {
    setup('/people/?tab=active', { name: 'People', route: '/people/' });

    expect((component as unknown as { canToggleFavourite: () => boolean }).canToggleFavourite()).toBe(true);
  });
});
