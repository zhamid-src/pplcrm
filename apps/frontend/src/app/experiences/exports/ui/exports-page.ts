import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { get, del } from 'idb-keyval';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

@Component({
  selector: 'pc-exports-page',
  imports: [Icon],
  templateUrl: './exports-page.html',
})
export class ExportsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertSvc = inject(AlertService);

  protected jobs = signal<ExportJob[]>([]);
  protected loading = signal(true);

  constructor() {
    // kick once at construction
    this.load();

    // poll every 5s only when:
    //  - page is visible
    //  - not currently loading
    effect(
      (onCleanup) => {
        if (document.visibilityState !== 'visible') return;
        if (this.loading()) return;

        const id = setInterval(() => this.load(), 5000);
        onCleanup(() => clearInterval(id)); // stop when deps change or cmp destroyed
      },
      { allowSignalWrites: true },
    );

    // optional: re-run the effect when tab visibility changes
    // (so polling pauses when hidden and resumes when shown)
    const handleVisibilityChange = () => {
      // Touch a signal so visibility changes trigger effect re-evaluation
      void this.loading();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  protected formatDate(ms: number) {
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return '';
    }
  }

  protected isExpired(job: ExportJob): boolean {
    const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - job.created_at > EXPIRE_MS;
  }

  protected async downloadJob(job: ExportJob) {
    if (this.isExpired(job)) {
      this.alertSvc.showError('This export file has expired.');
      return;
    }

    try {
      const csvContent = await get(`pc_export_file_${job.id}`);
      if (!csvContent) {
        this.alertSvc.showError('Export file content not found or expired.');
        return;
      }

      const blob = new Blob([csvContent as string], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = job.filename || 'export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download export file', e);
      this.alertSvc.showError('Failed to download export file.');
    }
  }

  private async load() {
    this.loading.set(true);
    try {
      const list = ((await get('pc_export_jobs')) as ExportJob[]) || [];

      // Clean up/check expired files
      const now = Date.now();
      const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
      for (const job of list) {
        if (now - job.created_at > EXPIRE_MS && job.status === 'completed') {
          try {
            await del(`pc_export_file_${job.id}`);
          } catch {}
        }
      }

      // newest first
      list.sort((a, b) => b.created_at - a.created_at);
      this.jobs.set(list);
    } finally {
      this.loading.set(false);
    }
  }
}

type ExportJob = {
  created_at: number;
  details?: string;
  id: string;
  name: string;
  status: 'in_progress' | 'completed' | 'failed';
  filename?: string;
};
