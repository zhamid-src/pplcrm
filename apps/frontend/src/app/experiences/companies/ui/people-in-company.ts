import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PersonsService } from '../../persons/services/persons-service';
import { Persons } from '../../../../../../../libs/common/src/lib/kysely.models';

@Component({
  selector: 'pc-people-in-company',
  imports: [RouterModule],
  template: `<div class="flex flex-col">
    @if (!peopleInCompany().length && !isLoading()) {
      <p i18n class="py-2 text-sm italic text-base-content/40">No people linked to this company yet.</p>
    }
    @for (person of peopleInCompany(); track person.id) {
      <a
        routerLink="/people/{{ person.id }}"
        class="flex items-center gap-3 rounded-lg px-2 py-2.5 no-underline transition-colors hover:bg-base-200/60"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          aria-hidden="true"
          >{{ initials(person) }}</span
        >
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold text-base-content">{{
            person.full_name || 'Unnamed person'
          }}</span>
          @if (person.email) {
            <span class="truncate text-xs text-base-content/50">{{ person.email }}</span>
          }
        </span>
      </a>
    }
    @if (hasMore()) {
      <button
        i18n
        type="button"
        class="mt-1 self-start text-xs text-primary hover:underline"
        (click)="loadMore()"
        [disabled]="isLoading()"
      >
        Show more
      </button>
    }
  </div>`,
})
export class PeopleInCompany {
  private personsSvc = inject(PersonsService);

  protected peopleInCompany = signal<Array<Persons & { full_name: string }>>([]);
  protected isLoading = signal(false);
  protected hasMore = signal(false);

  private readonly pageSize = 25;
  private currentOffset = signal(0);
  private requestSequence = 0;
  private lastParams: { id: string } | null = null;

  public companyId = input.required<string>();

  constructor() {
    effect(() => {
      const id = this.companyId();

      if (!id) {
        this.resetState();
        this.lastParams = null;
        return;
      }

      if (this.lastParams && this.lastParams.id === id) {
        return;
      }

      this.lastParams = { id };
      this.resetState();
      void this.fetchPage({ id, offset: 0, replace: true });
    });
  }

  protected initials(person: Persons & { full_name: string }): string {
    const first = person.first_name?.trim()?.[0] ?? '';
    const last = person.last_name?.trim()?.[0] ?? '';
    return (first + last).toUpperCase() || (person.full_name?.trim()?.[0]?.toUpperCase() ?? '?');
  }

  protected async loadMore() {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    const id = this.companyId();
    if (!id) {
      return;
    }

    const offset = this.currentOffset();
    await this.fetchPage({ id, offset, replace: false });
  }

  private resetState() {
    this.peopleInCompany.set([]);
    this.currentOffset.set(0);
    this.hasMore.set(false);
    this.isLoading.set(false);
    this.requestSequence++;
  }

  private async fetchPage(params: { id: string; offset: number; replace: boolean }) {
    const { id, offset, replace } = params;
    const requestId = ++this.requestSequence;
    this.isLoading.set(true);

    try {
      const people = (await this.personsSvc.getByCompanyId(id, {
        limit: this.pageSize,
        offset,
        columns: ['first_name', 'last_name', 'email'],
      })) as Persons[];

      if (requestId !== this.requestSequence) {
        return;
      }

      const mapped = people.map((person) => ({
        ...person,
        full_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      }));

      if (replace) {
        this.peopleInCompany.set(mapped);
      } else {
        this.peopleInCompany.update((current) => [...current, ...mapped]);
      }

      this.currentOffset.set(offset + people.length);
      this.hasMore.set(people.length === this.pageSize);
    } finally {
      if (requestId === this.requestSequence) {
        this.isLoading.set(false);
      }
    }
  }
}
