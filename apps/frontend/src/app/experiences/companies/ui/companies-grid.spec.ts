import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompaniesGrid } from './companies-grid';
import { CompaniesService } from '../services/companies-service';
import { PersonsService } from '../../persons/services/persons-service';
import { HouseholdsService } from '../../households/services/households-service';

// pc-grain-tabs (rendered inside every grid) injects all three grain services and
// calls count() on each; the grid's count-sentence also calls countWithCompany
// (persons) / countDistinctWards (households). Stub every grain count method so the
// two services the grid under test doesn't already mock never reach real tRPC.
const grainCountStub = {
  count: () => Promise.resolve(0),
  countWithCompany: () => Promise.resolve(0),
  countDistinctWards: () => Promise.resolve(0),
};

class MockCompaniesService {
  import = vi.fn();
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  count = vi.fn().mockResolvedValue(0);
  abort = vi.fn();
  refreshCount = signal(0);
  triggerRefresh = vi.fn();
}

describe('CompaniesGrid', () => {
  let component: CompaniesGrid;
  let fixture: ComponentFixture<CompaniesGrid>;
  let mockCompaniesSvc: MockCompaniesService;

  beforeEach(async () => {
    mockCompaniesSvc = new MockCompaniesService();

    await TestBed.configureTestingModule({
      imports: [CompaniesGrid],
      providers: [
        provideRouter([]),
        { provide: CompaniesService, useValue: mockCompaniesSvc },
        { provide: PersonsService, useValue: grainCountStub },
        { provide: HouseholdsService, useValue: grainCountStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompaniesGrid);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toBeDefined();
    expect(component['col'].map((c: any) => c.field)).toEqual(['name', 'persons_count', 'website', 'description']);
  });

  it('should make the Company Name column the record door', () => {
    const nameCol = component['col'].find((c: any) => c.field === 'name');
    expect(nameCol?.doorColumn).toBe(true);
    expect(nameCol?.noHide).toBe(true);
    expect(nameCol?.editable).toBe(false);
  });

  it('should format the People count as a singular/plural label without being a door', () => {
    const peopleCol = component['col'].find((c: any) => c.field === 'persons_count');
    expect(peopleCol?.valueFormatter).toBeDefined();
    expect(peopleCol?.doorColumn).toBeFalsy();
    expect(peopleCol?.onCellClicked).toBeUndefined();

    expect(peopleCol?.valueFormatter?.({ data: { persons_count: 1 } } as any)).toBe('1 person');
    expect(peopleCol?.valueFormatter?.({ data: { persons_count: 12 } } as any)).toBe('12 people');
    expect(peopleCol?.valueFormatter?.({ data: {} } as any)).toBe('0 people');
  });

  it('should map known CSV headers to company fields via autoMapHeader', () => {
    expect(component['autoMapHeader']('Company Name')).toBe('name');
    expect(component['autoMapHeader']('Website')).toBe('website');
    expect(component['autoMapHeader']('Tel')).toBe('phone');
    expect(component['autoMapHeader']('Unknown Column')).toBe('');
  });

  it('should open the import dialog and reset the summary', () => {
    component['importSummary'].set({ inserted: 1, errors: 0, skipped: 0, failed: false });
    component['openImportDialog']();

    expect(component['importerOpen']()).toBe(true);
    expect(component['importSummary']()).toBeNull();
  });

  it('should queue an import and refresh the grid on success', async () => {
    mockCompaniesSvc.import.mockResolvedValue({ skipped: 2, file_name: 'companies.csv' });
    const refreshSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(component, 'grid', {
      value: () => ({ refresh: refreshSpy }),
      configurable: true,
    });

    await component['onImportSubmit']({ rows: [{ name: 'Acme' }], skipped: 2, fileName: 'companies.csv' });

    expect(mockCompaniesSvc.import).toHaveBeenCalledWith([{ name: 'Acme' }], 2, 'companies.csv');
    expect(component['importSummary']()).toEqual(expect.objectContaining({ skipped: 2, queued: true, failed: false }));
    expect(component['importerOpen']()).toBe(false);
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should surface an error summary when the import fails', async () => {
    mockCompaniesSvc.import.mockRejectedValue(new Error('Import service unavailable'));

    await component['onImportSubmit']({ rows: [], skipped: 0, fileName: 'bad.csv' });

    expect(component['importSummary']()).toEqual(
      expect.objectContaining({ failed: true, message: 'Import service unavailable' }),
    );
    expect(component['importerOpen']()).toBe(false);
  });
});
