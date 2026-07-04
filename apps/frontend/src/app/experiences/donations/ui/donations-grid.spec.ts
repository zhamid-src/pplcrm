import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DonationsGridComponent } from './donations-grid';
import { DonationsService } from '../../../services/api/donations-service';

describe('DonationsGridComponent', () => {
  let component: DonationsGridComponent;
  let fixture: ComponentFixture<DonationsGridComponent>;
  let mockDonationsSvc: any;
  let mockAlertSvc: any;

  const rows = [
    {
      id: '1',
      person_id: 'p1',
      person_first_name: 'Jane',
      person_last_name: 'Doe',
      person_email: 'jane@example.com',
      amount: 5000,
      tax_credit_amount: 1500,
      status: 'succeeded',
      country: 'CA',
      state: 'ON',
      created_at: '2026-01-15T10:00:00Z',
    },
    {
      id: '2',
      person_id: 'p2',
      person_first_name: 'John',
      person_last_name: 'Smith',
      amount: 2500,
      tax_credit_amount: 0,
      status: 'failed',
      country: 'US',
      created_at: '2026-02-01T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockDonationsSvc = {
      listDonations: vi.fn().mockResolvedValue(rows),
    };
    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DonationsGridComponent],
      providers: [
        provideRouter([]),
        { provide: DonationsService, useValue: mockDonationsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationsGridComponent);
    component = fixture.componentInstance;
  });

  it('should load donations on init and compute summary statistics', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDonationsSvc.listDonations).toHaveBeenCalled();
    expect(component['donations']()).toEqual(rows);
    // Only the succeeded row (amount 5000, tax credit 1500) counts toward totals.
    expect(component['totalDonated']()).toBe(50);
    expect(component['totalTaxCredits']()).toBe(15);
    expect(component['successCount']()).toBe(1);
  });

  it('should show an error alert when loading donations fails', async () => {
    mockDonationsSvc.listDonations.mockRejectedValue(new Error('boom'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to load donations. Please try again.');
    expect(component['donations']()).toEqual([]);
  });

  it('should reload donations when refresh is invoked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mockDonationsSvc.listDonations.mockClear();

    mockDonationsSvc.listDonations.mockResolvedValue([rows[0]]);
    component['refresh']();
    await fixture.whenStable();

    expect(mockDonationsSvc.listDonations).toHaveBeenCalledTimes(1);
    expect(component['donations']()).toEqual([rows[0]]);
  });

  it('should format currency amounts from cents', () => {
    expect(component['formatCurrency'](150000)).toBe('$1,500.00');
    expect(component['formatCurrency'](null)).toBe('$0.00');
    expect(component['formatCurrency'](undefined)).toBe('$0.00');
  });

  it('should format valid dates', () => {
    expect(component['formatDate']('2026-01-15T10:00:00Z')).toContain('2026');
  });
});
