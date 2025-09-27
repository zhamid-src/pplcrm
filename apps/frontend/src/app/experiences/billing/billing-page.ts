import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsEntryType } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { SettingsService } from '../settings/services/settings-service';

const DEFAULTS = {
  plan: 'starter',
  renewal_date: '',
  invoice_email: '',
  payment_last4: '',
  contacts_limit: 10000,
};

@Component({
  selector: 'pc-billing-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './billing-page.html',
})
export class BillingPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsSvc = inject(SettingsService);
  private readonly alertSvc = inject(AlertService);

  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    plan: [DEFAULTS.plan, Validators.required],
    renewal_date: [DEFAULTS.renewal_date],
    invoice_email: [DEFAULTS.invoice_email, Validators.email],
    payment_last4: [DEFAULTS.payment_last4, Validators.pattern(/^\d{4}$/)],
    contacts_limit: [DEFAULTS.contacts_limit, [Validators.min(0)]],
  });

  public async ngOnInit() {
    await this.settingsSvc.load();
    this.applySnapshot();
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const entries: SettingsEntryType[] = [
      { key: 'billing.plan', value: value.plan ?? DEFAULTS.plan },
      { key: 'billing.renewal_date', value: value.renewal_date ?? DEFAULTS.renewal_date },
      { key: 'billing.invoice_email', value: value.invoice_email ?? DEFAULTS.invoice_email },
      { key: 'billing.payment_last4', value: value.payment_last4 ?? DEFAULTS.payment_last4 },
      {
        key: 'billing.contacts_limit',
        value:
          value.contacts_limit === null || value.contacts_limit === undefined
            ? DEFAULTS.contacts_limit
            : Number(value.contacts_limit),
      },
    ];

    this.saving.set(true);
    try {
      await this.settingsSvc.upsert(entries);
      this.alertSvc.showSuccess('Billing preferences updated.');
      this.applySnapshot();
    } finally {
      this.saving.set(false);
    }
  }

  protected resetForm(): void {
    this.applySnapshot();
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private applySnapshot(): void {
    this.form.patchValue({
      plan: this.settingsSvc.getValue('billing.plan', DEFAULTS.plan),
      renewal_date: this.settingsSvc.getValue('billing.renewal_date', DEFAULTS.renewal_date),
      invoice_email: this.settingsSvc.getValue('billing.invoice_email', DEFAULTS.invoice_email),
      payment_last4: this.settingsSvc.getValue('billing.payment_last4', DEFAULTS.payment_last4),
      contacts_limit: Number(this.settingsSvc.getValue('billing.contacts_limit', DEFAULTS.contacts_limit) ?? DEFAULTS.contacts_limit),
    });
  }
}
