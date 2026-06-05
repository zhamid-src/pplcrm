import { Component, inject, signal, OnInit, computed } from '@angular/core';
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
  protected readonly isRefreshing = signal(false);

  // KPIs
  protected readonly totalAssignedCount = signal(0);
  protected readonly unassignedOpenCount = signal(0);
  protected readonly totalOpenCount = signal(0);
  protected readonly avgFirstResponse = signal('—');
  protected readonly avgTimeToClose = signal('—');
  protected readonly activeContactsCount = signal(0);
  protected readonly resolutionRate = signal(0);

  // SLA Signals
  protected readonly unassignedEmailSlaBreaches = signal(0);
  protected readonly unassignedTaskSlaBreaches = signal(0);
  protected readonly totalEmailSlaBreaches = signal(0);
  protected readonly totalTaskSlaBreaches = signal(0);

  // SVG Chart data
  protected readonly linePath = signal('');
  protected readonly areaPath = signal('');
  protected readonly linePoints = signal<any[]>([]);
  protected readonly yAxisLabels = signal<{ y: number; value: number }[]>([]);
  protected readonly xAxisLabels = signal<{ x: number; label: string }[]>([]);
  protected readonly closedRepBars = signal<any[]>([]);
  private readonly rawEmailsAssigned = signal<any[]>([]);
  private readonly rawUnassignedCount = signal<number>(0);
  protected readonly showAllOpen = signal<boolean>(true);

  protected readonly donutTotalCount = computed(() => {
    return this.showAllOpen() ? this.totalOpenCount() : this.totalAssignedCount();
  });

  protected readonly assignedRepSlices = computed(() => {
    const assigned = this.rawEmailsAssigned();
    const unassignedCount = this.rawUnassignedCount();
    const showAll = this.showAllOpen();

    const slicesData: { name: string; count: number; isUnassigned: boolean }[] = [
      ...assigned.map((a: any) => ({
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
        count: Number(a.count || 0),
        isUnassigned: false,
      })),
    ];

    if (showAll && unassignedCount > 0) {
      slicesData.push({
        name: 'Unassigned',
        count: unassignedCount,
        isUnassigned: true,
      });
    }

    const total = slicesData.reduce((acc, cur) => acc + cur.count, 0);

    const radius = 60;
    const circ = 2 * Math.PI * radius;
    let cumulativeCount = 0;
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];
    const unassignedColor = '#64748b'; // Slate gray for Unassigned

    return slicesData.map((s: any, i: number) => {
      const countVal = s.count;
      const pct = total > 0 ? countVal / total : 0;
      const sliceCirc = pct * circ;
      const strokeDash = `${sliceCirc} ${circ}`;
      const strokeOffset = -(cumulativeCount / total) * circ;
      cumulativeCount += countVal;
      return {
        name: s.name,
        count: countVal,
        percentage: Math.round(pct * 100),
        strokeDash,
        strokeOffset,
        color: s.isUnassigned ? unassignedColor : colors[i % colors.length],
      };
    });
  });

  protected readonly userStats = signal<any[]>([]);
  protected readonly hoveredPoint = signal<any | null>(null);
  protected readonly hoveredSlice = signal<any | null>(null);

  public ngOnInit() {
    void this.loadStats();
  }

  protected async loadStats() {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    const start = Date.now();
    const end = this._loading.begin();
    try {
      const stats = await this.dashboardSvc.getStats();

      // Set KPIs
      const totalAssigned = (stats.emailsAssigned || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.count || 0),
        0,
      );
      this.totalAssignedCount.set(totalAssigned);
      this.unassignedOpenCount.set(stats.unassignedCount || 0);
      this.totalOpenCount.set(stats.totalOpenCount || 0);

      const respHours = stats.avgFirstResponseHours;
      this.avgFirstResponse.set(respHours > 0 ? this.formatHours(respHours) : '—');

      const closeHours = stats.avgTimeToCloseHours;
      this.avgTimeToClose.set(closeHours > 0 ? this.formatHours(closeHours) : '—');

      const totalNewContacts = (stats.contactsGrowth || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.count || 0),
        0,
      );
      this.activeContactsCount.set(totalNewContacts);

      const totalClosed = (stats.emailsClosed || []).reduce((acc: number, cur: any) => acc + Number(cur.count || 0), 0);
      const totalEmails = totalAssigned + totalClosed;
      const rate = totalEmails > 0 ? (totalClosed / totalEmails) * 100 : 0;
      this.resolutionRate.set(Math.round(rate));

      // Set SLA breaches
      const unassignedEmails = stats.unassignedEmailSlaBreaches || 0;
      const unassignedTasks = stats.unassignedTaskSlaBreaches || 0;
      this.unassignedEmailSlaBreaches.set(unassignedEmails);
      this.unassignedTaskSlaBreaches.set(unassignedTasks);

      const assignedEmailSla = (stats.userStats || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.emailSlaBreaches || 0),
        0,
      );
      const assignedTaskSla = (stats.userStats || []).reduce(
        (acc: number, cur: any) => acc + Number(cur.taskSlaBreaches || 0),
        0,
      );

      this.totalEmailSlaBreaches.set(unassignedEmails + assignedEmailSla);
      this.totalTaskSlaBreaches.set(unassignedTasks + assignedTaskSla);

      // Map representative stats
      const formattedUserStats = (stats.userStats || []).map((u: any) => ({
        ...u,
        avgFirstResponse: u.avgFirstResponseHours > 0 ? this.formatHours(u.avgFirstResponseHours) : '—',
        avgTimeToClose: u.avgTimeToCloseHours > 0 ? this.formatHours(u.avgTimeToCloseHours) : '—',
        emailSlaBreaches: u.emailSlaBreaches || 0,
        taskSlaBreaches: u.taskSlaBreaches || 0,
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

      // Calculate Y axis labels
      const yLabels = [
        { y: 20, value: maxCount },
        { y: 60, value: Math.round(maxCount * 0.75) },
        { y: 100, value: Math.round(maxCount * 0.5) },
        { y: 140, value: Math.round(maxCount * 0.25) },
        { y: 180, value: 0 },
      ];
      this.yAxisLabels.set(yLabels);

      // Calculate X axis labels (approx. 5 labels across the timeline)
      const xLabels: { x: number; label: string }[] = [];
      if (points.length > 0) {
        const indices = [
          0,
          Math.floor(points.length * 0.25),
          Math.floor(points.length * 0.5),
          Math.floor(points.length * 0.75),
          points.length - 1,
        ];
        const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b);
        for (const idx of uniqueIndices) {
          const pt = points[idx];
          let dateStr = pt.date;
          try {
            const dateObj = new Date(pt.date);
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
          } catch (e) {}
          xLabels.push({ x: pt.x, label: dateStr });
        }
      }
      this.xAxisLabels.set(xLabels);

      // Bar Chart: Closed Emails by Rep
      const closed = stats.emailsClosed || [];
      const maxClosed = Math.max(...closed.map((c: any) => c.count), 1);
      const barMaxWidth = 360;
      this.closedRepBars.set(
        closed.map((c: any, i: number) => ({
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          count: c.count,
          width: (c.count / maxClosed) * barMaxWidth,
          y: i * 40 + 10,
        })),
      );

      // Set raw data for Donut Chart (assignedRepSlices will compute reactively)
      this.rawEmailsAssigned.set(stats.emailsAssigned || []);
      this.rawUnassignedCount.set(stats.unassignedCount || 0);
    } catch (err: any) {
      this.alertSvc.showError('Failed to load dashboard metrics');
    } finally {
      end();
      const elapsed = Date.now() - start;
      const minSpin = 1000; // spin at least once (1 second minimum)
      if (elapsed < minSpin) {
        await new Promise((resolve) => setTimeout(resolve, minSpin - elapsed));
      }
      this.isRefreshing.set(false);
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

  protected formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    } catch (e) {
      return dateStr;
    }
  }
}
