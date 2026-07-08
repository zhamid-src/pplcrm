import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { RecordDonationDialog } from './record-donation-dialog';
import { DonationsService } from '../../../services/api/donations-service';
import { PersonsService } from '../../persons/services/persons-service';

describe('RecordDonationDialog', () => {
  let component: RecordDonationDialog;
  let fixture: ComponentFixture<RecordDonationDialog>;
  let mockDonationsSvc: any;
  let mockPersonsSvc: any;
  let mockAlertSvc: any;

  const donor = { id: 'p1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' };

  beforeEach(async () => {
    mockDonationsSvc = {
      recordDonation: vi.fn().mockResolvedValue({ id: 'd1' }),
    };
    mockPersonsSvc = {
      getAllWithAddress: vi.fn().mockResolvedValue({ rows: [donor] }),
    };
    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RecordDonationDialog],
      providers: [
        { provide: DonationsService, useValue: mockDonationsSvc },
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordDonationDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // jsdom doesn't implement <dialog>.showModal/close — stub them so open()/close() don't throw.
    const dlgEl = fixture.nativeElement.querySelector('dialog');
    dlgEl.showModal = vi.fn();
    dlgEl.close = vi.fn();
  });

  it('should not submit without a selected donor or a positive amount', async () => {
    await component['submit']();
    expect(mockDonationsSvc.recordDonation).not.toHaveBeenCalled();
    expect(component['donorInvalid']()).toBe(true);
  });

  it('should record the donation with the selected donor, amount in cents, and method', async () => {
    component['selectDonor'](donor);
    component['amount'].set(50);
    component['method'].set('cash');

    await component['submit']();

    expect(mockDonationsSvc.recordDonation).toHaveBeenCalledWith({
      personId: 'p1',
      amountCents: 5000,
      method: 'cash',
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Saved — $50.00 from Jane Doe recorded and receipted');
  });

  it('should show an error alert when the save fails', async () => {
    mockDonationsSvc.recordDonation.mockRejectedValue(new Error('Choose who gave this gift — receipts need a name.'));
    component['selectDonor'](donor);
    component['amount'].set(50);

    await component['submit']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Choose who gave this gift — receipts need a name.');
  });

  it('should search for donors and populate results', async () => {
    vi.useFakeTimers();
    component['onDonorSearchChange']('jane');
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();
    await fixture.whenStable();

    expect(mockPersonsSvc.getAllWithAddress).toHaveBeenCalledWith({ searchStr: 'jane', startRow: 0, endRow: 10 });
    expect(component['donorResults']()).toEqual([donor]);
  });
});
