import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { HouseholdsGrid } from './households-grid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { HouseholdsService } from '../services/households-service';
import { PersonsService } from '../../persons/services/persons-service';
import { CompaniesService } from '../../companies/services/companies-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DATA_GRID_CONFIG } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockHouseholdsService {
  deleteMany = vi.fn().mockResolvedValue(true);
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  count = vi.fn().mockResolvedValue(0);
  countDistinctWards = vi.fn().mockResolvedValue(0);
  abort = vi.fn();
  refreshCount = signal(0);
}

describe('HouseholdsGrid', () => {
  let component: HouseholdsGrid;
  let fixture: ComponentFixture<HouseholdsGrid>;

  let mockPersonsSvc: any;
  let mockDialogSvc: any;
  let mockAlertSvc: any;
  let mockHouseholdsSvc: any;
  let mockTagOptionsSvc: any;

  beforeEach(async () => {
    mockPersonsSvc = {
      getByHouseholdId: vi.fn().mockResolvedValue([{ id: 'person1' }, { id: 'person2' }]),
      removeHousehold: vi.fn().mockResolvedValue(true),
      deleteMany: vi.fn().mockResolvedValue(true),
      // pc-grain-tabs calls count() on all three grain services
      count: vi.fn().mockResolvedValue(0),
    };

    mockDialogSvc = {
      choose: vi.fn(),
    };

    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    mockHouseholdsSvc = new MockHouseholdsService();

    mockTagOptionsSvc = {
      getTagNames: vi.fn().mockResolvedValue(['tag1', 'tag2']),
    };

    await TestBed.configureTestingModule({
      imports: [HouseholdsGrid],
      providers: [
        provideRouter([]),
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: HouseholdsService, useValue: mockHouseholdsSvc },
        {
          provide: CompaniesService,
          useValue: { count: () => Promise.resolve(0), countWithCompany: () => Promise.resolve(0) },
        },
        {
          provide: DATA_GRID_CONFIG,
          useValue: { messages: { loadFailed: 'Failed to load', noDeletePermission: 'No permission' } },
        },
        { provide: AbstractAPIService, useValue: mockHouseholdsSvc },
        { provide: TagOptionsService, useValue: mockTagOptionsSvc },
      ],
    })
      .overrideComponent(HouseholdsGrid, {
        set: {
          providers: [{ provide: AbstractAPIService, useValue: mockHouseholdsSvc }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HouseholdsGrid);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toBeDefined();
  });

  it('should return false (fallback to default) when selected households have no people', async () => {
    const selected = [{ id: '4080', persons_count: 0, is_placeholder: false }];
    const result = await component['confirmDelete'](selected);
    expect(result).toBe(false);
    expect(mockDialogSvc.choose).not.toHaveBeenCalled();
    expect(mockHouseholdsSvc.deleteMany).not.toHaveBeenCalled();
  });

  it('should block deletion and show an error when the placeholder household is selected', async () => {
    const selected = [{ id: '9999', persons_count: 3, is_placeholder: true }];
    const result = await component['confirmDelete'](selected);
    expect(result).toBe(true); // Handled — blocked
    expect(mockAlertSvc.showError).toHaveBeenCalledWith(expect.stringContaining('placeholder'));
    expect(mockDialogSvc.choose).not.toHaveBeenCalled();
    expect(mockHouseholdsSvc.deleteMany).not.toHaveBeenCalled();
  });

  it('should prompt user when selected households have people', async () => {
    const selected = [{ id: '4081', persons_count: '2', is_placeholder: false }];
    mockDialogSvc.choose.mockResolvedValue(null); // User cancels

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true); // Handled
    expect(mockPersonsSvc.getByHouseholdId).toHaveBeenCalledWith('4081', { columns: ['id'] });
    expect(mockDialogSvc.choose).toHaveBeenCalled();
    expect(mockHouseholdsSvc.deleteMany).not.toHaveBeenCalled();
  });

  it('should detach people and delete households when user chooses keep-people', async () => {
    const selected = [{ id: '4081', persons_count: 2, is_placeholder: false }];
    mockDialogSvc.choose.mockResolvedValue('keep-people');

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockPersonsSvc.removeHousehold).toHaveBeenCalledWith('person1');
    expect(mockPersonsSvc.removeHousehold).toHaveBeenCalledWith('person2');
    expect(mockHouseholdsSvc.deleteMany).toHaveBeenCalledWith(['4081']);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Households deleted successfully.');
  });

  it('should delete people and delete households when user chooses delete-people', async () => {
    const selected = [{ id: '4081', persons_count: 2, is_placeholder: false }];
    mockDialogSvc.choose.mockResolvedValue('delete-people');

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockPersonsSvc.deleteMany).toHaveBeenCalledWith(['person1', 'person2']);
    expect(mockHouseholdsSvc.deleteMany).toHaveBeenCalledWith(['4081']);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Households deleted successfully.');
  });

  it('should prevent selection of placeholder households via rowCanSelectFn', () => {
    expect(component.rowCanSelectFn({ is_placeholder: true })).toBe(false);
    expect(component.rowCanSelectFn({ is_placeholder: false })).toBe(true);
  });

  it('should format street1 as "People with no addresses" for placeholder households', () => {
    const street1Col = component['col'].find((c) => c.field === 'street1');
    expect(street1Col).toBeDefined();
    expect(street1Col?.valueFormatter).toBeDefined();

    const formattedPlaceholder = street1Col?.valueFormatter?.({
      data: { is_placeholder: true },
      value: null,
    } as any);
    expect(formattedPlaceholder).toBe('People with no addresses');

    const formattedRegular = street1Col?.valueFormatter?.({
      data: { is_placeholder: false },
      value: '123 Main St',
    } as any);
    expect(formattedRegular).toBe('123 Main St');
  });

  it('should prevent inline editing for placeholder households', () => {
    fixture.detectChanges();

    const street1Col = component['col'].find((c) => c.field === 'street1');
    expect(street1Col).toBeDefined();

    const grid = component['grid']();
    expect(grid).toBeDefined();

    // With a placeholder household, editing should be disabled
    const placeholderCfg = grid!.editableCfg({ is_placeholder: true }, street1Col);
    expect(placeholderCfg.isEditable()).toBe(false);

    // With a regular household, editing should be enabled
    const regularCfg = grid!.editableCfg({ is_placeholder: false }, street1Col);
    expect(regularCfg.isEditable()).toBe(true);
  });
});
