import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SpinOnClickDirective } from '@uxcommon/directives/spin-on-click.directive';
import { DonationsService } from '../../../services/api/donations-service';

@Component({
  selector: 'pc-donations-grid',
  imports: [RouterLink, RouterLinkActive, Icon, SpinOnClickDirective, CurrencyPipe],
  templateUrl: './donations-grid.html',
})
export class DonationsGridComponent implements OnInit {
  private readonly donationsSvc = inject(DonationsService);
  private readonly alertSvc = inject(AlertService);

  protected readonly donations = signal<any[]>([]);
  protected readonly _loading = createLoadingGate();

  // Summary statistics computed signals
  protected readonly totalDonated = computed(() => {
    return (
      this.donations()
        .filter((d) => d.status === 'succeeded')
        .reduce((sum, d) => sum + Number(d.amount || 0), 0) / 100
    );
  });

  protected readonly totalTaxCredits = computed(() => {
    return (
      this.donations()
        .filter((d) => d.status === 'succeeded')
        .reduce((sum, d) => sum + Number(d.tax_credit_amount || 0), 0) / 100
    );
  });

  protected readonly successCount = computed(() => {
    return this.donations().filter((d) => d.status === 'succeeded').length;
  });

  ngOnInit() {
    void this.load();
  }

  protected refresh() {
    void this.load();
  }

  protected formatCurrency(amountCents: number | null | undefined): string {
    if (amountCents === null || amountCents === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
  }

  protected formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  private async load() {
    const end = this._loading.begin();
    try {
      const data = await this.donationsSvc.listDonations();
      this.donations.set(data || []);
    } catch (_err) {
      this.alertSvc.showError('Failed to load donations. Please try again.');
    } finally {
      end();
    }
  }
}
