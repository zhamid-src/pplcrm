import { Component, inject, signal, OnInit, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from './services/dashboard.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { SpinOnClickDirective } from '@uxcommon/directives/spin-on-click.directive';
import { SlaDetails } from './sla-details';
import { GettingStartedCard } from './getting-started-card';
import { DemoModeCard } from './demo-mode-card';
import { AuthService } from '../../auth/auth-service';
import { EmptyState } from '@uxcommon/components/empty-state/empty-state';

interface UpcomingEvent {
  id: string;
  name: string;
  start_time: string;
  capacity: number | null;
  location_address: string | null;
}

interface DraftNewsletter {
  id: string;
  name: string;
  total_recipients: number;
}

@Component({
  imports: [EmptyState, Icon, SpinOnClickDirective, SlaDetails, GettingStartedCard, DemoModeCard, RouterLink],
  selector: 'pc-summary',
  templateUrl: './summary.html',
})
export class Summary implements OnInit {
  private readonly dashboardSvc = inject(DashboardService);
  private readonly alertSvc = inject(AlertService);
  private readonly auth = inject(AuthService);

  constructor() {
    effect(() => {
      const tab = this.defaultSlaTab();
      const open = this.showSlaDetails();
      if (open) {
        if (tab === 'emails') {
          if (this.breachedEmails().length === 0) {
            this.emailPage.set(1);
            void this.loadMoreEmails();
          }
        } else {
          if (this.breachedTasks().length === 0) {
            this.taskPage.set(1);
            void this.loadMoreTasks();
          }
        }
      }
    });
  }

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly isRefreshing = signal(false);

  // Greeting + date line (§1 "where am I": name the person and the day)
  private readonly currentUser = this.auth.getUserSignal();
  protected readonly todayLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  );
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = this.currentUser()?.first_name?.trim();
    return name ? `Good ${part}, ${name}` : `Good ${part}`;
  });

  // KPIs
  protected readonly totalAssignedCount = signal(0);
  protected readonly unassignedOpenCount = signal(0);
  protected readonly totalOpenCount = signal(0);
  protected readonly avgFirstResponse = signal('—');
  protected readonly avgTimeToClose = signal('—');
  protected readonly activeContactsCount = signal(0);
  protected readonly resolutionRate = signal(0);

  // Next-action context (real data from the backend; null when nothing applies)
  protected readonly oldestUnassignedAgeHours = signal<number | null>(null);
  protected readonly firstResponseDueHours = signal<number | null>(null);
  protected readonly draftNewsletter = signal<DraftNewsletter | null>(null);
  protected readonly upcomingEvents = signal<UpcomingEvent[]>([]);

  // SLA Signals
  protected readonly unassignedEmailSlaBreaches = signal(0);
  protected readonly unassignedTaskSlaBreaches = signal(0);
  protected readonly totalEmailSlaBreaches = signal(0);
  protected readonly totalTaskSlaBreaches = signal(0);

  protected readonly breachedEmails = signal<unknown[]>([]);
  protected readonly breachedTasks = signal<unknown[]>([]);
  protected readonly emailPage = signal(1);
  protected readonly taskPage = signal(1);
  protected readonly hasMoreEmails = signal(false);
  protected readonly hasMoreTasks = signal(false);
  protected readonly isLoadingEmails = signal(false);
  protected readonly isLoadingTasks = signal(false);

  protected readonly emailSlaHours = signal(24);
  protected readonly taskSlaHours = signal(24);
  protected readonly emailSlaWarningThreshold = signal(1);
  protected readonly emailSlaCriticalThreshold = signal(4);
  protected readonly taskSlaWarningThreshold = signal(1);
  protected readonly taskSlaCriticalThreshold = signal(4);
  protected readonly showSlaDetails = signal(false);
  protected readonly defaultSlaTab = signal<'emails' | 'tasks'>('emails');

  protected readonly emailSlaStatus = computed(() => {
    const breaches = this.totalEmailSlaBreaches();
    const warning = this.emailSlaWarningThreshold();
    const critical = this.emailSlaCriticalThreshold();
    if (breaches === 0) return 'healthy';
    if (breaches >= critical) return 'critical';
    if (breaches >= warning) return 'warning';
    return 'healthy';
  });

  /** One-word email-health phrase for the briefing paragraph. */
  protected readonly emailHealthWord = computed(() => {
    switch (this.emailSlaStatus()) {
      case 'critical':
        return 'breaching SLA';
      case 'warning':
        return 'under pressure';
      default:
        return 'healthy';
    }
  });

  // SVG line chart data (contacts growth)
  protected readonly linePath = signal('');
  protected readonly areaPath = signal('');
  protected readonly linePoints = signal<Array<{ x: number; y: number; date: string; count: number }>>([]);
  /** True only on the very first load (no data yet) — drives stat-tile skeletons over a spinner. */
  protected readonly isInitialLoading = computed(() => this.isLoading() && this.linePoints().length === 0);
  protected readonly yAxisLabels = signal<{ y: number; value: number }[]>([]);
  protected readonly xAxisLabels = signal<{ x: number; label: string }[]>([]);

  protected readonly userStats = signal<
    Array<{
      user_id: string;
      first_name: string;
      last_name: string;
      openCount: number;
      closedCount: number;
      resolutionRate: number;
      avgFirstResponse: string;
      avgTimeToClose: string;
      emailSlaBreaches: number;
      taskSlaBreaches: number;
    }>
  >([]);
  protected readonly hoveredPoint = signal<{ x: number; y: number; date: string; count: number } | null>(null);

  public ngOnInit() {
    void this.loadStats();
  }

  protected async loadStats(announce = false) {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    const start = Date.now();
    const end = this._loading.begin();
    try {
      const stats = await this.dashboardSvc.getStats();

      // Set KPIs
      const totalAssigned = (stats.emailsAssigned || []).reduce(
        (acc: number, cur: { count?: number }) => acc + Number(cur.count || 0),
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
        (acc: number, cur: { count?: number }) => acc + Number(cur.count || 0),
        0,
      );
      this.activeContactsCount.set(totalNewContacts);

      const totalClosed = (stats.emailsClosed || []).reduce(
        (acc: number, cur: { count?: number }) => acc + Number(cur.count || 0),
        0,
      );
      const totalEmails = totalAssigned + totalClosed;
      const rate = totalEmails > 0 ? (totalClosed / totalEmails) * 100 : 0;
      this.resolutionRate.set(Math.round(rate));

      // Next-action context
      this.oldestUnassignedAgeHours.set(stats.oldestUnassignedAgeHours ?? null);
      this.firstResponseDueHours.set(stats.firstResponseDueHours ?? null);
      this.draftNewsletter.set(stats.draftNewsletter ?? null);
      this.upcomingEvents.set(stats.upcomingEvents ?? []);

      // Set SLA breaches
      const unassignedEmails = stats.unassignedEmailSlaBreaches || 0;
      const unassignedTasks = stats.unassignedTaskSlaBreaches || 0;
      this.unassignedEmailSlaBreaches.set(unassignedEmails);
      this.unassignedTaskSlaBreaches.set(unassignedTasks);

      const assignedEmailSla = (stats.userStats || []).reduce(
        (acc: number, cur: { emailSlaBreaches?: number }) => acc + Number(cur.emailSlaBreaches || 0),
        0,
      );
      const assignedTaskSla = (stats.userStats || []).reduce(
        (acc: number, cur: { taskSlaBreaches?: number }) => acc + Number(cur.taskSlaBreaches || 0),
        0,
      );

      this.totalEmailSlaBreaches.set(unassignedEmails + assignedEmailSla);
      this.totalTaskSlaBreaches.set(unassignedTasks + assignedTaskSla);

      // Reset breached lists (loaded on demand when the drill-down opens)
      if (this.showSlaDetails()) {
        if (this.defaultSlaTab() === 'emails') {
          this.breachedEmails.set([]);
          this.emailPage.set(1);
        } else {
          this.breachedTasks.set([]);
          this.taskPage.set(1);
        }
      } else {
        this.breachedEmails.set([]);
        this.emailPage.set(1);
        this.hasMoreEmails.set(false);

        this.breachedTasks.set([]);
        this.taskPage.set(1);
        this.hasMoreTasks.set(false);
      }

      this.emailSlaHours.set(stats.emailSlaHours ?? 24);
      this.taskSlaHours.set(stats.taskSlaHours ?? 24);
      this.emailSlaWarningThreshold.set(stats.emailSlaWarningThreshold ?? 1);
      this.emailSlaCriticalThreshold.set(stats.emailSlaCriticalThreshold ?? 4);
      this.taskSlaWarningThreshold.set(stats.taskSlaWarningThreshold ?? 1);
      this.taskSlaCriticalThreshold.set(stats.taskSlaCriticalThreshold ?? 4);

      // Representative stats table
      const formattedUserStats = (stats.userStats || []).map(
        (u: {
          user_id: string;
          first_name: string;
          last_name: string;
          openCount: number;
          closedCount: number;
          resolutionRate: number;
          avgFirstResponseHours: number;
          avgTimeToCloseHours: number;
          emailSlaBreaches?: number;
          taskSlaBreaches?: number;
        }) => ({
          user_id: u.user_id,
          first_name: u.first_name,
          last_name: u.last_name,
          openCount: u.openCount,
          closedCount: u.closedCount,
          resolutionRate: u.resolutionRate,
          avgFirstResponse: u.avgFirstResponseHours > 0 ? this.formatHours(u.avgFirstResponseHours) : '—',
          avgTimeToClose: u.avgTimeToCloseHours > 0 ? this.formatHours(u.avgTimeToCloseHours) : '—',
          emailSlaBreaches: u.emailSlaBreaches || 0,
          taskSlaBreaches: u.taskSlaBreaches || 0,
        }),
      );
      this.userStats.set(formattedUserStats);

      // Line chart: contacts growth (last 30 days)
      const growth = stats.contactsGrowth || [];
      const maxCount = Math.max(...growth.map((g: { count: number }) => g.count), 1);
      const width = 600;
      const height = 200;
      const padding = 20;

      const points: Array<{ x: number; y: number; date: string; count: number }> = growth.map(
        (g: { date: string; count: number }, i: number) => {
          const x = padding + (i / Math.max(growth.length - 1, 1)) * (width - padding * 2);
          const y = height - padding - (g.count / maxCount) * (height - padding * 2);
          return { x, y, date: g.date, count: g.count };
        },
      );
      this.linePoints.set(points);

      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      if (firstPoint && lastPoint) {
        const lPath = points.map((p, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        this.linePath.set(lPath);
        this.areaPath.set(`${lPath} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`);
      } else {
        this.linePath.set('');
        this.areaPath.set('');
      }

      const yLabels = [
        { y: 20, value: maxCount },
        { y: 60, value: Math.round(maxCount * 0.75) },
        { y: 100, value: Math.round(maxCount * 0.5) },
        { y: 140, value: Math.round(maxCount * 0.25) },
        { y: 180, value: 0 },
      ];
      this.yAxisLabels.set(yLabels);

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
          if (!pt) continue;
          let dateStr = pt.date;
          try {
            const dateObj = new Date(pt.date);
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
          } catch {
            /* keep raw date string on parse failure */
          }
          xLabels.push({ x: pt.x, label: dateStr });
        }
      }
      this.xAxisLabels.set(xLabels);

      if (announce) {
        this.alertSvc.showSuccess('Stats reloaded — all figures current as of now');
      }
    } catch {
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

  /** Short "2h" / "3d" relative label for the next-action cards. */
  protected roundedHours(hours: number | null): string {
    if (hours == null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours >= 24) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours)}h`;
  }

  protected formatEventTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  protected formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    } catch {
      return dateStr;
    }
  }

  protected toggleSlaDetails(tab: 'emails' | 'tasks') {
    if (this.showSlaDetails() && this.defaultSlaTab() === tab) {
      this.showSlaDetails.set(false);
    } else {
      this.defaultSlaTab.set(tab);
      this.showSlaDetails.set(true);
    }
  }

  protected async loadMoreEmails() {
    if (this.isLoadingEmails()) return;
    this.isLoadingEmails.set(true);
    try {
      const res = await this.dashboardSvc.getBreachedEmails(this.emailPage(), 10);
      if (this.emailPage() === 1) {
        this.breachedEmails.set(res.items);
      } else {
        this.breachedEmails.update((prev) => [...prev, ...res.items]);
      }
      this.hasMoreEmails.set(res.hasMore);
      this.emailPage.update((p) => p + 1);
    } catch {
      this.alertSvc.showError('Failed to load breached emails');
    } finally {
      this.isLoadingEmails.set(false);
    }
  }

  protected async loadMoreTasks() {
    if (this.isLoadingTasks()) return;
    this.isLoadingTasks.set(true);
    try {
      const res = await this.dashboardSvc.getBreachedTasks(this.taskPage(), 10);
      if (this.taskPage() === 1) {
        this.breachedTasks.set(res.items);
      } else {
        this.breachedTasks.update((prev) => [...prev, ...res.items]);
      }
      this.hasMoreTasks.set(res.hasMore);
      this.taskPage.update((p) => p + 1);
    } catch {
      this.alertSvc.showError('Failed to load breached tasks');
    } finally {
      this.isLoadingTasks.set(false);
    }
  }
}
