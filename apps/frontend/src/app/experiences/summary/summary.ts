import { Component, inject, signal, OnInit } from '@angular/core';
import { DashboardService } from './services/dashboard.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  imports: [Icon],
  selector: 'pc-summary',
  templateUrl: './summary.html',
})
export class Summary implements OnInit {
  private readonly dashboardSvc = inject(DashboardService);
  private readonly alertSvc = inject(AlertService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;

  // KPIs
  protected readonly totalAssignedCount = signal(0);
  protected readonly unassignedOpenCount = signal(0);
  protected readonly totalOpenCount = signal(0);
  protected readonly avgFirstResponse = signal('—');
  protected readonly avgTimeToClose = signal('—');
  protected readonly activeContactsCount = signal(0);
  protected readonly resolutionRate = signal(0);

  // SVG Chart data
  protected readonly linePath = signal('');
  protected readonly areaPath = signal('');
  protected readonly linePoints = signal<any[]>([]);
  protected readonly closedRepBars = signal<any[]>([]);
  protected readonly assignedRepSlices = signal<any[]>([]);
  protected readonly userStats = signal<any[]>([]);

  public ngOnInit() {
    this.loadStats();
  }

  protected async loadStats() {
    const end = this._loading.begin();
    try {
      const stats = await this.dashboardSvc.getStats();

      // Set KPIs
      const totalAssigned = (stats.emailsAssigned || []).reduce((acc: number, cur: any) => acc + Number(cur.count || 0), 0);
      this.totalAssignedCount.set(totalAssigned);
      this.unassignedOpenCount.set(stats.unassignedCount || 0);
      this.totalOpenCount.set(stats.totalOpenCount || 0);

      const respHours = stats.avgFirstResponseHours;
      this.avgFirstResponse.set(respHours > 0 ? this.formatHours(respHours) : '—');

      const closeHours = stats.avgTimeToCloseHours;
      this.avgTimeToClose.set(closeHours > 0 ? this.formatHours(closeHours) : '—');

      const totalNewContacts = (stats.contactsGrowth || []).reduce((acc: number, cur: any) => acc + Number(cur.count || 0), 0);
      this.activeContactsCount.set(totalNewContacts);

      const totalClosed = (stats.emailsClosed || []).reduce((acc: number, cur: any) => acc + Number(cur.count || 0), 0);
      const totalEmails = totalAssigned + totalClosed;
      const rate = totalEmails > 0 ? (totalClosed / totalEmails) * 100 : 0;
      this.resolutionRate.set(Math.round(rate));

      // Map representative stats
      const formattedUserStats = (stats.userStats || []).map((u: any) => ({
        ...u,
        avgFirstResponse: u.avgFirstResponseHours > 0 ? this.formatHours(u.avgFirstResponseHours) : '—',
        avgTimeToClose: u.avgTimeToCloseHours > 0 ? this.formatHours(u.avgTimeToCloseHours) : '—',
      }));
      this.userStats.set(formattedUserStats);

      // Line Chart: Contacts Growth (last 30 days)
      const growth = stats.contactsGrowth || [];
      const maxCount = Math.max(...growth.map((g: any) => g.count), 1);
      const width = 600;
      const height = 200;
      const padding = 20;

      const points = growth.map((g: any, i: number) => {
        const x = padding + (i / Math.max(growth.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - (g.count / maxCount) * (height - padding * 2);
        return { x, y, date: g.date, count: g.count };
      });
      this.linePoints.set(points);

      if (points.length > 0) {
        const lPath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        this.linePath.set(lPath);
        const firstX = points[0].x;
        const lastX = points[points.length - 1].x;
        this.areaPath.set(`${lPath} L ${lastX} ${height - padding} L ${firstX} ${height - padding} Z`);
      } else {
        this.linePath.set('');
        this.areaPath.set('');
      }

      // Bar Chart: Closed Emails by Rep
      const closed = stats.emailsClosed || [];
      const maxClosed = Math.max(...closed.map((c: any) => c.count), 1);
      const barMaxWidth = 360;
      this.closedRepBars.set(closed.map((c: any, i: number) => ({
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        count: c.count,
        width: (c.count / maxClosed) * barMaxWidth,
        y: i * 40 + 10,
      })));

      // Donut Chart: Assigned Emails by Rep
      const assigned = stats.emailsAssigned || [];
      const radius = 60;
      const circ = 2 * Math.PI * radius;
      let cumulativeCount = 0;
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

      this.assignedRepSlices.set(assigned.map((a: any, i: number) => {
        const countVal = Number(a.count || 0);
        const pct = totalAssigned > 0 ? (countVal / totalAssigned) : 0;
        const sliceCirc = pct * circ;
        const strokeDash = `${sliceCirc} ${circ}`;
        const strokeOffset = circ - (cumulativeCount / totalAssigned) * circ;
        cumulativeCount += countVal;
        return {
          name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          count: countVal,
          percentage: Math.round(pct * 100),
          strokeDash,
          strokeOffset,
          color: colors[i % colors.length],
        };
      }));

    } catch (err: any) {
      this.alertSvc.showError('Failed to load dashboard metrics');
    } finally {
      end();
    }
  }

  private formatHours(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days}d ${remainingHours}h`;
    }
    return `${hours.toFixed(1)}h`;
  }
}
