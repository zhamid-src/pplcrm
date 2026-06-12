import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { CompanyInputObj } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { CompaniesService } from '../services/companies-service';
import { PeopleInCompany } from './people-in-company';

@Component({
  selector: 'pc-company-detail',
  imports: [DatePipe, FormField, Icon, PeopleInCompany],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-base-content/60 mt-4">Loading company details...</p>
        </div>
      }

      @if (!isLoading()) {
        <div class="space-y-6">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
                <pc-icon name="briefcase" class="text-primary" [size]="7"></pc-icon>
                {{ isNewMode() ? 'Add Company' : 'Company: ' + (company()?.name || '') }}
              </h1>
              <p class="text-sm text-base-content/60 mt-1">
                {{ isNewMode() ? 'Create a new company record' : 'View and update company information' }}
              </p>
            </div>
            <button class="btn btn-outline btn-sm gap-2" (click)="goBack()">
              <pc-icon name="arrow-left" [size]="4"></pc-icon>
              Back
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Form Section -->
            <div class="lg:col-span-2 card bg-base-100 border border-base-300 shadow-xl overflow-hidden">
              <div class="card-body p-6 space-y-4">
                <!-- Name -->
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text font-medium">Company Name</span>
                  </div>
                  <input
                    class="input input-bordered w-full"
                    type="text"
                    [formField]="form.name"
                    placeholder="e.g. Acme Corp"
                    [class.input-error]="form.name().invalid() && (form.name().dirty() || form.name().touched())"
                  />
                  @if (form.name().invalid() && (form.name().dirty() || form.name().touched())) {
                    @for (err of form.name().errors(); track err) {
                      <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                    }
                  }
                </label>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Website -->
                  <label class="form-control w-full">
                    <div class="label">
                      <span class="label-text font-medium">Website</span>
                    </div>
                    <input
                      class="input input-bordered w-full"
                      type="url"
                      [formField]="form.website"
                      placeholder="https://example.com"
                      [class.input-error]="
                        form.website().invalid() && (form.website().dirty() || form.website().touched())
                      "
                    />
                    @if (form.website().invalid() && (form.website().dirty() || form.website().touched())) {
                      @for (err of form.website().errors(); track err) {
                        <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                      }
                    }
                  </label>

                  <!-- Industry -->
                  <label class="form-control w-full">
                    <div class="label">
                      <span class="label-text font-medium">Industry</span>
                    </div>
                    <input
                      class="input input-bordered w-full"
                      type="text"
                      [formField]="form.industry"
                      placeholder="e.g. Technology"
                      [class.input-error]="
                        form.industry().invalid() && (form.industry().dirty() || form.industry().touched())
                      "
                    />
                    @if (form.industry().invalid() && (form.industry().dirty() || form.industry().touched())) {
                      @for (err of form.industry().errors(); track err) {
                        <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                      }
                    }
                  </label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Email -->
                  <label class="form-control w-full">
                    <div class="label">
                      <span class="label-text font-medium">Email</span>
                    </div>
                    <input
                      class="input input-bordered w-full"
                      type="email"
                      [formField]="form.email"
                      placeholder="info@example.com"
                      [class.input-error]="form.email().invalid() && (form.email().dirty() || form.email().touched())"
                    />
                    @if (form.email().invalid() && (form.email().dirty() || form.email().touched())) {
                      @for (err of form.email().errors(); track err) {
                        <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                      }
                    }
                  </label>

                  <!-- Phone -->
                  <label class="form-control w-full">
                    <div class="label">
                      <span class="label-text font-medium">Phone</span>
                    </div>
                    <input
                      class="input input-bordered w-full"
                      type="tel"
                      [formField]="form.phone"
                      placeholder="+1 555-0100"
                      [class.input-error]="form.phone().invalid() && (form.phone().dirty() || form.phone().touched())"
                    />
                    @if (form.phone().invalid() && (form.phone().dirty() || form.phone().touched())) {
                      @for (err of form.phone().errors(); track err) {
                        <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                      }
                    }
                  </label>
                </div>

                <!-- Description -->
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text font-medium">Description</span>
                  </div>
                  <textarea
                    class="textarea textarea-bordered w-full"
                    rows="3"
                    [formField]="form.description"
                    placeholder="Company description..."
                    [class.textarea-error]="
                      form.description().invalid() && (form.description().dirty() || form.description().touched())
                    "
                  ></textarea>
                  @if (form.description().invalid() && (form.description().dirty() || form.description().touched())) {
                    @for (err of form.description().errors(); track err) {
                      <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                    }
                  }
                </label>

                <!-- Notes -->
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text font-medium">Internal Notes</span>
                  </div>
                  <textarea
                    class="textarea textarea-bordered w-full"
                    rows="4"
                    [formField]="form.notes"
                    placeholder="Any additional notes..."
                    [class.textarea-error]="form.notes().invalid() && (form.notes().dirty() || form.notes().touched())"
                  ></textarea>
                  @if (form.notes().invalid() && (form.notes().dirty() || form.notes().touched())) {
                    @for (err of form.notes().errors(); track err) {
                      <p class="text-[11px] text-error pl-1 mt-1">{{ err.message }}</p>
                    }
                  }
                </label>

                <div class="card-actions justify-end pt-4 border-t border-base-300">
                  <button class="btn btn-primary" [disabled]="form().invalid()" (click)="save()">
                    <pc-icon name="save" [size]="4"></pc-icon>
                    Save Company
                  </button>
                </div>
              </div>
            </div>

            <!-- Members & Info Panel -->
            <div class="space-y-6">
              <!-- Employee List (Only when edit mode) -->
              @if (!isNewMode() && id) {
                <div class="card bg-base-100 border border-base-300 shadow-xl">
                  <div class="card-body p-6">
                    <h3 class="font-bold text-lg text-base-content mb-4 flex items-center gap-2">
                      <pc-icon name="user-group" class="text-primary" [size]="5"></pc-icon>
                      Associated Employees
                    </h3>
                    <pc-people-in-company [companyId]="id"></pc-people-in-company>
                  </div>
                </div>
              }



              <!-- Metadata Card -->
              @if (!isNewMode()) {
                <div class="card bg-base-200/50 border border-base-300 shadow-xl">
                  <div class="card-body p-5 space-y-3 text-xs text-base-content/60">
                    <div class="flex justify-between">
                      <span>Created:</span>
                      <span class="font-semibold">{{ company()?.created_at | date: 'medium' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Last Updated:</span>
                      <span class="font-semibold">{{ company()?.updated_at | date: 'medium' }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CompanyDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly _loading = createLoadingGate();
  protected readonly company = signal<any | null>(null);

  protected readonly payload = signal({
    name: '',
    description: '',
    website: '',
    industry: '',
    email: '',
    phone: '',
    notes: '',
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, CompanyInputObj);
  });
  protected id: string | null = null;
  protected isLoading = this._loading.visible;

  public mode = input<'new' | 'edit'>('edit');
  protected readonly isNewMode = computed(() => this.mode() === 'new' || !this.id);

  public async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    await this.loadCompany();
    if (this.isNewMode()) {
      const state = window.history.state;
      if (state && state.cloneData) {
        const data = state.cloneData;
        this.payload.set({
          name: data.name ? `${data.name} (Copy)` : '',
          description: data.description ?? '',
          website: data.website ?? '',
          industry: data.industry ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          notes: data.notes ?? '',
        });
      }
    }
  }

  private async loadCompany() {
    if (!this.id) return;
    const end = this._loading.begin();
    try {
      const data = await this.companiesSvc.getById(this.id);
      this.company.set(data);
      if (data) {
        this.payload.set({
          name: data.name ?? '',
          description: data.description ?? '',
          website: data.website ?? '',
          industry: data.industry ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          notes: data.notes ?? '',
        });
        this.form().reset();
      }
    } catch (err: any) {
      console.error('Failed to load company details:', err);
    } finally {
      end();
    }
  }

  protected save() {
    const raw = this.payload();
    if (this.id) {
      const end = this._loading.begin();
      this.companiesSvc
        .update(this.id, raw)
        .then(() => {
          this.companiesSvc.triggerRefresh();
          this.alertSvc.showSuccess('Company updated successfully');
          this.router.navigate(['/companies']);
        })
        .finally(() => end());
    } else {
      const end = this._loading.begin();
      this.companiesSvc
        .add(raw)
        .then(() => {
          this.companiesSvc.triggerRefresh();
          this.alertSvc.showSuccess('Company added successfully');
          this.router.navigate(['/companies']);
        })
        .finally(() => end());
    }
  }

  protected goBack() {
    this.router.navigate(['/companies']);
  }
}
