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
  protected readonly taxCreditTiers = signal<TaxCreditTier[]>([]);
  protected readonly webhookToken = signal('');

  // New multi-country autocomplete & states checkboxes
  protected readonly selectedCountries = signal<string[]>([]);
  protected readonly selectedRegions = signal<string[]>([]);

  protected readonly countrySearch = signal('');
  protected readonly showCountryDropdown = signal(false);

  protected readonly allCountries = [
    { code: 'CA', name: 'Canada' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
  ];

  protected readonly canadaProvinces = [
    { code: 'ON', name: 'Ontario' },
    { code: 'QC', name: 'Quebec' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'AB', name: 'Alberta' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'YT', name: 'Yukon' },
    { code: 'NU', name: 'Nunavut' },
  ];

  protected readonly usStates = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
  ];

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
    const token = this.webhookToken();
    if (!token) return 'Loading Webhook URL...';
    const base = environment.apiUrl.replace(/\/$/, '');
    return `${base}/api/donations/webhook?token=${token}`;
  });

  protected readonly availableCountriesToSelect = computed(() => {
    const search = this.countrySearch().toLowerCase().trim();
    const selected = new Set(this.selectedCountries());
    return this.allCountries.filter(
      (c) =>
        !selected.has(c.code) &&
        (c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search)),
    );
  });

  protected readonly isCanadaSelected = computed(() => this.selectedCountries().includes('CA'));
  protected readonly isUsaSelected = computed(() => this.selectedCountries().includes('US'));

  // Plain-language calculation summary
  protected readonly taxCreditSummary = computed(() => {
    const sorted = [...this.taxCreditTiers()].sort((a, b) => a.limit - b.limit);
    if (sorted.length === 0) {
      return ['No tax credit tiers defined. Donations will not receive any tax credit.'];
    }

    const lines: string[] = [];
    let previousLimit = 0;

    for (let i = 0; i < sorted.length; i++) {
      const tier = sorted[i];
      const ratePct = Math.round(tier.rate * 100);

      if (i === 0) {
        lines.push(`${ratePct}% credit on the first $${tier.limit} donated.`);
      } else {
        const range = `$${previousLimit + 1} to $${tier.limit}`;
        lines.push(`${ratePct}% credit on the next $${tier.limit - previousLimit} donated (amounts from ${range}).`);
      }
      previousLimit = tier.limit;
    }

    lines.push(`0% credit on any amounts exceeding $${previousLimit}.`);
    return lines;
  });

  async ngOnInit() {
    await this.settingsSvc.load();
    this.loadValues();
  }

  private loadValues() {
    this.stripeSecretKey.set(this.settingsSvc.getValue<string>('donations.stripe_secret_key', ''));
    this.stripeWebhookSecret.set(
      this.settingsSvc.getValue<string>('donations.stripe_webhook_secret', ''),
    );
    this.donationLimit.set(this.settingsSvc.getValue<number>('donations.limit', 1000));
    this.restrictResidency.set(
      this.settingsSvc.getValue<boolean>('donations.restrict_residency', false),
    );

    // Load countries
    const countriesStr = this.settingsSvc.getValue<string>('donations.allowed_countries', 'CA');
    const parsedCountries = countriesStr
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    this.selectedCountries.set(parsedCountries);

    // Load regions (provinces / states)
    const regionsStr = this.settingsSvc.getValue<string>('donations.allowed_regions', 'ON');
    const parsedRegions = regionsStr
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    this.selectedRegions.set(parsedRegions);

    // Load tax tiers
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

    // Load or generate webhook token
    let token = this.settingsSvc.getValue<string>('donations.webhook_token', '');
    if (!token) {
      token =
        'wt_' +
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    this.webhookToken.set(token);
  }

  protected selectCountry(country: { code: string; name: string }) {
    this.selectedCountries.update((list) => [...list, country.code]);
    this.countrySearch.set('');
    this.showCountryDropdown.set(false);
  }

  protected removeCountry(code: string) {
    this.selectedCountries.update((list) => list.filter((c) => c !== code));
    // Clean up regions for removed countries
    if (code === 'CA') {
      const provinceCodes = new Set(this.canadaProvinces.map((p) => p.code));
      this.selectedRegions.update((list) => list.filter((r) => !provinceCodes.has(r)));
    } else if (code === 'US') {
      const stateCodes = new Set(this.usStates.map((s) => s.code));
      this.selectedRegions.update((list) => list.filter((r) => !stateCodes.has(r)));
    }
  }

  protected toggleRegion(code: string) {
    this.selectedRegions.update((list) =>
      list.includes(code) ? list.filter((r) => r !== code) : [...list, code],
    );
  }

  protected getCountryName(code: string): string {
    const found = this.allCountries.find((c) => c.code === code);
    return found ? found.name : code;
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
        { key: 'donations.allowed_countries', value: this.selectedCountries().join(',') },
        { key: 'donations.allowed_regions', value: this.selectedRegions().join(',') },
        { key: 'donations.tax_credit_tiers', value: JSON.stringify(this.taxCreditTiers()) },
        { key: 'donations.webhook_token', value: this.webhookToken() },
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
