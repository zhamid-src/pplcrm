import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PersonsService } from '../../persons/services/persons-service';

@Component({
  selector: 'pc-people-in-company',
  imports: [RouterModule],
  template: `<div>
    <ul class="space-y-1.5">
      @if (!peopleInCompany().length && !isLoading()) {
        <span class="text-sm text-base-content/50 italic">No employees found.</span>
      }
      @for (person of peopleInCompany(); track person.id) {
        <li class="flex items-center gap-2">
          <a routerLink="/people/{{ person.id }}" class="link hover:no-underline font-medium text-primary">
            {{ person.full_name }}
          </a>
          @if (person.email) {
            <span class="text-xs text-base-content/40">({{ person.email }})</span>
          }
        </li>
      }
    </ul>
    @if (hasMore()) {
      <div class="mt-2">
        <button type="button" class="btn btn-xs btn-ghost text-primary" (click)="loadMore()" [disabled]="isLoading()">
          - More -
        </button>
      </div>
    }
  </div>`,
})
export class PeopleInCompany {
  private personsSvc = inject(PersonsService);

  protected peopleInCompany = signal<any[]>([]);
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
      })) as any[];

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
