import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { PersonsService } from '@experiences/persons/services/persons-service';

/**
 * The People grain tabs (spec §5): one row under the grid header that switches the
 * grid between the three grains of the same dataset — People · Households · Companies —
 * with per-grain totals in the labels (tabular-nums). Rendered on all three grid pages
 * via the datagrid's `[pcGridBelowHeader]` projection slot; deep links to each grain's
 * detail/edit routes are untouched.
 *
 * Counts load once per instantiation; until a count arrives the label renders without
 * a number (never a fake or stale one).
 */
@Component({
  selector: 'pc-grain-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="border-line -mt-1 mb-2 flex items-center gap-1 border-b" aria-label="People, households and companies">
      @for (tab of tabs(); track tab.route) {
        <a
          [routerLink]="tab.route"
          routerLinkActive="!text-primary !font-semibold !border-primary"
          [routerLinkActiveOptions]="{ exact: true }"
          class="-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] tracking-[0.03em] text-base-content/70 transition-colors hover:text-primary"
        >
          {{ tab.label }}
          @if (tab.count !== null) {
            <span class="text-xs tabular-nums opacity-70">{{ tab.count }}</span>
          }
        </a>
      }
    </nav>
  `,
})
export class GrainTabs {
  private readonly personsSvc = inject(PersonsService);
  private readonly householdsSvc = inject(HouseholdsService);
  private readonly companiesSvc = inject(CompaniesService);

  private readonly formatter = new Intl.NumberFormat();

  private readonly peopleCount = signal<number | null>(null);
  private readonly householdsCount = signal<number | null>(null);
  private readonly companiesCount = signal<number | null>(null);

  protected readonly tabs = computed(() => [
    { label: 'People', route: '/people', count: this.format(this.peopleCount()) },
    { label: 'Households', route: '/households', count: this.format(this.householdsCount()) },
    { label: 'Companies', route: '/companies', count: this.format(this.companiesCount()) },
  ]);

  constructor() {
    void this.loadCounts();
  }

  /** Re-query the per-grain totals (e.g. after a delete on the hosting grid). */
  public reloadCounts(): void {
    void this.loadCounts();
  }

  private format(count: number | null): string | null {
    return count === null ? null : this.formatter.format(count);
  }

  private async loadCounts(): Promise<void> {
    // Each count fails independently; a failed count simply leaves that label bare.
    const [people, households, companies] = await Promise.allSettled([
      this.personsSvc.count(),
      this.householdsSvc.count(),
      this.companiesSvc.count(),
    ]);
    if (people.status === 'fulfilled') this.peopleCount.set(people.value);
    if (households.status === 'fulfilled') this.householdsCount.set(households.value);
    if (companies.status === 'fulfilled') this.companiesCount.set(companies.value);
  }
}
