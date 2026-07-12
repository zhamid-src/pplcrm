import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CompanionGate } from '../gate/companion-gate';

/** Deliveries companion (spec §4) — the CRM's public route page moves here in Phase D. */
@Component({
  selector: 'pc-route-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompanionGate],
  template: `
    <pc-companion-gate kind="route" [token]="token()">
      <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 class="text-lg font-semibold">Delivery route</h1>
        <p class="text-base-content/70">Coming soon.</p>
      </div>
    </pc-companion-gate>
  `,
})
export class RoutePage {
  /** Route param — the capability token from /r/:token. */
  public readonly token = input.required<string>();
}
