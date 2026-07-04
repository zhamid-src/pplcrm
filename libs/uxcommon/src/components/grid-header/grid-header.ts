import { Component, computed, input, signal } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-grid-header',
  imports: [Icon],
  template: `
    <header class="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="text-[11px] font-semibold uppercase tracking-widest text-base-content/50">{{ eyebrow() }}</p>
        }
        <div class="flex items-center gap-1.5">
          <h1 class="truncate text-xl font-bold tracking-tight text-base-content">{{ title() }}</h1>
          @if (description()) {
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-xs text-base-content/40 hover:text-primary"
              aria-label="About this page"
              [attr.aria-expanded]="descriptionOpen()"
              (click)="toggleDescription()"
            >
              <pc-icon name="information-circle" [size]="4"></pc-icon>
            </button>
          }
        </div>
        @if (countText(); as text) {
          <p class="text-xs tabular-nums text-base-content/60" aria-live="polite">{{ text }}</p>
        }
        @if (descriptionOpen() && description()) {
          <p class="mt-1 max-w-2xl text-xs leading-relaxed text-base-content/60">{{ description() }}</p>
        }
      </div>
      <div class="flex items-center gap-2">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class GridHeaderComponent {
  public readonly title = input.required<string>();
  public readonly description = input<string>('');
  public readonly eyebrow = input<string>('');

  /** Initial expanded state of the description; the ⓘ button toggles it afterwards. */
  public readonly open = input<boolean>(false);

  /** Total row count for the current query; null while unknown (before the first load). */
  public readonly totalCount = input<number | null>(null);

  /** Whether any user-applied filter is narrowing the results. */
  public readonly filtered = input<boolean>(false);

  private readonly descToggled = signal<boolean | null>(null);
  protected readonly descriptionOpen = computed(() => this.descToggled() ?? this.open());

  private readonly countFormatter = new Intl.NumberFormat();

  protected readonly countText = computed<string | null>(() => {
    const count = this.totalCount();
    if (count === null) return null;
    if (this.filtered()) {
      return count === 1 ? '1 matches your filters' : `${this.countFormatter.format(count)} match your filters`;
    }
    return count === 1 ? '1 total' : `${this.countFormatter.format(count)} total`;
  });

  protected toggleDescription(): void {
    this.descToggled.set(!this.descriptionOpen());
  }
}
