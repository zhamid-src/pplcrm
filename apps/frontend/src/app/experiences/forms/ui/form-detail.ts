import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, FormField, validateStandardSchema, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddWebFormObj } from '@common';
import { ListsService } from '@experiences/lists/services/lists-service';
import { FormsService } from '../services/forms-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@experiences/tags/ui/tags';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { Icon } from '@icons/icon';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-form-detail',
  imports: [FormField, RouterModule, Tags, TagItem, Icon, FormActions],
  templateUrl: './form-detail.html',
})
export class FormDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly alertSvc = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly isInitialized = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isNew = signal(true);
  protected readonly formId = signal<string | null>(null);

  protected readonly availableLists = signal<Array<{ id: string; name: string }>>([]);
  protected readonly selectedLists = signal<string[]>([]);
  protected readonly selectedTags = signal<string[]>([]);
  protected readonly selectedFields = signal<string[]>(['first_name', 'last_name', 'email', 'mobile', 'notes']);

  protected readonly showFirstName = computed(() => this.selectedFields().includes('first_name'));
  protected readonly showLastName = computed(() => this.selectedFields().includes('last_name'));
  protected readonly showMobile = computed(() => this.selectedFields().includes('mobile'));
  protected readonly showNotes = computed(() => this.selectedFields().includes('notes'));

  protected toggleField(field: string): void {
    const current = this.selectedFields();
    if (current.includes(field)) {
      this.selectedFields.set(current.filter((f) => f !== field));
    } else {
      this.selectedFields.set([...current, field]);
    }
  }

  protected readonly payload = signal({
    name: '',
    description: '',
    redirect_url: '',
    status: 'active' as 'active' | 'archived',
    send_confirmation: true,
    send_alert: true,
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddWebFormObj);
  });

  protected readonly embedSnippet = computed(() => {
    const id = this.formId();
    if (!id) return '';
    const apiOrigin = window.location.origin.replace(':4200', ':5000'); // Auto-detect backend port
    const fields = this.selectedFields();
    return `<!-- PeopleCRM Embeddable Form -->
<form action="${apiOrigin}/api/forms/submit/${id}" method="POST" style="max-width: 400px; font-family: sans-serif;">
  <!-- Visually hidden honeypot field to prevent spam bots -->
  <input type="text" name="_hp" style="display:none !important" tabindex="-1" autocomplete="off" />
${
  fields.includes('first_name')
    ? `
  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">First Name</label>
    <input type="text" name="first_name" placeholder="First Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
    : ''
}${
      fields.includes('last_name')
        ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Last Name</label>
    <input type="text" name="last_name" placeholder="Last Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
        : ''
    }

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Address *</label>
    <input type="email" name="email" placeholder="you@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>${
    fields.includes('mobile')
      ? `

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Mobile / Phone</label>
    <input type="text" name="mobile" placeholder="Phone Number" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    fields.includes('notes')
      ? `

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Notes / Message</label>
    <textarea name="notes" placeholder="How can we help?" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
  </div>`
      : ''
  }

  <button type="submit" style="background-color: #0ea5e9; color: white; padding: 10px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; width: 100%;">Subscribe</button>
</form>`;
  });

  protected readonly formUrl = computed(() => {
    const id = this.formId();
    if (!id) return '';
    return window.location.origin.replace(':4200', ':5000') + `/api/forms/view/${id}`;
  });

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'add') {
      this.isNew.set(false);
      this.formId.set(id);
    }
    void this.loadLists();
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
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete web form';
      this.alertSvc.showError(message);
    } finally {
      this.saving.set(false);
    }
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

        try {
          if (this.isNew()) {
            const result = (await this.formsSvc.add(payload)) as { id: string };
            this.alertSvc.showSuccess('Form created successfully!');
            if (typeof done === 'function') {
              done();
            } else {
              void this.router.navigate(['../', result.id], { relativeTo: this.route });
            }
          } else {
            const id = this.formId()!;
            await this.formsSvc.update(id, payload);
            this.alertSvc.showSuccess('Form updated successfully!');
            if (typeof done === 'function') {
              done();
            } else {
              void this.router.navigate(['/forms', id]);
            }
          }
        } catch (err: any) {
          const msg = err.message || 'An error occurred while saving the form.';
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
