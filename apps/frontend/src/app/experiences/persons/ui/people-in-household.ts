/**
 * @file Component for displaying people associated with a household.
 */
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PERSONINHOUSEHOLDTYPE } from '@common';

import { PersonsService } from '../services/persons-service';

/**
 * Component used to render a list of people belonging to a given household.
 * Each person is shown as a link to their detail page.
 */
@Component({
  selector: 'pc-people-in-household',
  imports: [RouterModule],
  template: `<div>
    <ul>
      @if (!peopleInHousehold().length && !isLoading()) {
        <span> No one else </span>
      }
      @for (person of peopleInHousehold(); track person.id) {
        <li>
          <a routerLink="/people/{{ person.id }}" class="link hover:no-underline">{{ person.full_name }}</a>
        </li>
      }
    </ul>
    @if (hasMore()) {
      <div class="mt-2">
        <button type="button" class="link" (click)="loadMore()" [disabled]="isLoading()">- More -</button>
      </div>
    }
  </div>`,
})
export class PeopleInHousehold {
  private personsSvc = inject(PersonsService);

  /** List of people retrieved for the specified household. */
  protected peopleInHousehold = signal<PERSONINHOUSEHOLDTYPE[]>([]);
  protected isLoading = signal(false);
  protected hasMore = signal(false);

  private readonly pageSize = 25;
  private currentOffset = signal(0);
  private requestSequence = 0;
  private lastParams: { id: string; excludeId: string | null } | null = null;

  /** Optional person ID to exclude from the list (e.g., current person). */
  public excludePersonId = input<string | null>(null);

  /** The ID of the household whose members should be listed. */
  public householdId = input.required<string>();

  constructor() {
    // React to input changes
    effect(() => {
      const id = this.householdId();
      const excludeId = this.excludePersonId();

      if (!id) {
        this.resetState();
        this.lastParams = null;
        return;
      }

      if (this.lastParams && this.lastParams.id === id && this.lastParams.excludeId === excludeId) {
        return;
      }

      this.lastParams = { id, excludeId };
      this.resetState();
      void this.fetchPage({ id, excludeId, offset: 0, replace: true });
    });
  }

  protected async loadMore() {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    const id = this.householdId();
    if (!id) {
      return;
    }

    const excludeId = this.excludePersonId();
    const offset = this.currentOffset();
    await this.fetchPage({ id, excludeId, offset, replace: false });
  }

  private resetState() {
    this.peopleInHousehold.set([]);
    this.currentOffset.set(0);
    this.hasMore.set(false);
    this.isLoading.set(false);
    this.requestSequence++;
  }

  private async fetchPage(params: { id: string; excludeId: string | null; offset: number; replace: boolean }) {
    const { id, excludeId, offset, replace } = params;
    const requestId = ++this.requestSequence;
    this.isLoading.set(true);

    try {
      const people = await this.personsSvc.getPeopleInHousehold(id, {
        limit: this.pageSize,
        offset,
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      const filtered = excludeId ? people.filter((p) => p.id !== excludeId) : people;

      if (replace) {
        this.peopleInHousehold.set(filtered);
      } else {
        this.peopleInHousehold.update((current) => [...current, ...filtered]);
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
