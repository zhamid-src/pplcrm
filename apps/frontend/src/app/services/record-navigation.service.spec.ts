import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecordNavigationService, injectRecordNavigation } from './record-navigation.service';

describe('RecordNavigationService', () => {
  let service: RecordNavigationService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordNavigationService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('setContext / positionOf', () => {
    it('returns a 1-based index and the total after setContext', () => {
      service.setContext('/people', ['a', 'b', 'c'], 3);

      expect(service.positionOf('/people', 'a')).toEqual({ index: 1, total: 3 });
      expect(service.positionOf('/people', 'b')).toEqual({ index: 2, total: 3 });
      expect(service.positionOf('/people', 'c')).toEqual({ index: 3, total: 3 });
    });

    it('returns null when the id is not in the tracked list', () => {
      service.setContext('/people', ['a', 'b', 'c'], 3);

      expect(service.positionOf('/people', 'missing')).toBeNull();
    });

    it('returns null when no context has ever been set for the entity key', () => {
      expect(service.positionOf('/unknown', 'a')).toBeNull();
    });
  });

  describe('adjacentId', () => {
    beforeEach(() => {
      service.setContext('/people', ['a', 'b', 'c'], 3);
    });

    it('returns the previous id in the middle of the list', () => {
      expect(service.adjacentId('/people', 'b', 'prev')).toBe('a');
    });

    it('returns the next id in the middle of the list', () => {
      expect(service.adjacentId('/people', 'b', 'next')).toBe('c');
    });

    it('returns null going "prev" from the first item (start boundary)', () => {
      expect(service.adjacentId('/people', 'a', 'prev')).toBeNull();
    });

    it('returns null going "next" from the last item (end boundary)', () => {
      expect(service.adjacentId('/people', 'c', 'next')).toBeNull();
    });

    it('returns null when the id is not tracked', () => {
      expect(service.adjacentId('/people', 'missing', 'next')).toBeNull();
    });
  });

  describe('sessionStorage fallback (simulating a page refresh)', () => {
    it('resolves position from sessionStorage when the in-memory context is for a different/absent entity', () => {
      service.setContext('/people', ['a', 'b', 'c'], 3);

      // A brand-new instance has no in-memory signal state, mirroring a fresh
      // page load / deep link, but shares the same sessionStorage.
      const freshService = new RecordNavigationService();

      expect(freshService.positionOf('/people', 'b')).toEqual({ index: 2, total: 3 });
      expect(freshService.adjacentId('/people', 'b', 'next')).toBe('c');
    });

    it('returns null when sessionStorage contains malformed JSON', () => {
      sessionStorage.setItem('pc-record-nav:/people', '{not valid json');

      const freshService = new RecordNavigationService();

      expect(freshService.positionOf('/people', 'a')).toBeNull();
    });

    it('returns null when sessionStorage contains ids that are not all strings', () => {
      sessionStorage.setItem('pc-record-nav:/people', JSON.stringify({ ids: [1, 2, 3], total: 3 }));

      const freshService = new RecordNavigationService();

      expect(freshService.positionOf('/people', '1')).toBeNull();
    });

    it('returns null when sessionStorage is missing the total field', () => {
      sessionStorage.setItem('pc-record-nav:/people', JSON.stringify({ ids: ['a', 'b'] }));

      const freshService = new RecordNavigationService();

      expect(freshService.positionOf('/people', 'a')).toBeNull();
    });

    it('returns null when there is nothing stored for the entity key at all', () => {
      const freshService = new RecordNavigationService();

      expect(freshService.positionOf('/people', 'a')).toBeNull();
    });
  });
});

describe('injectRecordNavigation', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockActivatedRoute: { snapshot: { pathFromRoot: Array<{ url: Array<{ path: string }> }> } };

  beforeEach(() => {
    sessionStorage.clear();

    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    // Mirrors the ActivatedRoute snapshot chain for a route like /people/2.
    mockActivatedRoute = {
      snapshot: {
        pathFromRoot: [{ url: [] }, { url: [{ path: 'people' }] }, { url: [{ path: '2' }] }],
      },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    const recordNav = TestBed.inject(RecordNavigationService);
    recordNav.setContext('/people', ['1', '2', '3'], 3);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('exposes position, prev/next availability, and aria labels derived from the route and id', () => {
    const handle = TestBed.runInInjectionContext(() => injectRecordNavigation('person', signal('2')));

    expect(handle.positionLabel()).toBe('2 of 3 filtered');
    expect(handle.hasPrev()).toBe(true);
    expect(handle.hasNext()).toBe(true);
    expect(handle.prevLabel()).toBe('Previous person');
    expect(handle.nextLabel()).toBe('Next person');
  });

  it('goToPrev navigates to the previous id in the entity route when one exists', () => {
    const handle = TestBed.runInInjectionContext(() => injectRecordNavigation('person', signal('2')));

    handle.goToPrev();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/people', '1']);
  });

  it('goToNext navigates to the next id in the entity route when one exists', () => {
    const handle = TestBed.runInInjectionContext(() => injectRecordNavigation('person', signal('2')));

    handle.goToNext();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/people', '3']);
  });

  it('does not navigate on goToPrev when already at the start of the list', () => {
    mockActivatedRoute.snapshot.pathFromRoot = [{ url: [] }, { url: [{ path: 'people' }] }, { url: [{ path: '1' }] }];
    const handle = TestBed.runInInjectionContext(() => injectRecordNavigation('person', signal('1')));

    expect(handle.hasPrev()).toBe(false);
    handle.goToPrev();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate on goToNext when already at the end of the list', () => {
    mockActivatedRoute.snapshot.pathFromRoot = [{ url: [] }, { url: [{ path: 'people' }] }, { url: [{ path: '3' }] }];
    const handle = TestBed.runInInjectionContext(() => injectRecordNavigation('person', signal('3')));

    expect(handle.hasNext()).toBe(false);
    handle.goToNext();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
