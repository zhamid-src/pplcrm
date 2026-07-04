import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/components/confirm-dialog.service';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { CompanyDuplicatesComponent } from './duplicates-companies';

const company1 = { id: 'c1', name: 'Acme Corp', created_at: '2024-01-01T00:00:00Z' };
const company2 = { id: 'c2', name: 'Acme Corp', created_at: '2024-02-01T00:00:00Z' };

describe('CompanyDuplicatesComponent', () => {
  let component: CompanyDuplicatesComponent;
  let fixture: ComponentFixture<CompanyDuplicatesComponent>;
  let mockCompaniesSvc: any;
  let mockAlertSvc: any;
  let mockDialogSvc: any;

  beforeEach(async () => {
    mockCompaniesSvc = {
      getPotentialDuplicates: vi.fn().mockResolvedValue({
        groups: [{ reason: 'Same name', companies: [company1, company2] }],
        total: 1,
      }),
      mergeCompanies: vi.fn().mockResolvedValue({ id: 'c1' }),
    };

    mockAlertSvc = { showError: vi.fn(), showSuccess: vi.fn() };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [CompanyDuplicatesComponent],
      providers: [
        provideRouter([]),
        { provide: CompaniesService, useValue: mockCompaniesSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyDuplicatesComponent);
    component = fixture.componentInstance;
  });

  it('should load company duplicate groups on init using the companies-specific raw group key', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockCompaniesSvc.getPotentialDuplicates).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(component.groups()).toHaveLength(1);
    const [group] = component.groups();
    expect(group?.items).toEqual([company1, company2]);
    expect(group?.selectedTargetId).toBe('c1');
    expect(group?.selectedSourceId).toBe('c2');
  });

  it('should display the company name as its display name', () => {
    expect(component.getDisplayNameForId([company1, company2], 'c2')).toBe('Acme Corp');
    expect(component.getDisplayNameForId([company1, company2], undefined)).toBe('');
  });

  it('should merge the selected company pair via mergeCompanies and remove the group', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.mergeGroup(0);

    expect(mockCompaniesSvc.mergeCompanies).toHaveBeenCalledWith('c1', 'c2');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Successfully merged into "Acme Corp"');
    expect(component.groups()).toEqual([]);
    expect(component.totalGroups()).toBe(0);
  });

  it('should report an entity-fetch error without throwing', async () => {
    mockCompaniesSvc.getPotentialDuplicates.mockRejectedValue(new Error('boom'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to fetch company duplicates');
    expect(component.isLoading()).toBe(false);
  });
});
