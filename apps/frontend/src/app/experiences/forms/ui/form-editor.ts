import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, FormField, validateStandardSchema, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddWebFormObj } from '../../../../../../../libs/common/src';
import { ListsService } from '@experiences/lists/services/lists-service';
import { FormsService } from '../services/forms-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@experiences/tags/ui/tags';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { Icon } from '@icons/icon';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { FieldsSelector } from '@uxcommon/components/fields-selector/fields-selector';
import { SettingsService } from '@experiences/settings/services/settings-service';
import { environment } from '../../../../environments/environment';
import { injectUnsavedChanges } from '@frontend/services/unsaved-changes-guard';

@Component({
  selector: 'pc-form-editor',
  imports: [FormField, RouterModule, Tags, TagItem, Icon, FormActions, PcCard, FieldsSelector],
  templateUrl: './form-editor.html',
})
export class FormEditorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly alertSvc = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly settingsSvc = inject(SettingsService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly isInitialized = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isNew = signal(true);
  protected readonly formId = signal<string | null>(null);

  protected readonly hasStripeKey = computed(() => {
    const key = this.settingsSvc.getValue<string>('donations.stripe_secret_key', '');
    return !!key.trim();
  });

  protected readonly availableLists = signal<Array<{ id: string; name: string }>>([]);
  protected readonly selectedLists = signal<string[]>([]);
  protected readonly selectedTags = signal<string[]>([]);
  protected readonly selectedFields = signal<string[]>(['first_name', 'last_name', 'email', 'mobile', 'notes']);

  private isEnabled(field: string): boolean {
    const list = this.selectedFields();
    return list.includes(field) || list.includes(`${field}:required`);
  }

  private isRequired(field: string): boolean {
    const list = this.selectedFields();
    return list.includes(`${field}:required`);
  }

  protected readonly showFirstName = computed(() => this.isEnabled('first_name'));
  protected readonly isFirstNameRequired = computed(() => this.isRequired('first_name'));

  protected readonly showLastName = computed(() => this.isEnabled('last_name'));
  protected readonly isLastNameRequired = computed(() => this.isRequired('last_name'));

  protected readonly showMobile = computed(() => this.isEnabled('mobile'));
  protected readonly isMobileRequired = computed(() => this.isRequired('mobile'));

  protected readonly showNotes = computed(() => this.isEnabled('notes'));
  protected readonly isNotesRequired = computed(() => this.isRequired('notes'));

  protected readonly showStreet1 = computed(() => this.isEnabled('street1'));
  protected readonly isStreet1Required = computed(() => this.isRequired('street1'));

  protected readonly showCity = computed(() => this.isEnabled('city'));
  protected readonly isCityRequired = computed(() => this.isRequired('city'));

  protected readonly showState = computed(() => this.isEnabled('state'));
  protected readonly isStateRequired = computed(() => this.isRequired('state'));

  protected readonly showZip = computed(() => this.isEnabled('zip'));
  protected readonly isZipRequired = computed(() => this.isRequired('zip'));

  protected readonly showCountry = computed(() => this.isEnabled('country'));
  protected readonly isCountryRequired = computed(() => this.isRequired('country'));

  protected toggleField(field: string): void {
    const current = this.selectedFields();
    const isCurrentlyEnabled = current.includes(field) || current.includes(`${field}:required`);

    if (isCurrentlyEnabled) {
      this.selectedFields.set(current.filter((f) => f !== field && f !== `${field}:required`));
    } else {
      this.selectedFields.set([...current, field]);
    }
  }

  protected toggleRequired(field: string): void {
    const current = this.selectedFields();
    const hasOptional = current.includes(field);
    const hasRequired = current.includes(`${field}:required`);

    if (hasOptional) {
      this.selectedFields.set([...current.filter((f) => f !== field), `${field}:required`]);
    } else if (hasRequired) {
      this.selectedFields.set([...current.filter((f) => f !== `${field}:required`), field]);
    }
  }

  protected readonly payload = signal({
    name: '',
    description: '',
    redirect_url: '',
    status: 'active' as 'active' | 'archived',
    send_confirmation: true,
    send_alert: true,
    form_type: 'standard' as 'standard' | 'donation' | 'recurring_donation',
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddWebFormObj);
  });

  protected readonly unsavedChanges = injectUnsavedChanges(this.form, this.payload);

  protected readonly isDonationForm = computed(() => this.payload().form_type === 'donation');

  protected readonly embedSnippet = computed(() => {
    const id = this.formId();
    if (!id) return '';
    const apiOrigin = environment.apiUrl.replace(/\/$/, ''); // Use configured backend URL
    const fields = this.selectedFields();

    const isEnabled = (name: string): boolean => {
      if (this.isDonationForm()) {
        const alwaysEnabled = ['first_name', 'last_name', 'street1', 'city', 'state', 'zip', 'country'];
        if (alwaysEnabled.includes(name)) return true;
      }
      return fields.includes(name) || fields.includes(`${name}:required`);
    };

    const isRequired = (name: string): boolean => {
      if (this.isDonationForm()) {
        const alwaysRequired = ['first_name', 'last_name', 'street1', 'city', 'state', 'zip', 'country'];
        if (alwaysRequired.includes(name)) return true;
      }
      return fields.includes(`${name}:required`);
    };

    if (this.isDonationForm()) {
      return `<!-- PeopleCRM Embeddable Donation Form -->
<form action="${apiOrigin}/api/forms/submit/${id}" method="POST" style="max-width: 400px; font-family: sans-serif;">
  <!-- Visually hidden honeypot field to prevent spam bots -->
  <input type="text" name="_hp" style="display:none !important" tabindex="-1" autocomplete="off" />

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Donation Amount ($ CAD) *</label>
    <input type="number" name="amount" min="1" step="any" placeholder="E.g. 50.00" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">First Name *</label>
    <input type="text" name="first_name" placeholder="John" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Last Name *</label>
    <input type="text" name="last_name" placeholder="Doe" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Address *</label>
    <input type="email" name="email" placeholder="you@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Street Address *</label>
    <input type="text" name="street1" placeholder="E.g. 123 Main St" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">City *</label>
    <input type="text" name="city" placeholder="E.g. Toronto" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Country of Residence *</label>
    <select name="country" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
      <option value="CA">Canada</option>
      <option value="US">United States</option>
      <option value="GB">United Kingdom</option>
      <option value="AU">Australia</option>
    </select>
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">State / Province of Residence *</label>
    <input type="text" name="state" placeholder="E.g. ON or NY" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Zip / Postal Code *</label>
    <input type="text" name="zip" placeholder="E.g. M5V 2T6" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>${
    isEnabled('mobile')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Mobile / Phone${isRequired('mobile') ? ' *' : ''}</label>
    <input type="text" name="mobile" placeholder="Phone Number" ${isRequired('mobile') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('notes')
      ? `

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Notes / Message${isRequired('notes') ? ' *' : ''}</label>
    <textarea name="notes" placeholder="How can we help?" ${isRequired('notes') ? 'required' : ''} rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
  </div>`
      : ''
  }

  <button type="submit" style="background-color: #0ea5e9; color: white; padding: 10px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; width: 100%;">Next</button>
  <p style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">Submitting will validate eligibility and redirect you to Stripe for secure payment.</p>
</form>`;
    }

    return `<!-- PeopleCRM Embeddable Form -->
<form action="${apiOrigin}/api/forms/submit/${id}" method="POST" style="max-width: 400px; font-family: sans-serif;">
  <!-- Visually hidden honeypot field to prevent spam bots -->
  <input type="text" name="_hp" style="display:none !important" tabindex="-1" autocomplete="off" />
${
  isEnabled('first_name')
    ? `
  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">First Name${isRequired('first_name') ? ' *' : ''}</label>
    <input type="text" name="first_name" placeholder="First Name" ${isRequired('first_name') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
    : ''
}${
      isEnabled('last_name')
        ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Last Name${isRequired('last_name') ? ' *' : ''}</label>
    <input type="text" name="last_name" placeholder="Last Name" ${isRequired('last_name') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
        : ''
    }

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Address *</label>
    <input type="email" name="email" placeholder="you@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>${
    isEnabled('mobile')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Mobile / Phone${isRequired('mobile') ? ' *' : ''}</label>
    <input type="text" name="mobile" placeholder="Phone Number" ${isRequired('mobile') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('street1')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Street Address${isRequired('street1') ? ' *' : ''}</label>
    <input type="text" name="street1" placeholder="E.g. 123 Main St" ${isRequired('street1') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('city')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">City${isRequired('city') ? ' *' : ''}</label>
    <input type="text" name="city" placeholder="E.g. Toronto" ${isRequired('city') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('country')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Country${isRequired('country') ? ' *' : ''}</label>
    <select name="country" ${isRequired('country') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
      <option value="CA">Canada</option>
      <option value="US">United States</option>
      <option value="GB">United Kingdom</option>
      <option value="AU">Australia</option>
    </select>
  </div>`
      : ''
  }${
    isEnabled('state')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">State / Province${isRequired('state') ? ' *' : ''}</label>
    <input type="text" name="state" placeholder="E.g. ON or NY" ${isRequired('state') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('zip')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Zip / Postal Code${isRequired('zip') ? ' *' : ''}</label>
    <input type="text" name="zip" placeholder="E.g. M5V 2T6" ${isRequired('zip') ? 'required' : ''} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    isEnabled('notes')
      ? `

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Notes / Message${isRequired('notes') ? ' *' : ''}</label>
    <textarea name="notes" placeholder="How can we help?" ${isRequired('notes') ? 'required' : ''} rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
  </div>`
      : ''
  }

  <button type="submit" style="background-color: #0ea5e9; color: white; padding: 10px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; width: 100%;">Subscribe</button>
</form>`;
  });

  protected readonly formUrl = computed(() => {
    const id = this.formId();
    if (!id) return '';
    return environment.apiUrl.replace(/\/$/, '') + `/api/forms/view/${id}`;
  });

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'add') {
      this.isNew.set(false);
      this.formId.set(id);
    }
    void this.loadLists();
    void this.settingsSvc.load();
  }

  protected listName(id: string): string {
    const match = this.availableLists().find((list) => list.id === id);
    return match?.name ?? 'List';
  }

  protected handleListSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    const value = select.value;
    if (!value) return;
    const current = new Set(this.selectedLists());
    if (!current.has(value)) {
      current.add(value);
      this.selectedLists.set(Array.from(current));
    }
    select.value = '';
  }

  protected removeList(listId: string): void {
    this.selectedLists.set(this.selectedLists().filter((id) => id !== listId));
  }

  protected handleTagsChange(tags: string[]): void {
    this.selectedTags.set(Array.isArray(tags) ? [...tags] : []);
  }

  protected copySnippet(): void {
    const code = this.embedSnippet();
    if (!code) return;
    navigator.clipboard.writeText(code).then(
      () => this.alertSvc.showSuccess('Form HTML snippet copied to clipboard!'),
      () => this.alertSvc.showError('Failed to copy to clipboard.'),
    );
  }

  protected copyUrl(): void {
    const url = this.formUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => this.alertSvc.showSuccess('Form landing page URL copied!'),
      () => this.alertSvc.showError('Failed to copy URL.'),
    );
  }

  protected async deleteForm() {
    const id = this.formId();
    if (!id) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Web Form',
      message: 'Are you sure you want to delete this web form? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.saving.set(true);
    try {
      await this.formsSvc.delete(id);
      this.formsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Web form deleted');
      await this.router.navigate(['/forms']);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to delete web form';
      this.alertSvc.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  public canDeactivate(): Promise<boolean> {
    return this.unsavedChanges.confirmDiscardIfDirty(this.payload().name || 'this form');
  }

  protected async save(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      this.alertSvc.showError('Please check your inputs.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    await submit(this.form, {
      action: async () => {
        const values = this.payload();

        try {
          if (this.isNew()) {
            const payload = {
              name: values.name?.trim() ?? '',
              description: values.description?.trim() || null,
              redirect_url: values.redirect_url?.trim() || null,
              target_tags: this.selectedTags().length ? this.selectedTags() : null,
              target_lists: this.selectedLists().length ? this.selectedLists() : null,
              status: values.status,
              fields: this.selectedFields(),
              send_confirmation: !!values.send_confirmation,
              send_alert: !!values.send_alert,
              form_type: values.form_type,
            };
            const result = (await this.formsSvc.add(payload)) as { id: string };
            this.alertSvc.showSuccess('Form created successfully!');
            void this.router.navigate(['/forms', result.id]);
          } else {
            const id = this.formId()!;
            const payload = {
              name: values.name?.trim() ?? '',
              description: values.description?.trim() || null,
              redirect_url: values.redirect_url?.trim() || null,
              target_tags: this.selectedTags().length ? this.selectedTags() : null,
              target_lists: this.selectedLists().length ? this.selectedLists() : null,
              status: values.status,
              fields: this.selectedFields(),
              send_confirmation: !!values.send_confirmation,
              send_alert: !!values.send_alert,
            };
            await this.formsSvc.update(id, payload);
            this.alertSvc.showSuccess('Form updated successfully!');
            if (typeof done === 'function') {
              done();
            } else {
              void this.router.navigate(['/forms', id]);
            }
          }
        } catch (err) {
          const msg = err instanceof Error && err.message ? err.message : 'An error occurred while saving the form.';
          this.error.set(msg);
          this.alertSvc.showError(msg);
        } finally {
          this.saving.set(false);
        }
        return null;
      },
    });
  }

  private async loadLists(): Promise<void> {
    const end = this._loading.begin();
    try {
      const result = await this.listsSvc.getAll({ limit: 100 });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      this.availableLists.set(
        rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name),
        })),
      );
      if (!this.isNew()) {
        await this.loadFormDetails();
      }
    } catch (err) {
      console.error('Failed to load lists', err);
    } finally {
      this.isInitialized.set(true);
      end();
    }
  }

  private async loadFormDetails(): Promise<void> {
    const id = this.formId();
    if (!id) return;
    const end = this._loading.begin();
    try {
      const form = (await this.formsSvc.getById(id)) as any;
      if (form) {
        this.payload.set({
          name: form.name ?? '',
          description: form.description ?? '',
          redirect_url: form.redirect_url ?? '',
          status: (form.status as 'active' | 'archived') ?? 'active',
          send_confirmation: form.send_confirmation !== false,
          send_alert: form.send_alert !== false,
          form_type: (form.form_type as 'standard' | 'donation' | 'recurring_donation') ?? 'standard',
        });
        this.form().reset();
        this.selectedTags.set(Array.isArray(form.target_tags) ? form.target_tags : []);
        this.selectedLists.set(Array.isArray(form.target_lists) ? form.target_lists : []);

        // Load fields configuration
        if (form.fields) {
          const fields = Array.isArray(form.fields) ? form.fields : JSON.parse(form.fields);
          this.selectedFields.set(fields);
        } else {
          this.selectedFields.set(['first_name', 'last_name', 'email', 'mobile', 'notes']);
        }
      }
    } catch (err) {
      console.error('Failed to load form details', err);
      this.error.set('Failed to load form details.');
    } finally {
      end();
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
