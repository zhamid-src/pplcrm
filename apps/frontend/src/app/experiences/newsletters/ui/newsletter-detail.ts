import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { MarketingEmailTopLinkType, MarketingEmailType } from '../../../../../../../libs/common/src';
import { Icon } from '@icons/icon';

import { NewslettersService } from '../services/newsletters-service';

interface DetailMetric {
  help?: string;
  label: string;
  value: string;
}

@Component({
  selector: 'pc-newsletter-detail',
  imports: [Icon],
  templateUrl: './newsletter-detail.html',
})
export class NewsletterDetailComponent {
  readonly id = input.required<string>();

  private readonly service = inject(NewslettersService);

  protected readonly email = signal<MarketingEmailType | null>(null);
  protected readonly stats = signal<{
    activities: Array<{
      email: string;
      event_type: string;
      timestamp: string | Date;
      url: string | null;
      ip: string | null;
      user_agent: string | null;
    }>;
    timeline: Array<{
      time: string;
      opens: number;
      clicks: number;
    }>;
  } | null>(null);
  protected readonly coreMetrics = computed<DetailMetric[]>(() => {
    const data = this.email();
    if (!data) return [];
    return [
      {
        label: 'Send date',
        value: this.formatDate(data.send_date) ?? 'Not scheduled',
        help: data.last_engagement_at ? `Last engagement ${this.formatDate(data.last_engagement_at)}` : undefined,
      },
      {
        label: 'Created at',
        value: this.formatDate(data.created_at) ?? '—',
        help: `Created by user ${data.createdby_id}`,
      },
      {
        label: 'Updated at',
        value: this.formatDate(data.updated_at) ?? '—',
        help: `Updated by user ${data.updatedby_id}`,
      },
    ];
  });
  protected readonly engagementMetrics = computed<DetailMetric[]>(() => {
    const data = this.email();
    if (!data) return [];
    return [
      {
        label: 'Open rate',
        value: this.formatPercent(data.open_rate),
        help: `${this.formatNumber(data.unique_opens)} unique opens`,
      },
      {
        label: 'Click rate',
        value: this.formatPercent(data.click_rate),
        help: `${this.formatNumber(data.unique_clicks)} unique clicks`,
      },
      {
        label: 'Replies',
        value: this.formatNumber(data.reply_count),
      },
      {
        label: 'Unsubscribes',
        value: this.formatNumber(data.unsubscribe_count),
      },
      {
        label: 'Spam complaints',
        value: this.formatNumber(data.spam_complaint_count),
      },
    ];
  });
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.load(currentId));
    });
  }
  protected readonly topLinks = computed<MarketingEmailTopLinkType[]>(() => {
    const data = this.email();
    if (!data?.top_links) return [];
    return Array.isArray(data.top_links) ? data.top_links : [];
  });

  protected readonly funnelMetrics = computed(() => {
    const data = this.email();
    if (!data) return null;
    const sent = Number(data.total_recipients ?? 0);
    const delivered = Number(data.delivered_count ?? 0);
    const opened = Number(data.unique_opens ?? 0);
    const clicked = Number(data.unique_clicks ?? 0);

    const delPct = sent > 0 ? (delivered / sent) * 100 : 0;
    const opPct = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clPct = opened > 0 ? (clicked / opened) * 100 : 0; // CTOR

    return {
      sent,
      delivered,
      opened,
      clicked,
      delPct,
      opPct,
      clPct,
    };
  });

  protected readonly timelinePoints = computed(() => {
    const data = this.stats();
    if (!data || !data.timeline || data.timeline.length === 0) {
      return { opensPath: '', clicksPath: '', opensArea: '', clicksArea: '', points: [], gridLines: [] };
    }

    const timeline = data.timeline;
    const width = 600;
    const height = 150;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find max value for Y scaling
    let maxVal = 10;
    for (const t of timeline) {
      if (t.opens > maxVal) maxVal = t.opens;
      if (t.clicks > maxVal) maxVal = t.clicks;
    }
    // Round maxVal to nice number
    maxVal = Math.ceil(maxVal * 1.15);

    const points = timeline.map((t, i) => {
      const x = paddingLeft + (timeline.length > 1 ? (i / (timeline.length - 1)) * chartWidth : chartWidth / 2);
      const yOpens = height - paddingBottom - (t.opens / maxVal) * chartHeight;
      const yClicks = height - paddingBottom - (t.clicks / maxVal) * chartHeight;
      return {
        label: this.formatTimeBucket(t.time),
        opens: t.opens,
        clicks: t.clicks,
        x,
        yOpens,
        yClicks,
      };
    });

    // Generate path strings
    let opensPath = '';
    let clicksPath = '';
    let opensArea = '';
    let clicksArea = '';

    if (timeline.length > 0) {
      opensPath =
        `M ${points[0].x} ${points[0].yOpens} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.yOpens}`)
          .join(' ');
      clicksPath =
        `M ${points[0].x} ${points[0].yClicks} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.yClicks}`)
          .join(' ');

      const bottomY = height - paddingBottom;
      opensArea = opensPath + ` L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
      clicksArea = clicksPath + ` L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
    }

    const gridLines = [
      { y: height - paddingBottom, label: '0' },
      { y: height - paddingBottom - chartHeight * 0.25, label: Math.round(maxVal * 0.25).toString() },
      { y: height - paddingBottom - chartHeight * 0.5, label: Math.round(maxVal * 0.5).toString() },
      { y: height - paddingBottom - chartHeight * 0.75, label: Math.round(maxVal * 0.75).toString() },
      { y: height - paddingBottom - chartHeight, label: maxVal.toString() },
    ];

    return {
      opensPath,
      clicksPath,
      opensArea,
      clicksArea,
      points,
      gridLines,
    };
  });

  public audienceLabel(): string {
    const data = this.email();
    if (!data) return '—';
    if (data.target_lists) return data.target_lists;
    if (data.segments) return data.segments;
    return '—';
  }

  public formatBytes(value: number | null | undefined): string {
    if (!value) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = value;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  public goBack() {
    window.history.back();
  }

  private async load(id: string) {
    if (!id) {
      this.error.set('Newsletter not found.');
      return;
    }
    try {
      const record = (await this.service.getById(id)) as MarketingEmailType | null;
      if (!record) {
        this.error.set('Newsletter not found.');
        return;
      }
      this.email.set(record);

      const statsData = await this.service.getEngagementStats(id);
      this.stats.set(statsData);
    } catch (err: unknown) {
      console.error(err);
      this.error.set('Unable to load newsletter.');
    }
  }

  protected formatActivityDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  private formatTimeBucket(timeStr: string): string {
    try {
      const [datePart, hourPart] = timeStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour] = hourPart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hour);
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', hour12: true }).format(date);
    } catch {
      return timeStr;
    }
  }

  protected formatNumber(value: number | null | undefined): string {
    if (value == null) return '--';
    return new Intl.NumberFormat().format(value);
  }

  private formatDate(value: Date | string | null | undefined): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  private formatPercent(value: number | null | undefined): string {
    if (value == null) return '--';
    return `${value.toFixed(1)}%`;
  }
}
