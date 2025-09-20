import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarketingEmailTopLinkType, MarketingEmailType } from '@common';
import { Icon } from '@icons/icon';

import { NewslettersService } from '../services/newsletters-service';

interface DetailMetric {
  help?: string;
  label: string;
  value: string;
}

@Component({
  selector: 'pc-newsletter-detail',
  standalone: true,
  imports: [CommonModule, Icon],
  templateUrl: './newsletter-detail.html',
})
export class NewsletterDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(NewslettersService);

  protected readonly email = signal<MarketingEmailType | null>(null);
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
        label: 'Delivered',
        value: this.formatNumber(data.delivered_count),
        help: `${this.formatNumber(data.total_recipients)} total recipients`,
      },
      {
        label: 'Bounces',
        value: this.formatNumber(data.bounce_count),
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
  protected readonly topLinks = computed<MarketingEmailTopLinkType[]>(() => {
    const data = this.email();
    if (!data?.top_links) return [];
    return Array.isArray(data.top_links) ? data.top_links : [];
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

  public async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
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
    } catch (err: unknown) {
      console.error(err);
      this.error.set('Unable to load newsletter.');
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
