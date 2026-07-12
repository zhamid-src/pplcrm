import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { createLoadingGate } from '@uxcommon/loading-gate';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';
import type { PcStatusType } from '@uxcommon/components/status-badge/status-badge';
import { Table } from '@uxcommon/components/table/table';
import { Icon } from '@icons/icon';

import { DeliveriesRoutesService, type DeliveryRouteRow } from '../services/deliveries-routes-service';

const ROUTE_TONE: Record<string, PcStatusType> = {
  draft: 'neutral',
  assigned: 'info',
  in_progress: 'warning',
  completed: 'success',
  canceled: 'ghost',
};

/** Deliveries routes grid (spec §4.3 list). */
@Component({
  selector: 'pc-deliveries-routes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, Icon, DatePipe, Table],
  templateUrl: './deliveries-routes.html',
})
export class DeliveriesRoutes implements OnInit {
  private readonly svc = inject(DeliveriesRoutesService);
  private readonly alerts = inject(AlertService);
  protected readonly loading = createLoadingGate();

  protected readonly rows = signal<DeliveryRouteRow[]>([]);
  protected readonly loaded = signal(false);

  public ngOnInit(): void {
    void this.reload();
  }

  protected tone(status: string): PcStatusType {
    return ROUTE_TONE[status] ?? 'neutral';
  }

  protected label(status: string): string {
    return status === 'in_progress' ? 'in progress' : status;
  }

  protected stopsLabel(row: DeliveryRouteRow): string {
    if (row.stops_total === 0) return '0';
    if (row.stops_delivered > 0 || row.status === 'in_progress' || row.status === 'completed') {
      return `${row.stops_delivered} of ${row.stops_total} delivered`;
    }
    return String(row.stops_total);
  }

  private async reload(): Promise<void> {
    const end = this.loading.begin();
    try {
      const list = await this.svc.getAll();
      this.rows.set(list.rows);
      this.loaded.set(true);
    } catch (err) {
      this.alerts.showError(err instanceof Error ? err.message : 'Could not load routes');
    } finally {
      end();
    }
  }
}
