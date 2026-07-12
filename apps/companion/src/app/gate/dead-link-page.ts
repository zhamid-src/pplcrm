import { Component, input } from '@angular/core';

/**
 * Friendly dead-link page (spec §5): shown for unknown URLs and for tokens
 * that are expired or revoked. Never a bare 401 — a volunteer standing on a
 * porch gets told what to do next, not an error code.
 */
@Component({
  selector: 'pc-dead-link-page',
  template: `
    <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 class="text-lg font-semibold">This link isn't active</h1>
      @if (organizerName()) {
        <p class="text-base-content/70">
          It may have expired or been replaced. Contact {{ organizerName() }} to get a new link.
        </p>
      } @else {
        <p class="text-base-content/70">It may have expired or been replaced. Ask your organizer to send a new one.</p>
      }
    </div>
  `,
})
export class DeadLinkPage {
  public readonly organizerName = input<string | null>(null);
}
