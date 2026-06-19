import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { form, validateStandardSchema } from '@angular/forms/signals';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { Textarea as PcTextarea } from '@uxcommon/components/textarea/textarea';
import { CompanyInputObj } from '../../../../../../../libs/common/src';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { CompaniesService } from '../services/companies-service';
import { PeopleInCompany } from './people-in-company';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-company-detail',
  imports: [DatePipe, PcInput, PcTextarea, Icon, PeopleInCompany, RouterModule, FormActions],
  templateUrl: './company-detail.html',
})
export class CompanyDetail implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);

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
  protected id = input<string>();
  protected isLoading = this._loading.visible;

  public mode = input<'new' | 'edit'>('edit');
  protected readonly isNewMode = computed(() => this.mode() === 'new' || !this.id());

  public async ngOnInit() {
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
    if (!this.id()) return;
    const end = this._loading.begin();
    try {
      const data = await this.companiesSvc.getById(this.id()!);
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

  protected async deleteCompany() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Company',
      message: 'Are you sure you want to delete this company? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const end = this._loading.begin();
    try {
      await this.companiesSvc.delete(this.id()!);
      this.companiesSvc.triggerRefresh();
      this.alertSvc.showSuccess('Company deleted');
      await this.router.navigate(['/companies']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete company';
      this.alertSvc.showError(message);
    } finally {
      end();
    }
  }

  protected save(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }
    const raw = this.payload();
    if (this.id()) {
      const end = this._loading.begin();
      this.companiesSvc
        .update(this.id()!, raw)
        .then(() => {
          this.companiesSvc.triggerRefresh();
          this.alertSvc.showSuccess('Company updated successfully');
          if (typeof done === 'function') {
            done();
          } else {
            this.router.navigate(['/companies', this.id()]);
          }
        })
        .catch((err: any) => {
          const message = err?.message || err?.data?.message || 'Unable to save company';
          this.alertSvc.showError(message);
        })
        .finally(() => end());
    } else {
      const end = this._loading.begin();
      this.companiesSvc
        .add(raw)
        .then(() => {
          this.companiesSvc.triggerRefresh();
          this.alertSvc.showSuccess('Company added successfully');
          if (typeof done === 'function') {
            done();
          } else {
            this.router.navigate(['/companies']);
          }
        })
        .catch((err: any) => {
          const message = err?.message || err?.data?.message || 'Unable to save company';
          this.alertSvc.showError(message);
        })
        .finally(() => end());
    }
  }
}
