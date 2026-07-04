import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/components/confirm-dialog.service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { HouseholdDuplicatesComponent } from './duplicates-households';

const household1 = {
  id: 'h1',
  street_num: '10',
  street1: 'Pine St',
  apt: '',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
  country: 'USA',
  created_at: '2024-01-01T00:00:00Z',
};

const household2 = {
  id: 'h2',
  street_num: '10',
  street1: 'Pine St',
  apt: '',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
  country: 'USA',
  created_at: '2024-03-01T00:00:00Z',
};

describe('HouseholdDuplicatesComponent', () => {
  let component: HouseholdDuplicatesComponent;
  let fixture: ComponentFixture<HouseholdDuplicatesComponent>;
  let mockHouseholdsSvc: any;
  let mockAlertSvc: any;
  let mockDialogSvc: any;

  beforeEach(async () => {
    mockHouseholdsSvc = {
      getPotentialDuplicates: vi.fn().mockResolvedValue({
        groups: [{ reason: 'Same address', households: [household1, household2] }],
        total: 1,
      }),
      mergeHouseholds: vi.fn().mockResolvedValue({ id: 'h1' }),
    };

    mockAlertSvc = { showError: vi.fn(), showSuccess: vi.fn() };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [HouseholdDuplicatesComponent],
      providers: [
        provideRouter([]),
        { provide: HouseholdsService, useValue: mockHouseholdsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdDuplicatesComponent);
    component = fixture.componentInstance;
  });

  it('should load household duplicate groups on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockHouseholdsSvc.getPotentialDuplicates).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(component.groups()).toHaveLength(1);
    const [group] = component.groups();
    expect(group?.items).toEqual([household1, household2]);
    expect(group?.selectedTargetId).toBe('h1');
    expect(group?.selectedSourceId).toBe('h2');
  });

  it('should build a readable display name from street and city/state', () => {
    expect(component.getDisplayNameForId([household1], 'h1')).toBe('10 Pine St in Seattle, WA');
  });

  it('should fall back to the household id when no address fields are present', () => {
    const bare = { id: 'h9', created_at: '2024-01-01T00:00:00Z' } as any;
    expect(component.getDisplayNameForId([bare], 'h9')).toBe('Household ID: h9');
  });

  it('should build the full comma-separated address for display', () => {
    expect(component.getFullAddress(household1)).toBe('10, Pine St, Seattle, WA, 98101, USA');
  });

  it('should report "No address details" when a household has no address fields at all', () => {
    expect(component.getFullAddress({} as any)).toBe('No address details');
  });

  it('should merge the selected household pair and remove the group on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.mergeGroup(0);

    expect(mockHouseholdsSvc.mergeHouseholds).toHaveBeenCalledWith('h1', 'h2');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Successfully merged into "10 Pine St in Seattle, WA"');
    expect(component.groups()).toEqual([]);
  });
});
