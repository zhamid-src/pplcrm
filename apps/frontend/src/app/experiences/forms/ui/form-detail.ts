import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { FormsService } from '../services/forms-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@uxcommon/components/tags/tags';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { Icon } from '@icons/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pc-form-detail',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Tags, TagItem, Icon],
  templateUrl: './form-detail.html',
})
export class FormDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly alertSvc = inject(AlertService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isNew = signal(true);
  protected readonly formId = signal<string | null>(null);

  protected readonly availableLists = signal<Array<{ id: string; name: string }>>([]);
  protected readonly selectedLists = signal<string[]>([]);
  protected readonly selectedTags = signal<string[]>([]);

  protected readonly formGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    redirect_url: ['', [Validators.pattern(/^https?:\/\/.+/) || Validators.required]],
    status: ['active', [Validators.required]],
  });

  protected readonly embedSnippet = computed(() => {
    const id = this.formId();
    if (!id) return '';
    const apiOrigin = window.location.origin.replace(':4200', ':5000'); // Auto-detect backend port
    return `<!-- PeopleCRM Embeddable Form -->
<form action="${apiOrigin}/api/forms/submit/${id}" method="POST" style="max-width: 400px; font-family: sans-serif;">
  <!-- Visually hidden honeypot field to prevent spam bots -->
  <input type="text" name="_hp" style="display:none !important" tabindex="-1" autocomplete="off" />

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">First Name</label>
    <input type="text" name="first_name" placeholder="First Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Last Name</label>
    <input type="text" name="last_name" placeholder="Last Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Address *</label>
    <input type="email" name="email" placeholder="you@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Mobile / Phone</label>
    <input type="text" name="mobile" placeholder="Phone Number" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>

  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Notes / Message</label>
    <textarea name="notes" placeholder="How can we help?" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
  </div>

  <button type="submit" style="background-color: #6366f1; color: white; padding: 10px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; width: 100%;">Subscribe</button>
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

  protected async save() {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) {
      this.alertSvc.showError('Please check your inputs.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const values = this.formGroup.getRawValue();
    const payload = {
      name: values.name?.trim() ?? '',
      description: values.description?.trim() || null,
      redirect_url: values.redirect_url?.trim() || null,
      target_tags: this.selectedTags().length ? this.selectedTags() : null,
      target_lists: this.selectedLists().length ? this.selectedLists() : null,
      status: (values.status as 'active' | 'archived') ?? 'active',
    };

    try {
      if (this.isNew()) {
        const result = (await this.formsSvc.add(payload)) as { id: string };
        this.alertSvc.showSuccess('Form created successfully!');
        void this.router.navigate(['../', result.id], { relativeTo: this.route });
      } else {
        const id = this.formId()!;
        await this.formsSvc.update(id, payload);
        this.alertSvc.showSuccess('Form updated successfully!');
        void this.loadFormDetails();
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred while saving the form.';
      this.error.set(msg);
      this.alertSvc.showError(msg);
    } finally {
      this.saving.set(false);
    }
  }

  private async loadLists(): Promise<void> {
    this.loading.set(true);
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
      } else {
        this.loading.set(false);
      }
    } catch (err) {
      console.error('Failed to load lists', err);
      this.loading.set(false);
    }
  }

  private async loadFormDetails(): Promise<void> {
    const id = this.formId();
    if (!id) return;
    this.loading.set(true);
    try {
      const form = (await this.formsSvc.getById(id)) as any;
      if (form) {
        this.formGroup.setValue({
          name: form.name ?? '',
          description: form.description ?? '',
          redirect_url: form.redirect_url ?? '',
          status: form.status ?? 'active',
        });
        this.selectedTags.set(Array.isArray(form.target_tags) ? form.target_tags : []);
        this.selectedLists.set(Array.isArray(form.target_lists) ? form.target_lists : []);
      }
    } catch (err) {
      console.error('Failed to load form details', err);
      this.error.set('Failed to load form details.');
    } finally {
      this.loading.set(false);
    }
  }
}
