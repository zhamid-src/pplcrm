import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

/**
 * A single breadcrumb entry. Crumbs with a `route` render as links;
 * the last crumb (the current page) renders as plain text.
 */
export interface PcBreadcrumb {
  label: string;
  route?: string | readonly unknown[];
}

@Component({
  selector: 'pc-breadcrumbs',
  imports: [RouterLink, Icon],
  template: `
    <div class="flex min-w-0 items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" class="min-w-0 text-xs text-base-content/50">
        <ol class="flex flex-wrap items-center gap-1.5">
          @for (crumb of crumbs(); track $index; let last = $last; let first = $first) {
            <li class="flex min-w-0 items-center gap-1.5">
              <!-- The first crumb doubles as the page title (pages no longer repeat it
                   in-body), so it renders larger and in full-contrast ink. -->
              @if (!last && crumb.route) {
                <a
                  [routerLink]="crumb.route"
                  class="max-w-48 truncate font-medium hover:underline"
                  [class]="first ? 'text-sm font-semibold text-base-content' : 'text-primary'"
                >
                  {{ crumb.label }}
                </a>
              } @else {
                <span
                  class="max-w-48 truncate font-medium"
                  [class]="first ? 'text-sm font-semibold text-base-content' : 'text-base-content/60'"
                  [attr.aria-current]="last ? 'page' : null"
                >
                  {{ crumb.label }}
                </span>
              }
              @if (!last) {
                <span class="select-none opacity-60" aria-hidden="true">/</span>
              }
            </li>
          }
        </ol>
      </nav>
      @if (positionLabel()) {
        <div class="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs"
            [attr.aria-label]="prevLabel()"
            [disabled]="!hasPrev()"
            (click)="prev.emit()"
          >
            <pc-icon name="chevron-left" [size]="4"></pc-icon>
          </button>
          <span class="whitespace-nowrap px-1 text-xs tabular-nums text-base-content/50">{{ positionLabel() }}</span>
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs"
            [attr.aria-label]="nextLabel()"
            [disabled]="!hasNext()"
            (click)="next.emit()"
          >
            <pc-icon name="chevron-right" [size]="4"></pc-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class Breadcrumbs {
  public readonly crumbs = input.required<PcBreadcrumb[]>();

  /** Optional "N of M filtered" walk-the-list pager, rendered inline with the crumb trail. */
  public readonly positionLabel = input<string | null>(null);
  public readonly hasPrev = input<boolean>(false);
  public readonly hasNext = input<boolean>(false);
  public readonly prevLabel = input<string>('Previous record');
  public readonly nextLabel = input<string>('Next record');

  public readonly prev = output<void>();
  public readonly next = output<void>();
}
