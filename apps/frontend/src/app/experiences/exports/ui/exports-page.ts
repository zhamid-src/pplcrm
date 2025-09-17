import { Component, effect, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { get, set } from 'idb-keyval';

type ExportJob = {
  id: string;
  created_at: number;
  name: string;
  status: 'in_progress' | 'completed' | 'failed';
  details?: string;
};

@Component({
  selector: 'pc-exports-page',
  standalone: true,
  imports: [Icon],
  templateUrl: './exports-page.html',
})
export class ExportsPage {
  protected jobs = signal<ExportJob[]>([]);
  protected loading = signal(true);

  constructor() {
    this.load();
    // Simple polling to refresh statuses if a background task updates them
    const interval = setInterval(() => this.load(), 5000);
    effect(() => {
      if (!this.loading()) {
        // no-op; keep effect subscribed
      }
    });
    // best-effort cleanup when page destroyed (Angular standalone component)
    (globalThis as unknown as { addEventListener?: (t: string, cb: () => void) => void }).addEventListener?.(
      'beforeunload',
      () => clearInterval(interval),
    );
  }

  protected formatDate(ms: number) {
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return '';
    }
  }

  private async load() {
    this.loading.set(true);
    try {
      const list = ((await get('pc_export_jobs')) as ExportJob[]) || [];
      // newest first
      list.sort((a, b) => b.created_at - a.created_at);
      this.jobs.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  // Utility to seed a demo job (if needed)
  protected async addDemo() {
    const list = ((await get('pc_export_jobs')) as ExportJob[]) || [];
    list.push({ id: crypto.randomUUID(), name: 'People CSV', status: 'in_progress', created_at: Date.now() });
    await set('pc_export_jobs', list);
    await this.load();
  }
}
