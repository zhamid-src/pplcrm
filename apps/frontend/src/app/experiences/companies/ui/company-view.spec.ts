import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { CompaniesService } from '../services/companies-service';
import { CompanyView } from './company-view';
import { UserService } from '../../../services/user.service';
import { PersonsService } from '../../persons/services/persons-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const mockCompanyData = {
  id: '1',
  name: 'Acme Corp',
  website: 'https://acme.example.com',
  industry: 'Technology',
  email: 'info@acme.example.com',
  phone: '555-0100',
  description: 'Widgets and gadgets',
  notes: 'VIP client',
  json: null,
  createdby_id: 'u1',
  updatedby_id: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

let component: CompanyView;
let fixture: ComponentFixture<CompanyView>;
let mockCompaniesSvc: any;
let mockPersonsSvc: any;
let mockAlertSvc: any;
let mockActivatedRoute: any;
let mockUserService: any;
let mockActivitySvc: any;
let mockDialogSvc: any;
let mockRouter: any;

describe('CompanyView', () => {
  beforeEach(async () => {
    mockCompaniesSvc = {
      getById: vi.fn().mockResolvedValue(mockCompanyData),
      delete: vi.fn().mockResolvedValue(true),
      triggerRefresh: vi.fn(),
    };

    mockPersonsSvc = {
      countByCompanyId: vi.fn().mockResolvedValue(4),
    };

    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        pathFromRoot: [],
        paramMap: {
          get: vi.fn((key: string) => (key === 'id' ? '1' : null)),
        },
      },
    };

    mockUserService = {
      getUsers: vi.fn().mockResolvedValue([{ id: 'u1', first_name: 'Admin' }]),
    };

    mockActivitySvc = {
      getActivities: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
    };

    mockDialogSvc = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    mockRouter = {
      navigate: vi.fn(),
      url: '/companies/1',
    };

    await TestBed.configureTestingModule({
      imports: [CompanyView],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: mockRouter },
        { provide: CompaniesService, useValue: mockCompaniesSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: UserService, useValue: mockUserService },
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: ActivityService, useValue: mockActivitySvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyView);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
  });

  it('should initialize and load company details and employee count', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockCompaniesSvc.getById).toHaveBeenCalledWith('1');
    expect(mockPersonsSvc.countByCompanyId).toHaveBeenCalledWith('1');

    expect(component['company']()).toEqual(mockCompanyData);
    expect(component['employeeCount']()).toBe(4);
  });

  it('should compute initials from the company name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['initials']()).toBe('AC');
  });

  it('should return "?" for initials when there is no company name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['company'].set({ ...mockCompanyData, name: '' });
    expect(component['initials']()).toBe('?');
  });

  it('should compute breadcrumbs using the company name once loaded', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['crumbs']()).toEqual([{ label: 'Companies', route: '/companies' }, { label: 'Acme Corp' }]);
  });

  it('should detect Google enrichment from the json field', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['company'].set({ ...mockCompanyData, json: JSON.stringify({ google_enriched: true }) });
    expect(component['isEnriched']()).toBe(true);

    component['company'].set({ ...mockCompanyData, json: JSON.stringify({ google_enriched: false }) });
    expect(component['isEnriched']()).toBe(false);

    component['company'].set({ ...mockCompanyData, json: null });
    expect(component['isEnriched']()).toBe(false);
  });

  it('should treat malformed json as not enriched', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['company'].set({ ...mockCompanyData, json: '{not valid json' });
    expect(component['isEnriched']()).toBe(false);
  });

  it('should build tab labels including the current employee count', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const employeesTab = component['companyTabs']().find((t) => t.id === 'employees');
    expect(employeesTab?.label).toBe('Employees (4)');
  });

  it('should copy text to clipboard and show a success alert', async () => {
    const clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { value: clipboardMock, writable: true });

    component['copyToClipboard']('info@acme.example.com', 'Email');
    expect(clipboardMock.writeText).toHaveBeenCalledWith('info@acme.example.com');

    await new Promise((r) => setTimeout(r, 0));
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Email copied to clipboard');
  });

  it('should show an error alert when copying to clipboard fails', async () => {
    const clipboardMock = { writeText: vi.fn().mockRejectedValue(new Error('denied')) };
    Object.defineProperty(navigator, 'clipboard', { value: clipboardMock, writable: true });

    component['copyToClipboard']('555-0100', 'Phone');
    await new Promise((r) => setTimeout(r, 0));

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to copy Phone');
  });

  it('should do nothing when copying an empty value', () => {
    const clipboardMock = { writeText: vi.fn() };
    Object.defineProperty(navigator, 'clipboard', { value: clipboardMock, writable: true });

    component['copyToClipboard']('', 'Website');
    expect(clipboardMock.writeText).not.toHaveBeenCalled();
  });

  it('should navigate to the edit route relative to the current route', () => {
    component['editCompany']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['edit'], { relativeTo: mockActivatedRoute });
  });

  it('should resolve the added-by/updated-by user name once users load', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['getUserName']('u1')).toBe('Admin');
    expect(component['getUserName'](null)).toBe('?');
    expect(component['getUserName']('unknown-user')).toBe('?');
  });

  describe('deleteCompany', () => {
    it('should do nothing when the confirmation dialog is cancelled', async () => {
      mockDialogSvc.confirm.mockResolvedValue(false);

      await component['deleteCompany']();

      expect(mockCompaniesSvc.delete).not.toHaveBeenCalled();
    });

    it('should delete, refresh and navigate back to the list on confirm', async () => {
      mockDialogSvc.confirm.mockResolvedValue(true);

      await component['deleteCompany']();

      expect(mockCompaniesSvc.delete).toHaveBeenCalledWith('1');
      expect(mockCompaniesSvc.triggerRefresh).toHaveBeenCalled();
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Company deleted');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/companies']);
    });

    it('should show an error alert when deletion fails', async () => {
      mockDialogSvc.confirm.mockResolvedValue(true);
      mockCompaniesSvc.delete.mockRejectedValue(new Error('Server exploded'));

      await component['deleteCompany']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Server exploded');
    });
  });
});
