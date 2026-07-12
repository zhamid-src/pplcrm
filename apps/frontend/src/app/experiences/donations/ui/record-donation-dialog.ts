import { Component, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { DONATION_METHODS, DONATION_METHOD_LABELS, type DonationMethod } from '../../../../../../../libs/common/src';
import { DonationsService } from '../../../services/api/donations-service';
import { PersonsService } from '../../persons/services/persons-service';

type DonorSearchResult = { id: string; first_name: string | null; last_name: string | null; email: string | null };

/**
 * Fig. 15 "Record donation" dialog — records an offline gift (cash, check, bank transfer, or a
 * card payment taken outside Stripe checkout) against a donor. Distinct from the "Collect
 * donation" flow on the person page, which redirects to Stripe Checkout for a real card charge.
 */
@Component({
  selector: 'pc-record-donation-dialog',
  imports: [Icon, FormsModule, ModalShell],
  templateUrl: './record-donation-dialog.html',
})
export class RecordDonationDialog {
  private readonly donationsSvc = inject(DonationsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly alertSvc = inject(AlertService);

  private readonly dlgRef = viewChild.required<ModalShell>('dlg');
  private readonly _loading = createLoadingGate();

  public readonly saved = output<void>();

  protected readonly methods = DONATION_METHODS;
  protected readonly methodLabels = DONATION_METHOD_LABELS;

  protected readonly donorSearch = signal('');
  protected readonly donorResults = signal<DonorSearchResult[]>([]);
  protected readonly selectedDonor = signal<DonorSearchResult | null>(null);
  protected readonly isSearching = signal(false);
  protected readonly touchedDonor = signal(false);

  protected readonly amount = signal<number | null>(null);
  protected readonly touchedAmount = signal(false);

  protected readonly method = signal<DonationMethod>('card');
  protected readonly submitting = signal(false);
  protected readonly isLoading = this._loading.visible;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly donorInvalid = () => this.touchedDonor() && !this.selectedDonor();
  protected readonly amountInvalid = () => {
    const amt = this.amount();
    return this.touchedAmount() && (amt === null || amt <= 0);
  };
  public open(): void {
    this.resetForm();
    this.dlgRef().show();
  }

  public close(): void {
    this.dlgRef().close();
  }

  protected initials(p: DonorSearchResult): string {
    return `${(p.first_name ?? '').charAt(0)}${(p.last_name ?? '').charAt(0)}`.toUpperCase() || '?';
  }

  protected onDonorSearchChange(value: string): void {
    this.donorSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (!value.trim()) {
      this.donorResults.set([]);
      return;
    }
    this.isSearching.set(true);
    this.searchTimer = setTimeout(() => void this.executeSearch(value), 250);
  }

  private async executeSearch(value: string): Promise<void> {
    try {
      const result = await this.personsSvc.getAllWithAddress({ searchStr: value, startRow: 0, endRow: 10 });
      const rows = (result as { rows?: unknown[] })?.rows ?? [];
      this.donorResults.set(
        rows.map((raw) => {
          const p = raw as { id: string; first_name: string | null; last_name: string | null; email: string | null };
          return { id: String(p.id), first_name: p.first_name, last_name: p.last_name, email: p.email };
        }),
      );
    } catch {
      this.donorResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  protected selectDonor(p: DonorSearchResult): void {
    this.selectedDonor.set(p);
    this.donorSearch.set('');
    this.donorResults.set([]);
  }

  protected clearDonor(): void {
    this.selectedDonor.set(null);
    this.donorSearch.set('');
    this.donorResults.set([]);
  }

  protected donorName(p: DonorSearchResult): string {
    return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'this donor';
  }

  protected async submit(): Promise<void> {
    this.touchedDonor.set(true);
    this.touchedAmount.set(true);
    const donor = this.selectedDonor();
    const amt = this.amount();
    if (!donor || amt === null || amt <= 0) return;

    this.submitting.set(true);
    const end = this._loading.begin();
    try {
      await this.donationsSvc.recordDonation({
        personId: donor.id,
        amountCents: Math.round(amt * 100),
        method: this.method(),
      });
      this.alertSvc.showSuccess(`Saved — $${amt.toFixed(2)} from ${this.donorName(donor)} recorded and receipted`);
      this.saved.emit();
      this.close();
    } catch (err) {
      this.alertSvc.showError(err instanceof Error && err.message ? err.message : 'Failed to record donation');
    } finally {
      this.submitting.set(false);
      end();
    }
  }

  private resetForm(): void {
    this.donorSearch.set('');
    this.donorResults.set([]);
    this.selectedDonor.set(null);
    this.touchedDonor.set(false);
    this.amount.set(null);
    this.touchedAmount.set(false);
    this.method.set('card');
    this.submitting.set(false);
  }
}
