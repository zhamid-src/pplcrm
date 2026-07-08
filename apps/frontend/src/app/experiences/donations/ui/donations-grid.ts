import { Component, inject, signal, computed, OnInit, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SpinOnClickDirective } from '@uxcommon/directives/spin-on-click.directive';
import { DONATION_METHOD_LABELS, type DonationMethod } from '../../../../../../../libs/common/src';
import { DonationsService } from '../../../services/api/donations-service';
import { RecordDonationDialog } from './record-donation-dialog';

/** Row shapes inferred from the actual tRPC return types (superjson preserves `Date`, so
 * `created_at` arrives as a real `Date`, not a string) — avoids a hand-rolled interface drifting
 * out of sync with the repo's select list. */
type DonationRow = Awaited<ReturnType<DonationsService['listDonations']>>[number];
type PledgeRow = Awaited<ReturnType<DonationsService['listPledges']>>[number];

/** How many rows of the recent-gifts table show before the "Showing latest N of M" sentence
 * points the rest of the way. Spec Fig. 15: "Showing the latest 8 of 62". */
const RECENT_GIFTS_LIMIT = 8;

@Component({
  selector: 'pc-donations-grid',
  imports: [RouterLink, RouterLinkActive, Icon, SpinOnClickDirective, CurrencyPipe, RecordDonationDialog],
  templateUrl: './donations-grid.html',
})
export class DonationsGridComponent implements OnInit {
  private readonly donationsSvc = inject(DonationsService);
  private readonly alertSvc = inject(AlertService);

  private readonly recordDialog = viewChild.required(RecordDonationDialog);

  protected readonly donations = signal<DonationRow[]>([]);
  protected readonly pledges = signal<PledgeRow[]>([]);
  protected readonly _loading = createLoadingGate();
  /** Id of the most-recently recorded donation — flashes its row once, per the house
   * "new rows flash in" pattern (row-saved-flash, datagrid.css). */
  protected readonly highlightId = signal<string | null>(null);

  private readonly succeeded = computed(() => this.donations().filter((d) => d.status === 'succeeded'));

  private readonly thisMonthGifts = computed(() => this.succeeded().filter((d) => this.isInMonth(d.created_at, 0)));
  private readonly lastMonthGifts = computed(() => this.succeeded().filter((d) => this.isInMonth(d.created_at, -1)));

  protected readonly thisMonthTotal = computed(
    () => this.thisMonthGifts().reduce((sum, d) => sum + Number(d.amount || 0), 0) / 100,
  );
  private readonly lastMonthTotal = computed(
    () => this.lastMonthGifts().reduce((sum, d) => sum + Number(d.amount || 0), 0) / 100,
  );
  protected readonly thisMonthCount = computed(() => this.thisMonthGifts().length);

  /** "+18% vs April"-style delta. Null when there's no prior-month baseline to compare against. */
  protected readonly monthOverMonthDelta = computed(() => {
    const last = this.lastMonthTotal();
    if (last <= 0) return null;
    return Math.round(((this.thisMonthTotal() - last) / last) * 100);
  });

  protected readonly averageGift = computed(() => {
    const count = this.thisMonthCount();
    return count > 0 ? this.thisMonthTotal() / count : 0;
  });

  protected readonly monthlyDonorCount = computed(() => this.pledges().filter((p) => p.status === 'active').length);

  protected readonly receiptsSentThisMonth = computed(() => this.thisMonthGifts().filter((d) => d.receipt_sent).length);

  protected readonly headerSentence = computed(() => {
    const total = this.thisMonthTotal();
    const count = this.thisMonthCount();
    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
    return count > 0
      ? `${formattedTotal} raised this month across ${count} ${count === 1 ? 'gift' : 'gifts'}`
      : 'No gifts recorded yet this month';
  });

  protected readonly recentGifts = computed(() => this.succeeded().slice(0, RECENT_GIFTS_LIMIT));
  protected readonly totalGiftCount = computed(() => this.succeeded().length);

  ngOnInit(): void {
    void this.load();
  }

  protected refresh(): void {
    void this.load();
  }

  protected openRecordDonation(): void {
    this.recordDialog().open();
  }

  protected async onDonationRecorded(): Promise<void> {
    await this.load();
    const newest = this.donations()[0];
    if (newest) {
      this.highlightId.set(newest.id);
      setTimeout(() => this.highlightId.set(null), 1200);
    }
  }

  protected formatCurrency(amountCents: number | null | undefined): string {
    if (amountCents === null || amountCents === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
  }

  protected formatDate(date: Date | string): string {
    try {
      return new Date(date).toLocaleDateString(undefined, {
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

  /** Safe lookup into the fixed method → label map — `method` is a checked DB text column, not a
   * TS-narrowed union, so this guards with `in` rather than asserting the type. */
  protected methodLabel(method: string): string {
    return method in DONATION_METHOD_LABELS ? DONATION_METHOD_LABELS[method as DonationMethod] : method;
  }

  private isInMonth(date: Date | string, monthOffset: number): boolean {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
  }

  private async load(): Promise<void> {
    const end = this._loading.begin();
    try {
      const [donations, pledges] = await Promise.all([
        this.donationsSvc.listDonations(),
        this.donationsSvc.listPledges(),
      ]);
      this.donations.set(donations ?? []);
      this.pledges.set(pledges ?? []);
    } catch (_err) {
      this.alertSvc.showError('Failed to load donations. Please try again.');
    } finally {
      end();
    }
  }
}
