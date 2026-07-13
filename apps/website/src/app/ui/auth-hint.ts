import { afterNextRender, Injectable, signal } from '@angular/core';

const PRESENCE_COOKIE = 'pc_signed_in';

/**
 * Tells whether the visitor is already signed in to the CRM (app.pplcrm.com),
 * by reading the non-secret `pc_signed_in` presence cookie the backend sets on
 * the parent domain. Used by the header to show "Dashboard" instead of "Log in".
 *
 * Read happens in `afterNextRender` — the prerendered (SSG) markup is always the
 * signed-out nav, and the client updates it after hydration, so there's no
 * server/client mismatch and no `document` access during prerender.
 */
@Injectable({ providedIn: 'root' })
export class AuthHint {
  public readonly signedIn = signal(false);

  constructor() {
    afterNextRender(() => this.signedIn.set(this.hasPresenceCookie()));
  }

  private hasPresenceCookie(): boolean {
    return document.cookie.split('; ').some((c) => c.startsWith(`${PRESENCE_COOKIE}=`));
  }
}
