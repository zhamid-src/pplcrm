import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CanvassStore } from './canvass-store';
import { firstNameOf } from './canvass-ui';

/**
 * Landing view (spec §3.3): who am I walking as, what am I assigned, and one
 * primary action. The escape hatch below the fold covers the forwarded-link
 * case the access layer can't ("this is Sam's link, not mine").
 */
@Component({
  selector: 'pc-canvass-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.payload(); as payload) {
      <div class="flex flex-1 flex-col justify-center gap-6 p-6">
        <header class="flex flex-col gap-2 text-center">
          <p class="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-base-content/50">
            {{ payload.campaign_name }} · {{ payload.turf_name }}
          </p>
          <h1 class="text-2xl font-bold">You're assigned {{ payload.turf_name }}</h1>
          <p class="text-base-content/70">
            {{ store.stats().doors_total }} {{ store.stats().doors_total === 1 ? 'door' : 'doors' }} ·
            {{ peopleCount() }} {{ peopleCount() === 1 ? 'person' : 'people' }}
          </p>
        </header>

        <div class="rounded-lg border border-base-300 bg-base-200/50 p-4 text-center">
          <p class="font-medium">Walking as {{ payload.canvasser_name }}</p>
          <p class="mt-1 text-xs text-base-content/70">Results save under your name and sync to PeopleCRM.</p>
        </div>

        <button type="button" class="btn btn-primary w-full" (click)="start()">Start walking</button>

        <p class="text-center text-xs text-base-content/60">
          Not {{ firstName() }}? Ask your organizer to send you your own link.
        </p>
      </div>
    }
  `,
})
export class CanvassLanding {
  protected readonly store = inject(CanvassStore);

  protected readonly peopleCount = computed(() => this.store.households().reduce((sum, h) => sum + h.people.length, 0));

  protected firstName(): string {
    return firstNameOf(this.store.payload()?.canvasser_name ?? '');
  }

  protected start(): void {
    this.store.view.set({ kind: 'list' });
  }
}
