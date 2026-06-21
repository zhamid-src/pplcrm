import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { TokenService } from '../../../services/api/token-service';
import { environment } from '../../../../environments/environment';

export interface TaxCreditTier {
  limit: number; // Upper limit of bracket in dollars
  rate: number; // Credit percentage (e.g. 0.75 for 75%)
}

@Component({
  selector: 'pc-donations-settings',
  imports: [FormsModule, Icon],
  templateUrl: './donations-settings.html',
})
export class DonationsSettingsComponent implements OnInit {
  private readonly settingsSvc = inject(SettingsService);
  private readonly alerts = inject(AlertService);
  private readonly tokenSvc = inject(TokenService);

  protected readonly stripeSecretKey = signal('');
  protected readonly stripeWebhookSecret = signal('');
  protected readonly donationLimit = signal(1000);
  protected readonly restrictResidency = signal(false);
  protected readonly allowedCountries = signal('CA');
  protected readonly allowedRegions = signal('ON');
  protected readonly taxCreditTiers = signal<TaxCreditTier[]>([]);

  // Tiers editing inputs
  protected readonly newLimit = signal<number | null>(null);
  protected readonly newRate = signal<number | null>(null);

  protected readonly isSaving = signal(false);

  protected readonly tenantId = computed(() => {
    const token = this.tokenSvc.getAuthToken();
    if (!token) return '';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return String(payload.tenant_id || '');
      }
    } catch (e) {
      console.error('Failed to parse auth token payload', e);
    }
    return '';
  });

  protected readonly webhookUrl = computed(() => {
    const tId = this.tenantId();
    if (!tId) return 'Loading Webhook URL...';
    const base = environment.apiUrl.replace(/\/$/, '');
    return `${base}/api/donations/webhook?tenant_id=${tId}`;
  });

  async ngOnInit() {
    await this.settingsSvc.load();
    this.loadValues();
  }

  private loadValues() {
    this.stripeSecretKey.set(this.settingsSvc.getValue<string>('donations.stripe_secret_key', ''));
    this.stripeWebhookSecret.set(this.settingsSvc.getValue<string>('donations.stripe_webhook_secret', ''));
    this.donationLimit.set(this.settingsSvc.getValue<number>('donations.limit', 1000));
    this.restrictResidency.set(this.settingsSvc.getValue<boolean>('donations.restrict_residency', false));
    this.allowedCountries.set(this.settingsSvc.getValue<string>('donations.allowed_countries', 'CA'));
    this.allowedRegions.set(this.settingsSvc.getValue<string>('donations.allowed_regions', 'ON'));

    const tiersRaw = this.settingsSvc.getValue<any>('donations.tax_credit_tiers', []);
    let parsedTiers: TaxCreditTier[] = [];
    if (typeof tiersRaw === 'string') {
      try {
        parsedTiers = JSON.parse(tiersRaw);
      } catch {
        parsedTiers = [];
      }
    } else if (Array.isArray(tiersRaw)) {
      parsedTiers = tiersRaw;
    }
    this.taxCreditTiers.set(parsedTiers.sort((a, b) => a.limit - b.limit));
  }

  protected addTier() {
    const limit = this.newLimit();
    const rateInput = this.newRate();

    if (limit === null || limit <= 0) {
      this.alerts.showError('Limit must be greater than 0');
      return;
    }
    if (rateInput === null || rateInput < 0 || rateInput > 100) {
      this.alerts.showError('Rate must be between 0% and 100%');
      return;
    }

    const rate = rateInput / 100;

    const current = this.taxCreditTiers();
    if (current.some((t) => t.limit === limit)) {
      this.alerts.showError('A tier with this limit already exists');
      return;
    }

    const updated = [...current, { limit, rate }].sort((a, b) => a.limit - b.limit);
    this.taxCreditTiers.set(updated);

    this.newLimit.set(null);
    this.newRate.set(null);
  }

  protected removeTier(index: number) {
    const updated = this.taxCreditTiers().filter((_, i) => i !== index);
    this.taxCreditTiers.set(updated);
  }

  protected reset() {
    this.loadValues();
    this.alerts.showSuccess('Settings reset to saved values');
  }

  protected async save() {
    this.isSaving.set(true);
    try {
      const entries = [
        { key: 'donations.stripe_secret_key', value: this.stripeSecretKey() },
        { key: 'donations.stripe_webhook_secret', value: this.stripeWebhookSecret() },
        { key: 'donations.limit', value: Number(this.donationLimit()) },
        { key: 'donations.restrict_residency', value: this.restrictResidency() },
        { key: 'donations.allowed_countries', value: this.allowedCountries() },
        { key: 'donations.allowed_regions', value: this.allowedRegions() },
        { key: 'donations.tax_credit_tiers', value: JSON.stringify(this.taxCreditTiers()) },
      ];

      await this.settingsSvc.upsert(entries);
      this.alerts.showSuccess('Donations configuration saved successfully');
    } catch (err: any) {
      this.alerts.showError(err.message || 'Failed to save donations configuration');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected copyWebhookUrl() {
    navigator.clipboard
      .writeText(this.webhookUrl())
      .then(() => this.alerts.showSuccess('Webhook URL copied!'))
      .catch(() => this.alerts.showError('Failed to copy webhook URL'));
  }
}
