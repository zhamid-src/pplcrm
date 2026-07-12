import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { createLoadingGate } from '@uxcommon/loading-gate';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { BreadcrumbsService } from '@uxcommon/components/breadcrumbs/breadcrumbs.service';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';
import type { PcStatusType } from '@uxcommon/components/status-badge/status-badge';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { DELIVERY_SKIP_REASONS } from '@common';
import type { DeliverySkipReason } from '@common';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';

import { DeliveriesRoutesService, type DeliveryRouteDetail } from '../services/deliveries-routes-service';

const ROUTE_TONE: Record<string, PcStatusType> = {
  draft: 'neutral',
  assigned: 'info',
  in_progress: 'warning',
  completed: 'success',
  canceled: 'ghost',
};

/** Route detail (spec §4.3): header, actions, stops with reorder/actions, mandatory activity feed. */
@Component({
  selector: 'pc-deliveries-route-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, Icon, DatePipe, RecordActivities],
  templateUrl: './deliveries-route-detail.html',
})
export class DeliveriesRouteDetail {
  public readonly id = input.required<string>();

  private readonly svc = inject(DeliveriesRoutesService);
  private readonly alerts = inject(AlertService);
  private readonly breadcrumbs = inject(BreadcrumbsService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  protected readonly loading = createLoadingGate();

  protected readonly detail = signal<DeliveryRouteDetail | null>(null);
  protected readonly renaming = signal(false);
  protected readonly draftName = signal('');

  protected readonly deliveredCount = computed(
    () => this.detail()?.stops.filter((s) => s.status === 'delivered').length ?? 0,
  );
  protected readonly totalStops = computed(() => this.detail()?.stops.length ?? 0);
  protected readonly canDelete = computed(() => {
    const s = this.detail()?.status;
    return s === 'draft' || s === 'assigned';
  });

  constructor() {
    // Load only once the router has bound the required `id` input — reading it
    // synchronously in the constructor throws NG0950. Re-runs if the id changes.
    effect(() => {
      this.id();
      untracked(() => void this.load());
    });

    // Navbar trail with the route's real name once loaded (until then the route's
    // `data.breadcrumb` default — Deliveries / Routes — is showing).
    effect(() => {
      const d = this.detail();
      if (!d) return;
      this.breadcrumbs.setCrumbs([
        { label: 'Deliveries', route: '/deliveries' },
        { label: 'Routes', route: '/deliveries/routes' },
        { label: d.name },
      ]);
    });
  }

  protected tone(status: string): PcStatusType {
    return ROUTE_TONE[status] ?? 'neutral';
  }

  protected label(status: string): string {
    return status === 'in_progress' ? 'in progress' : status;
  }

  private async load(): Promise<void> {
    const end = this.loading.begin();
    try {
      const d = await this.svc.getById(this.id());
      this.detail.set(d);
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not load route');
    } finally {
      end();
    }
  }

  protected onDraftNameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected startRename(): void {
    this.draftName.set(this.detail()?.name ?? '');
    this.renaming.set(true);
  }

  protected async saveRename(): Promise<void> {
    const name = this.draftName().trim();
    if (!name) return;
    try {
      await this.svc.update(this.id(), { name });
      this.renaming.set(false);
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not rename route');
    }
  }

  protected async copyLink(regenerate = false): Promise<void> {
    try {
      const res = await this.svc.mintShareLink(this.id(), regenerate);
      if (res.status === 'exists') {
        this.alerts.showInfo('A live link already exists. Regenerate it to get a fresh copy.');
        return;
      }
      const url = `${window.location.origin}/r/${res.token}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      this.alerts.showSuccess('Link copied — valid 30 days');
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not create the link');
    }
  }

  protected async revokeLink(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Revoke volunteer link?',
      message: 'The current link stops working immediately.',
      variant: 'danger',
      confirmText: 'Revoke link',
    });
    if (!ok) return;
    try {
      await this.svc.revokeShareLink(this.id());
      this.alerts.showSuccess('Volunteer link revoked');
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not revoke the link');
    }
  }

  protected openInGoogleMaps(): void {
    const d = this.detail();
    if (!d) return;
    const located = d.stops.filter((s) => s.lat != null && s.lng != null);
    if (located.length === 0) {
      this.alerts.showError('No located stops to navigate to');
      return;
    }
    const origin = `${d.start_lat},${d.start_lng}`;
    const dest = located[located.length - 1];
    const destination = `${dest?.lat},${dest?.lng}`;
    const waypoints = located
      .slice(0, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');
    const params = new URLSearchParams({ api: '1', origin, destination });
    if (waypoints) params.set('waypoints', waypoints);
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener');
  }

  protected async cancelRoute(): Promise<void> {
    const undelivered = this.detail()?.stops.filter((s) => s.status === 'pending').length ?? 0;
    const ok = await this.confirm.confirm({
      title: 'Cancel this route?',
      message: `Its ${undelivered} undelivered stop${undelivered === 1 ? '' : 's'} return to the planning pool. Delivered stops keep their record.`,
      variant: 'danger',
      confirmText: 'Cancel route',
    });
    if (!ok) return;
    try {
      await this.svc.setStatus(this.id(), 'canceled');
      this.alerts.showSuccess('Route canceled');
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not cancel the route');
    }
  }

  protected async deleteRoute(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete this route?',
      message: 'This removes the route. Its stops return to the planning pool.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await this.svc.delete(this.id());
      this.alerts.showSuccess('Route deleted');
      await this.router.navigate(['/deliveries/routes']);
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not delete the route');
    }
  }

  protected async reorder(stopId: string, direction: 'up' | 'down'): Promise<void> {
    try {
      await this.svc.reorderStop(this.id(), stopId, direction);
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not reorder');
    }
  }

  protected async markDelivered(stopId: string): Promise<void> {
    await this.runStopAction(stopId, 'deliver');
  }

  protected async removeStop(stopId: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remove this stop?',
      message: 'The request returns to the planning pool.',
      variant: 'danger',
      confirmText: 'Remove stop',
    });
    if (!ok) return;
    await this.runStopAction(stopId, 'remove');
  }

  protected async couldntDeliver(stopId: string): Promise<void> {
    const reason = await this.confirm.choose<DeliverySkipReason>({
      title: "Couldn't deliver — pick a reason",
      choices: DELIVERY_SKIP_REASONS.map((r) => ({ label: r, value: r })),
    });
    if (!reason) return;
    await this.runStopAction(stopId, 'skip', reason);
  }

  private async runStopAction(
    stopId: string,
    action: 'deliver' | 'skip' | 'remove',
    reason?: DeliverySkipReason,
  ): Promise<void> {
    try {
      await this.svc.stopAction(this.id(), stopId, action, reason ?? null);
      await this.load();
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not update the stop');
    }
  }

  protected stopTone(status: string): PcStatusType {
    if (status === 'delivered') return 'success';
    if (status === 'skipped') return 'warning';
    return 'neutral';
  }
}
