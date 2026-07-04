import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  template: `
    <nav aria-label="Breadcrumb" class="text-xs text-base-content/50">
      <ol class="flex flex-wrap items-center gap-1.5">
        @for (crumb of crumbs(); track $index; let last = $last) {
          <li class="flex min-w-0 items-center gap-1.5">
            @if (!last && crumb.route) {
              <a [routerLink]="crumb.route" class="max-w-48 truncate font-medium text-primary hover:underline">
                {{ crumb.label }}
              </a>
            } @else {
              <span
                class="max-w-48 truncate font-medium text-base-content/60"
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
  `,
})
export class Breadcrumbs {
  public readonly crumbs = input.required<PcBreadcrumb[]>();
}
