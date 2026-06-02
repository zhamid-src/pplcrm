import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Loader } from '@googlemaps/js-api-loader';
import { HouseholdsService } from '../services/households-service';
import { HouseholdView } from './household-view';

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

let component: HouseholdView;
let fixture: ComponentFixture<HouseholdView>;
let mockHouseholdsSvc: any;
let mockAlertSvc: any;
let mockActivatedRoute: any;
let mockLoader: any;

describe('HouseholdView', () => {
  beforeEach(async () => {
    mockHouseholdsSvc = {
      getById: vi.fn().mockResolvedValue(mockHouseholdData),
      getTags: vi.fn().mockResolvedValue(['donor', 'volunteer']),
      getPeopleCount: vi.fn().mockResolvedValue(3),
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
      importLibrary: vi.fn().mockImplementation((name: string) => {
        if (name === 'marker') {
          return Promise.resolve({
            AdvancedMarkerElement: vi.fn().mockImplementation(() => ({})),
          });
        }
        return Promise.resolve({
          Map: vi.fn().mockImplementation(() => ({})),
        });
      }),
    };

    // Mock global google maps namespace
    global.google = {
      maps: {
        Map: vi.fn().mockImplementation(() => ({})),
        Marker: vi.fn().mockImplementation(() => ({})),
        marker: {
          AdvancedMarkerElement: vi.fn().mockImplementation(() => ({})),
        },
      },
    } as any;

    await TestBed.configureTestingModule({
      imports: [HouseholdView],
      providers: [
        provideRouter([]),
        { provide: HouseholdsService, useValue: mockHouseholdsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Loader, useValue: mockLoader },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdView);
    component = fixture.componentInstance;
  });

  it('should initialize and load household details, tags, and people count', async () => {
    await component['loadAllData']();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component['id']).toBe('123');
    expect(mockHouseholdsSvc.getById).toHaveBeenCalledWith('123');
    expect(mockHouseholdsSvc.getTags).toHaveBeenCalledWith('123', 'tag');
    expect(mockHouseholdsSvc.getPeopleCount).toHaveBeenCalledWith('123');

    expect(component['household']()).toEqual(mockHouseholdData);
    expect(component['tags']()).toEqual(['donor', 'volunteer']);
    expect(component['peopleCount']()).toBe(3);
    expect(component['addressString']()).toBe('1600 Amphitheatre Pkwy, Mountain View, CA');
  });

  it('should copy text to clipboard and show success alert', async () => {
    const clipboardMock = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboardMock,
      writable: true,
    });

    component['copyToClipboard']('555-555-5555', 'Phone');
    expect(clipboardMock.writeText).toHaveBeenCalledWith('555-555-5555');

    // Allow promise resolve microtasks
    await new Promise((r) => setTimeout(r, 0));
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Phone copied to clipboard');
  });

  it('should format addressString from individual fields when formatted_address is empty', async () => {
    await component['loadAllData']();
    fixture.detectChanges();

    component['household'].set({
      ...mockHouseholdData,
      formatted_address: '',
      apt: '2B',
      street_num: '10',
      street1: 'Pine St',
      street2: '',
      city: 'Seattle',
      state: 'WA',
      zip: '98101',
      country: 'USA',
    });
    fixture.detectChanges();

    expect(component['addressString']()).toBe('Apt 2B 10 Pine St, Seattle, WA, 98101, USA');
  });
});
