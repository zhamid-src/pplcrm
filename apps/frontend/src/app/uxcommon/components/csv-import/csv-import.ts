import { ChangeDetectionStrategy, Component, NgZone, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

export type CsvImportSummary = {
  inserted: number;
  errors: number;
  skipped: number;
  failed?: boolean;
  message?: string;
  tag?: string;
};

@Component({
  selector: 'pc-csv-importer',
  standalone: true,
  imports: [FormsModule, Icon],
  templateUrl: './csv-import.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsvImportComponent {
  private readonly zone = inject(NgZone);
  private readonly alerts = inject(AlertService);

  // Inputs
  public readonly title = input<string>('Import Data from CSV');
  public readonly open = input<boolean>(false);
  public readonly mappableFields = input<string[]>([]);
  public readonly autoMapHeader = input<(h: string) => string>(() => '');
  public readonly previewPageSize = input<number>(5);
  public readonly summary = input<CsvImportSummary | null>(null);

  // Outputs
  public readonly submit = output<{ rows: Array<Record<string, string>>; skipped: number; fileName?: string | null }>();
  public readonly close = output<void>();
  public readonly closeSummary = output<void>();

  // State signals
  protected readonly parsing = signal(false);
  protected readonly csvHeaders = signal<string[]>([]);
  protected readonly csvRows = signal<Array<Record<string, string>>>([]);
  protected readonly mapping = signal<string[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly submitted = signal(false);
  protected readonly fileName = signal<string | null>(null);

  private getNonEmptyMappedRows() {
    const map = this.mapping();
    const headers = this.csvHeaders();
    const rows = this.csvRows();
    const mapped = rows.map((row) => {
      const result: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const field = map[idx];
        if (!field) return;
        const raw = (row[h] ?? '').toString();
        if (raw && !(field in result) && raw.trim().length > 0) result[field] = raw;
      });
      return result;
    });
    const nonEmpty = mapped.filter((r) => Object.keys(r).length > 0);
    return { nonEmpty, skipped: mapped.length - nonEmpty.length };
  }

  protected readonly totalPages = computed(() => {
    const total = Math.ceil((this.csvRows().length || 0) / this.previewPageSize());
    return total || 1;
  });
  protected readonly canNext = computed(() => (this.pageIndex() + 1) * this.previewPageSize() < this.csvRows().length);
  protected readonly canPrev = computed(() => this.pageIndex() > 0);

  constructor() {
    // Auto-map when headers first arrive
    effect(() => {
      const headers = this.csvHeaders();
      if (!headers.length) return;
      const auto = this.autoMapHeader();
      const mapped = headers.map((h) => (typeof auto === 'function' ? auto(h) : ''));
      this.mapping.set(mapped);
    });
    // Reset submitted flag whenever dialog is opened anew
    effect(() => {
      if (this.open()) {
        this.submitted.set(false);
      }
    });
  }

  protected previewRows() {
    const start = this.pageIndex() * this.previewPageSize();
    const end = start + this.previewPageSize();
    return this.csvRows().slice(start, end);
  }

  protected nextPage() {
    if (this.canNext()) this.pageIndex.update((v) => v + 1);
  }

  protected prevPage() {
    if (this.canPrev()) this.pageIndex.update((v) => v - 1);
  }

  protected setMappingAt(index: number, value: string) {
    const m = [...this.mapping()];
    m[index] = value;
    this.mapping.set(m);
  }

  protected onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.zone.run(() => this.parsing.set(true));
    this.fileName.set(file.name || null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      try {
        const worker = new Worker(new URL('./csv.worker.ts', import.meta.url), { type: 'module' });
        const handle = (e: MessageEvent) => {
          const data: any = e.data || {};
          if (data.type === 'result') {
            this.zone.run(() => {
              this.csvHeaders.set(data.headers || []);
              this.csvRows.set(data.rows || []);
              this.pageIndex.set(0);
              this.parsing.set(false);
            });
            worker.onmessage = null;
            worker.terminate();
          } else if (data.type === 'error') {
            this.zone.run(() => {
              this.alerts.showError(data.message || 'Failed to parse CSV');
              this.parsing.set(false);
            });
            worker.onmessage = null;
            worker.terminate();
          }
        };
        worker.onmessage = handle;
        worker.postMessage({ type: 'parse', text });
      } catch {
        this.zone.run(() => {
          this.alerts.showError('Failed to parse CSV');
          this.parsing.set(false);
        });
      }
    };
    reader.onerror = () => this.zone.run(() => this.parsing.set(false));
    reader.readAsText(file);
  }

  protected onSubmit() {
    const { nonEmpty, skipped } = this.getNonEmptyMappedRows();
    if (!nonEmpty.length) {
      this.alerts.showError('Nothing to import. Please map at least one column.');
      return;
    }
    this.submitted.set(true);
    this.submit.emit({ rows: nonEmpty, skipped, fileName: this.fileName() });
  }

  protected requestClose() {
    this.close.emit();
  }

  protected onCloseDialog() {
    // Soft reset local state when dialog closes via native controls
    this.csvHeaders.set([]);
    this.csvRows.set([]);
    this.mapping.set([]);
    this.pageIndex.set(0);
    this.parsing.set(false);
    this.submitted.set(false);
    this.fileName.set(null);
    // Propagate close so parent can clear any summary state
    this.close.emit();
  }

  protected onSummaryClosed() {
    this.submitted.set(false);
    this.closeSummary.emit();
  }

  protected closeDialog() {
    // Close the hosting dialog element programmatically
    const active = document.activeElement as HTMLElement | null;
    const dlg = active?.closest('dialog') as HTMLDialogElement | null;
    if (dlg) {
      dlg.close();
      return;
    }
    // Fallback: just emit close
    this.close.emit();
  }
}
