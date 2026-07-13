import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Surface switcher for the two halves of Deliveries (spec §14): the requests pool
 * (`/deliveries`) and the planned routes (`/deliveries/routes`). Rendered in the header of
 * both list pages so each is always one click from the other — otherwise the routes list is
 * only reachable by opening a single route from the Route column. A compact DaisyUI `join`
 * segmented control; the active segment is driven purely by `routerLinkActive` (no JS state).
 */
@Component({
  selector: 'pc-deliveries-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="join" role="tablist" aria-label="Deliveries views">
      <a
        routerLink="/deliveries"
        routerLinkActive
        #requestsActive="routerLinkActive"
        [routerLinkActiveOptions]="{ exact: true }"
        role="tab"
        [attr.aria-selected]="requestsActive.isActive"
        class="btn btn-sm join-item"
        [class.btn-primary]="requestsActive.isActive"
        [class.btn-ghost]="!requestsActive.isActive"
      >
        Requests
      </a>
      <a
        routerLink="/deliveries/routes"
        routerLinkActive
        #routesActive="routerLinkActive"
        role="tab"
        [attr.aria-selected]="routesActive.isActive"
        class="btn btn-sm join-item"
        [class.btn-primary]="routesActive.isActive"
        [class.btn-ghost]="!routesActive.isActive"
      >
        Routes
      </a>
    </div>
  `,
})
export class DeliveriesNav {}
