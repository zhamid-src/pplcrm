import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, beforeEach, beforeAll, it, expect } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Loader } from '@googlemaps/js-api-loader';
import { HouseholdsService } from '../services/households-service';
import { PersonsService } from '../../persons/services/persons-service';
import { TagsService } from '../../tags/services/tags-service';
import { HouseholdDetail } from './household-detail';

const mockHouseholdData = {
  id: '123',
  street_num: '1600',
  street1: 'Amphitheatre Pkwy',
  street2: '',
  apt: 'Suite 100',
  city: 'Mountain View',
  state: 'CA',
  zip: '94043',
  country: 'US',
  home_phone: '555-555-5555',
  notes: 'Google HQ',
  formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA',
  lat: 37.422,
  lng: -122.084,
  type: 'street_address',
  created_at: '2026-05-20T12:00:00Z',
  updated_at: '2026-05-20T13:00:00Z',
};

let component: HouseholdDetail;
let fixture: ComponentFixture<HouseholdDetail>;
let mockHouseholdsSvc: any;
let mockPersonsSvc: any;
let mockTagsSvc: any;
let mockAlertSvc: any;
let mockActivatedRoute: any;
let mockLoader: any;

const setupTestBed = async (mode: 'new' | 'edit') => {
  mockHouseholdsSvc = {
    getById: vi.fn().mockResolvedValue(mockHouseholdData),
    getTags: vi.fn().mockResolvedValue(['donor', 'volunteer']),
    getPeopleCount: vi.fn().mockResolvedValue(3),
    add: vi.fn().mockResolvedValue({ id: '456' }),
    update: vi.fn().mockResolvedValue(true),
    attachTag: vi.fn().mockResolvedValue(true),
    detachTag: vi.fn().mockResolvedValue(true),
    triggerRefresh: vi.fn(),
  };

  mockPersonsSvc = {
    getPeopleInHousehold: vi.fn().mockResolvedValue([]),
  };

  mockTagsSvc = {
    getAllWithCounts: vi.fn().mockResolvedValue([]),
    findByName: vi.fn().mockResolvedValue([]),
  };

  mockAlertSvc = {
    showSuccess: vi.fn(),
    showError: vi.fn(),
  };

  mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: vi.fn((key: string) => (key === 'id' ? '123' : null)),
      },
    },
  };

  mockLoader = {
    importLibrary: vi.fn().mockResolvedValue(true),
  };

  await TestBed.configureTestingModule({
    imports: [HouseholdDetail],
    providers: [
      provideRouter([]),
      { provide: HouseholdsService, useValue: mockHouseholdsSvc },
      { provide: PersonsService, useValue: mockPersonsSvc },
      { provide: TagsService, useValue: mockTagsSvc },
      { provide: AlertService, useValue: mockAlertSvc },
      { provide: ActivatedRoute, useValue: mockActivatedRoute },
      { provide: Loader, useValue: mockLoader },
    ],
  }).compileComponents();

  fixture = TestBed.createComponent(HouseholdDetail);
  component = fixture.componentInstance;

  // Set component input mode
  fixture.componentRef.setInput('mode', mode);
};

describe('HouseholdDetail', () => {
  beforeAll(() => {
    // Mock Google Maps API to prevent ngx-gp-autocomplete errors during instantiation
    (globalThis as any).google = {
      maps: {
        places: {
          Autocomplete: function () {
            return {
              addListener: vi.fn().mockReturnValue({
                remove: vi.fn(),
              }),
              getPlace: vi.fn(),
            };
          },
        },
      },
    };
  });

  describe('new mode', () => {
    beforeEach(async () => {
      await setupTestBed('new');
    });

    it('should initialize with empty form payload and not call service getById', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(component['id']).toBeNull();
      expect(mockHouseholdsSvc.getById).not.toHaveBeenCalled();
      expect(component['payload']().city).toBe('');
      expect(component['form']().dirty()).toBe(false);
    });

    it('should call householdsSvc.add when saving new household', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      component['payload'].update((prev) => ({
        ...prev,
        city: 'Vancouver',
        street1: 'Georgia St',
      }));

      // Trigger save
      component['save']();

      // Wait for tRPC mock response
      await mockHouseholdsSvc.add.mock.results[0].value;
      fixture.detectChanges();

      expect(mockHouseholdsSvc.add).toHaveBeenCalledWith({
        home_phone: '',
        street_num: '',
        street1: 'Georgia St',
        street2: '',
        apt: '',
        city: 'Vancouver',
        state: '',
        zip: '',
        country: '',
        notes: '',
      });
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Household added');
      expect(mockHouseholdsSvc.triggerRefresh).toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    beforeEach(async () => {
      await setupTestBed('edit');
    });

    it('should load household details, tags, and people count on init', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(component['id']).toBe('123');
      expect(mockHouseholdsSvc.getById).toHaveBeenCalledWith('123');
      expect(mockHouseholdsSvc.getTags).toHaveBeenCalledWith('123');
      expect(mockHouseholdsSvc.getPeopleCount).toHaveBeenCalledWith('123');

      const payload = component['payload']();
      expect(payload.city).toBe('Mountain View');
      expect(payload.street1).toBe('Amphitheatre Pkwy');
      expect(payload.notes).toBe('Google HQ');
      expect(component['tags']).toEqual(expect.arrayContaining(['donor', 'volunteer']));
      expect(component['peopleInHouseholdCount']()).toBe(3);
    });

    it('should update address details on handleAddressChange', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      const mockPlace: any = {
        address_components: [
          { long_name: '100', short_name: '100', types: ['street_number'] },
          { long_name: 'Robson St', short_name: 'Robson St', types: ['route'] },
          { long_name: 'Vancouver', short_name: 'Vancouver', types: ['locality'] },
          { long_name: 'BC', short_name: 'BC', types: ['administrative_area_level_1'] },
          { long_name: 'Canada', short_name: 'CA', types: ['country'] },
        ],
        formatted_address: '100 Robson St, Vancouver, BC, Canada',
        geometry: { location: { lat: () => 49.282, lng: () => -123.12 } },
        types: ['street_address'],
      };

      component.handleAddressChange(mockPlace);
      fixture.detectChanges();

      const payload = component['payload']();
      expect(payload.street_num).toBe('100');
      expect(payload.street1).toBe('Robson St');
      expect(payload.city).toBe('Vancouver');
      expect(payload.state).toBe('BC');
      expect(payload.country).toBe('CA');
      expect(payload.lat).toBe(49.282);
      expect(payload.lng).toBe(-123.12);
      expect(component['addressVerified']).toBe(true);
      expect(component['form']().dirty()).toBe(true);
    });

    it('should call householdsSvc.update when saving updated household', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      // Modify payload values
      component['payload'].update((prev) => ({
        ...prev,
        notes: 'Updated Google HQ Note',
      }));

      // Trigger save
      component['save']();

      // Wait for tRPC mock response
      await mockHouseholdsSvc.update.mock.results[0].value;
      fixture.detectChanges();

      expect(mockHouseholdsSvc.update).toHaveBeenCalledWith('123', {
        home_phone: '555-555-5555',
        street_num: '1600',
        street1: 'Amphitheatre Pkwy',
        street2: '',
        apt: 'Suite 100',
        city: 'Mountain View',
        state: 'CA',
        zip: '94043',
        country: 'US',
        notes: 'Updated Google HQ Note',
      });
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Household updated successfully.');
      expect(mockHouseholdsSvc.triggerRefresh).toHaveBeenCalled();
    });

    it('should call householdsSvc attachTag and detachTag when tag interactions occur', async () => {
      await component.ngOnInit();
      fixture.detectChanges();

      component['tagAdded']('new-tag');
      expect(mockHouseholdsSvc.attachTag).toHaveBeenCalledWith('123', 'new-tag');

      component['tagRemoved']('old-tag');
      expect(mockHouseholdsSvc.detachTag).toHaveBeenCalledWith('123', 'old-tag');
    });
  });
});
