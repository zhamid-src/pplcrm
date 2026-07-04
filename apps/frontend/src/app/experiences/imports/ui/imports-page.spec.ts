import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ImportsPage } from './imports-page';
import { ImportsService } from '../services/imports-service';

const baseItem = {
  id: '1',
  fileName: 'contacts.csv',
  source: 'csv',
  tagName: 'Import 2026',
  tagMissing: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  processedAt: new Date('2026-01-01T00:05:00Z'),
  createdBy: { id: 'u1', name: 'Admin', email: 'admin@example.com' },
  insertedCount: 10,
  errorCount: 0,
  skippedCount: 0,
  rowCount: 10,
  householdsCreated: 3,
  contactCount: 10,
  householdCount: 3,
  companyCount: 0,
  taskCount: 0,
  status: 'completed' as const,
};

describe('ImportsPage', () => {
  let component: ImportsPage;
  let fixture: ComponentFixture<ImportsPage>;
  let mockImportsSvc: any;
  let mockAlertSvc: any;

  beforeEach(async () => {
    mockImportsSvc = {
      list: vi.fn().mockResolvedValue([baseItem]),
      delete: vi.fn().mockResolvedValue(true),
      abort: vi.fn(),
    };
    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ImportsPage],
      providers: [
        { provide: ImportsService, useValue: mockImportsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('should load imports on creation and expose the item count', async () => {
    await fixture.whenStable();

    expect(mockImportsSvc.list).toHaveBeenCalled();
    expect(component['items']()).toEqual([baseItem]);
    expect(component['itemCount']()).toBe(1);
    expect(component['error']()).toBeNull();
  });

  it('should set an error and show an alert when loading fails with a plain Error', async () => {
    fixture.destroy();
    mockImportsSvc.list.mockRejectedValue(new Error('Network down'));

    fixture = TestBed.createComponent(ImportsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component['error']()).toBe('Network down');
    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Network down');
  });

  it('should extract a tRPC error message when loading fails without a plain Error', async () => {
    fixture.destroy();
    mockImportsSvc.list.mockRejectedValue({ data: { message: 'Server exploded' } });

    fixture = TestBed.createComponent(ImportsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component['error']()).toBe('Server exploded');
  });

  it('should format a date value using the locale date/time style', async () => {
    await fixture.whenStable();

    const formatted = component['formatDate'](new Date('2026-01-01T00:05:00Z'));
    expect(formatted).toEqual(expect.any(String));
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should open the delete dialog and populate pendingDelete', async () => {
    await fixture.whenStable();
    const dialog = { showModal: vi.fn(), close: vi.fn(), open: true } as unknown as HTMLDialogElement;

    component['openDeleteDialog'](baseItem, dialog);

    expect(component['pendingDelete']()).toEqual(baseItem);
    expect(dialog.showModal).toHaveBeenCalled();
  });

  it('should reset checkbox selections when the delete dialog is closed', async () => {
    await fixture.whenStable();
    const dialog = { showModal: vi.fn(), close: vi.fn(), open: true } as unknown as HTMLDialogElement;

    component['openDeleteDialog'](baseItem, dialog);
    component['deletePeople'].set(true);
    component['deleteHouseholds'].set(true);

    component['closeDeleteDialog'](dialog);
    // The reset lives in an effect() watching pendingDelete(), which flushes
    // on the next change detection rather than synchronously.
    fixture.detectChanges();

    expect(dialog.close).toHaveBeenCalled();
    expect(component['pendingDelete']()).toBeNull();
    expect(component['deletePeople']()).toBe(false);
    expect(component['deleteHouseholds']()).toBe(false);
  });

  it('should delete the pending import with selected options and reload the list', async () => {
    await fixture.whenStable();
    const dialog = { showModal: vi.fn(), close: vi.fn(), open: true } as unknown as HTMLDialogElement;
    component['openDeleteDialog'](baseItem, dialog);
    component['deletePeople'].set(true);
    component['deleteTasks'].set(true);
    mockImportsSvc.list.mockClear();
    mockImportsSvc.list.mockResolvedValue([]);

    await component['confirmDelete'](dialog);

    expect(mockImportsSvc.delete).toHaveBeenCalledWith('1', {
      deletePeople: true,
      deleteHouseholds: false,
      deleteCompanies: false,
      deleteTasks: true,
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Import deleted');
    expect(mockImportsSvc.list).toHaveBeenCalled();
    expect(dialog.close).toHaveBeenCalled();
    expect(component['deleting']()).toBe(false);
  });

  it('should show an error alert and keep the dialog open when delete fails', async () => {
    await fixture.whenStable();
    const dialog = { showModal: vi.fn(), close: vi.fn(), open: true } as unknown as HTMLDialogElement;
    component['openDeleteDialog'](baseItem, dialog);
    mockImportsSvc.delete.mockRejectedValue(new Error('Import in use'));

    await component['confirmDelete'](dialog);

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Import in use');
    expect(dialog.close).not.toHaveBeenCalled();
    expect(component['deleting']()).toBe(false);
  });

  it('should reload the items when refresh is invoked', async () => {
    await fixture.whenStable();
    mockImportsSvc.list.mockClear();
    mockImportsSvc.list.mockResolvedValue([{ ...baseItem, id: '2' }]);

    await component['refresh']();

    expect(mockImportsSvc.list).toHaveBeenCalled();
    expect(component['items']()).toEqual([{ ...baseItem, id: '2' }]);
  });

  it('should refresh items during polling only while a job is pending or processing', async () => {
    await fixture.whenStable();
    mockImportsSvc.list.mockClear();

    // No active jobs: pollStep should not query the server again.
    await component['pollStep']();
    expect(mockImportsSvc.list).not.toHaveBeenCalled();

    // With an active job, pollStep should refresh the list.
    component['items'].set([{ ...baseItem, status: 'processing' }]);
    mockImportsSvc.list.mockResolvedValue([{ ...baseItem, status: 'completed' }]);

    await component['pollStep']();

    expect(mockImportsSvc.list).toHaveBeenCalled();
    expect(component['items']()).toEqual([{ ...baseItem, status: 'completed' }]);
  });

  it('should abort in-flight requests and stop polling on destroy', async () => {
    await fixture.whenStable();
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    fixture.destroy();

    expect(mockImportsSvc.abort).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
