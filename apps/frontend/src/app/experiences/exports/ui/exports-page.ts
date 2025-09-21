import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Icon } from '@icons/icon';

import { get } from 'idb-keyval';

@Component({
  selector: 'pc-exports-page',
  standalone: true,
  imports: [Icon],
  templateUrl: './exports-page.html',
})
export class ExportsPage {
  private readonly destroyRef = inject(DestroyRef);

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
}

type ExportJob = {
  created_at: number;
  details?: string;
  id: string;
  name: string;
  status: 'in_progress' | 'completed' | 'failed';
};
