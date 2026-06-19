import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonsGrid } from './persons-grid';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { PersonsService } from '../services/persons-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DATA_GRID_CONFIG } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockPersonsService {
  deleteMany = vi.fn().mockResolvedValue(true);
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
  import = vi.fn();
}

describe('PersonsGrid', () => {
  let component: PersonsGrid;
  let fixture: ComponentFixture<PersonsGrid>;

  let mockPersonsSvc: MockPersonsService;
  let mockDialogSvc: any;
  let mockAlertSvc: any;
  let mockTagOptionsSvc: any;

  beforeEach(async () => {
    mockPersonsSvc = new MockPersonsService();

    mockDialogSvc = {
      confirm: vi.fn(),
    };

    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    mockTagOptionsSvc = {
      getTagNames: vi.fn().mockResolvedValue(['tag1', 'tag2']),
    };

    await TestBed.configureTestingModule({
      imports: [PersonsGrid],
      providers: [
        provideRouter([]),
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        {
          provide: DATA_GRID_CONFIG,
          useValue: {
            messages: {
              deleteConfirmTitle: 'Delete rows',
              deleteConfirmMessage: 'Confirm delete',
              deleteConfirmVariant: 'danger',
              deleteConfirmIcon: 'trash',
              deleteConfirmText: 'Delete',
              deleteCancelText: 'Cancel',
              deleteSuccess: 'Deleted successfully',
              deleteFailed: 'Delete failed',
            },
          },
        },
        { provide: AbstractAPIService, useValue: mockPersonsSvc },
        { provide: TagOptionsService, useValue: mockTagOptionsSvc },
      ],
    })
      .overrideComponent(PersonsGrid, {
        set: {
          providers: [{ provide: AbstractAPIService, useValue: mockPersonsSvc }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PersonsGrid);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toBeDefined();
  });

  it('should stop deletion when first delete confirmation is rejected', async () => {
    const selected = [{ id: 'p1', first_name: 'John' }];
    mockDialogSvc.confirm.mockResolvedValue(false); // User clicks cancel

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockDialogSvc.confirm).toHaveBeenCalledTimes(1);
    expect(mockPersonsSvc.deleteMany).not.toHaveBeenCalled();
  });

  it('should execute deleteMany without force on successful initial confirmation', async () => {
    const selected = [{ id: 'p1', first_name: 'John' }];
    mockDialogSvc.confirm.mockResolvedValue(true); // User clicks confirm

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockDialogSvc.confirm).toHaveBeenCalledTimes(1);
    expect(mockPersonsSvc.deleteMany).toHaveBeenCalledWith(['p1'], undefined, true);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Deleted successfully');
  });

  it('should show team captain warning on exception and retry with force if approved', async () => {
    const selected = [{ id: 'p1', first_name: 'Captain Jack' }];
    mockDialogSvc.confirm
      .mockResolvedValueOnce(true) // Initial confirm
      .mockResolvedValueOnce(true); // Captain warning confirm

    // Simulate TRPC failure for team captain
    const captainError = new Error(
      'One or more selected people are team captains. Deleting them will remove them as captain. Do you want to proceed?',
    );
    mockPersonsSvc.deleteMany
      .mockRejectedValueOnce(captainError) // First call fails
      .mockResolvedValueOnce(true); // Second forced call succeeds

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockDialogSvc.confirm).toHaveBeenCalledTimes(2);
    expect(mockPersonsSvc.deleteMany).toHaveBeenNthCalledWith(1, ['p1'], undefined, true);
    expect(mockPersonsSvc.deleteMany).toHaveBeenNthCalledWith(2, ['p1'], true, true);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Deleted successfully');
  });

  it('should not retry deletion if team captain warning is rejected', async () => {
    const selected = [{ id: 'p1', first_name: 'Captain Jack' }];
    mockDialogSvc.confirm
      .mockResolvedValueOnce(true) // Initial confirm
      .mockResolvedValueOnce(false); // Captain warning reject

    const captainError = new Error(
      'One or more selected people are team captains. Deleting them will remove them as captain. Do you want to proceed?',
    );
    mockPersonsSvc.deleteMany.mockRejectedValueOnce(captainError);

    const result = await component['confirmDelete'](selected);

    expect(result).toBe(true);
    expect(mockDialogSvc.confirm).toHaveBeenCalledTimes(2);
    expect(mockPersonsSvc.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPersonsSvc.deleteMany).toHaveBeenCalledWith(['p1'], undefined, true);
    expect(mockAlertSvc.showSuccess).not.toHaveBeenCalled();
  });
});
