import { Component } from '@angular/core';
import { PcTabOption, TabBar } from '@uxcommon/components/tabs/tabs';

/**
 * Surface switcher for the two halves of Deliveries (spec §14): the requests pool
 * (`/deliveries`) and the planned routes (`/deliveries/routes`). Rendered in the header of
 * both list pages so each is always one click from the other — otherwise the routes list is
 * only reachable by opening a single route from the Route column. Uses the house pill tab
 * bar (design §4: the one tab idiom) with route-linked pills, so the pair reads as tabs
 * rather than action buttons; the active state is driven purely by the router (no JS state).
 */
@Component({
  selector: 'pc-deliveries-nav',
  imports: [TabBar],
  template: `<pc-tab-bar [tabs]="tabs" aria-label="Deliveries views" />`,
})
export class DeliveriesNav {
  protected readonly tabs: PcTabOption[] = [
    { id: 'requests', label: 'Requests', route: '/deliveries', exact: true },
    { id: 'routes', label: 'Routes', route: '/deliveries/routes' },
  ];
}
