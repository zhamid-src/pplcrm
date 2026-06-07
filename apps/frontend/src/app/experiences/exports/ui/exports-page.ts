import { Component, inject, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TokenService } from '../../../services/api/token-service';
import { TRPCService } from '../../../services/api/trpc-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SpinOnClickDirective } from '@uxcommon/directives/spin-on-click.directive';
import type { DataExportRecordType } from '@common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pc-exports-page',
  imports: [Icon, SpinOnClickDirective],
  templateUrl: './exports-page.html',
})
export class ExportsPage extends TRPCService<any> {
  private readonly alertSvc = inject(AlertService);
  private readonly tokenSvc = inject(TokenService);

  protected readonly jobs = signal<DataExportRecordType[]>([]);
  protected readonly _loading = createLoadingGate();

  constructor() {
    super();
    this.load();
  }

  /** Manually refresh the list from the backend. */
  protected refresh() {
    void this.load();
  }

  protected formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return '';
    }
  }

  protected isExpired(job: DataExportRecordType): boolean {
    const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(job.created_at).getTime() > EXPIRE_MS;
  }

  protected downloadJob(job: DataExportRecordType) {
    if (this.isExpired(job)) {
      this.alertSvc.showError('This export has expired (30+ days old).');
      return;
    }
    if (job.status !== 'completed') {
      this.alertSvc.showError('Export is not ready yet.');
      return;
    }
    // Stream download via the protected REST endpoint
    const token = this.tokenSvc.getAuthToken();
    const url = `${environment.apiUrl}/api/exports/download/${job.id}?token=${encodeURIComponent(token ?? '')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = job.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private async load() {
    const end = this._loading.begin();
    try {
      const list = await (this.api as any).exports.list.query();
      this.jobs.set(list ?? []);
    } catch {
      this.alertSvc.showError('Failed to load exports. Please try again.');
    } finally {
      end();
    }
  }
}
