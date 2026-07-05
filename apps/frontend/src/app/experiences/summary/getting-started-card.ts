import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { GettingStartedService } from './services/getting-started.service';

/**
 * First-run checklist card on the dashboard: "GETTING STARTED · N of 3 done". Completed steps
 * show a success check with their evidence; the next incomplete step is a primary link. Auto-
 * hides once all steps are done; dismissible before then (§3). All state is real (see the
 * service) — nothing is faked.
 */
@Component({
  selector: 'pc-getting-started-card',
  imports: [Icon, RouterLink],
  template: `
    @if (visible()) {
      <div class="animate-drop card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
                Getting started · {{ doneCount() }} of {{ total() }} done
              </div>
              <h2 class="mt-1 text-lg font-bold text-base-content">Finish setting up your workspace</h2>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle"
              (click)="dismiss()"
              aria-label="Dismiss getting started"
              i18n-aria-label="@@gettingStarted.dismiss.ariaLabel"
            >
              <pc-icon name="x-mark" [size]="4"></pc-icon>
            </button>
          </div>

          <ul class="flex flex-col gap-2.5">
            @for (step of steps(); track step.id) {
              <li class="flex items-center gap-3">
                @if (step.done) {
                  <pc-icon name="check-circle" [size]="5" class="shrink-0 text-success"></pc-icon>
                  <span class="text-sm text-base-content/70">{{ step.label }}</span>
                  @if (step.evidence) {
                    <span class="ml-auto text-xs font-medium text-success">{{ step.evidence }}</span>
                  }
                } @else if (step.id === nextStep()?.id) {
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary">
                    <span class="h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  <span class="text-sm font-medium text-base-content">{{ step.label }}</span>
                  <a [routerLink]="step.route" class="btn btn-primary btn-sm ml-auto">{{ step.cta }}</a>
                } @else {
                  <span class="h-5 w-5 shrink-0 rounded-full border-2 border-base-300"></span>
                  <span class="text-sm text-base-content/50">{{ step.label }}</span>
                }
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class GettingStartedCard {
  private readonly svc = inject(GettingStartedService);
  private readonly alerts = inject(AlertService);

  protected readonly visible = this.svc.visible;
  protected readonly steps = this.svc.steps;
  protected readonly doneCount = this.svc.doneCount;
  protected readonly total = this.svc.total;
  protected readonly nextStep = this.svc.nextStep;

  constructor() {
    void this.svc.refresh();
  }

  protected dismiss(): void {
    this.svc.dismiss();
    this.alerts.showInfo('Getting started hidden. It won’t appear again.');
  }
}
