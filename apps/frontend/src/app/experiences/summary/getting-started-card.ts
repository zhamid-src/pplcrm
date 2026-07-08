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
      <div class="animate-drop card border border-line bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-5">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
              Getting started · {{ doneCount() }} of {{ total() }} done
            </div>
            <button
              type="button"
              class="text-xs font-medium text-base-content/50 underline underline-offset-2 hover:text-base-content"
              (click)="dismiss()"
              i18n="@@gettingStarted.dismiss.label"
            >
              Dismiss
            </button>
          </div>

          <ul class="flex flex-col gap-2.5">
            @for (step of steps(); track step.id) {
              <li class="flex items-center gap-2.5">
                @if (step.done) {
                  <pc-icon name="check-circle" [size]="5" class="shrink-0 text-success"></pc-icon>
                  <span class="text-sm text-base-content/70"
                    >{{ step.label }}
                    @if (step.evidence) {
                      — {{ step.evidence }}
                    }
                  </span>
                } @else if (step.id === nextStep()?.id) {
                  <pc-icon name="chevron-right" [size]="5" class="shrink-0 text-primary"></pc-icon>
                  <a [routerLink]="step.route" class="text-sm font-semibold text-primary hover:underline">{{
                    step.label
                  }}</a>
                } @else {
                  <span class="ml-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-base-300"></span>
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
