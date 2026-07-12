import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CompanionGate } from '../gate/companion-gate';

/** Canvass companion (spec §3) — the full walk-list app lands in Phase C. */
@Component({
  selector: 'pc-canvass-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompanionGate],
  template: `
    <pc-companion-gate kind="turf" [token]="token()">
      <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 class="text-lg font-semibold">Canvass companion</h1>
        <p class="text-base-content/70">Coming soon.</p>
      </div>
    </pc-companion-gate>
  `,
})
export class CanvassPage {
  /** Route param — the capability token from /t/:token. */
  public readonly token = input.required<string>();
}
