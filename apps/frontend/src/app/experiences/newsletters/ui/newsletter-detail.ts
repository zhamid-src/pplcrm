import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarketingEmailType, MarketingEmailTopLinkType } from '@common';
import { Icon } from '@icons/icon';

import { NewslettersService } from '../services/newsletters-service';

interface DetailMetric {
  label: string;
  value: string;
  help?: string;
}

@Component({
  selector: 'pc-newsletter-detail',
  standalone: true,
  imports: [CommonModule, Icon],
  template: `
    <div class="flex flex-col gap-6" *ngIf="email(); else loading">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" (click)="goBack()">
          <pc-icon name="arrow-uturn-left" class="mr-1"></pc-icon>
          Back
        </button>
        <div class="divider divider-horizontal"></div>
        <span class="badge badge-outline capitalize">{{ email()?.status || 'sent' }}</span>
      </div>

      <section class="rounded border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 class="text-2xl font-semibold">{{ email()?.name || 'Newsletter' }}</h1>
        <p class="mt-2 text-sm text-base-content/70" *ngIf="email()?.summary">
          {{ email()?.summary }}
        </p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div *ngFor="let metric of coreMetrics()" class="flex flex-col rounded border border-base-200 p-4">
            <span class="text-sm text-base-content/60">{{ metric.label }}</span>
            <span class="mt-1 text-lg font-semibold">{{ metric.value }}</span>
            <span class="mt-1 text-xs text-base-content/50" *ngIf="metric.help">{{ metric.help }}</span>
          </div>
        </div>
      </section>

      <section class="rounded border border-base-300 bg-base-100 p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Audience</h2>
        <dl class="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-base-content/60">Target lists / segments</dt>
            <dd class="mt-1 text-base">{{ audienceLabel() }}</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/60">Audience summary</dt>
            <dd class="mt-1 text-base">{{ email()?.audience_description || '—' }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded border border-base-300 bg-base-100 p-6 shadow-sm">
        <h2 class="text-lg font-semibold">Engagement</h2>
        <div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div *ngFor="let metric of engagementMetrics()" class="flex flex-col rounded border border-base-200 p-4">
            <span class="text-sm text-base-content/60">{{ metric.label }}</span>
            <span class="mt-1 text-lg font-semibold">{{ metric.value }}</span>
            <span class="mt-1 text-xs text-base-content/50" *ngIf="metric.help">{{ metric.help }}</span>
          </div>
        </div>

        <div class="mt-6" *ngIf="topLinks().length">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Top links</h3>
          <ul class="mt-3 space-y-2">
            <li *ngFor="let link of topLinks()" class="flex items-center justify-between gap-4 rounded border border-base-200 px-4 py-3">
              <span class="truncate text-sm" title="{{ link.url }}">{{ link.url }}</span>
              <span class="badge badge-primary badge-outline">{{ link.clicks }} clicks</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="rounded border border-base-300 bg-base-100 p-6 shadow-sm" *ngIf="email()?.html_content || email()?.plain_text_content">
        <h2 class="text-lg font-semibold">Content preview</h2>
        <div class="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 class="text-sm font-semibold text-base-content/60">Subject line</h3>
            <p class="mt-1 text-base">{{ email()?.subject || '—' }}</p>

            <h3 class="mt-4 text-sm font-semibold text-base-content/60">Preview text</h3>
            <p class="mt-1 text-base">{{ email()?.preview_text || '—' }}</p>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-base-content/60">HTML content</h3>
            <div class="mt-2 max-h-72 overflow-auto rounded border border-base-200 bg-base-200/20 p-3" *ngIf="email()?.html_content; else noHtml">
              <div [innerHTML]="email()?.html_content"></div>
            </div>
            <ng-template #noHtml>
              <p class="text-sm text-base-content/60">No HTML content stored.</p>
            </ng-template>
          </div>
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-semibold text-base-content/60">Plain text content</h3>
          <pre class="mt-2 max-h-56 overflow-auto rounded border border-base-200 bg-base-200/20 p-3 text-sm">{{ email()?.plain_text_content || 'No plain text version stored.' }}</pre>
        </div>
      </section>

      <section class="rounded border border-base-300 bg-base-100 p-6 shadow-sm" *ngIf="email()?.attachments?.length">
        <h2 class="text-lg font-semibold">Attachments</h2>
        <ul class="mt-3 space-y-2">
          <li *ngFor="let attachment of email()?.attachments" class="flex items-center justify-between rounded border border-base-200 px-4 py-2">
            <span class="text-sm">{{ attachment.name }}</span>
            <span class="text-xs text-base-content/60" *ngIf="attachment.size">{{ formatBytes(attachment.size) }}</span>
          </li>
        </ul>
      </section>

      <div class="alert alert-error" *ngIf="error()">
        <pc-icon name="exclamation-triangle" class="mr-2"></pc-icon>
        {{ error() }}
      </div>
    </div>
    <ng-template #loading>
      <ng-container *ngIf="!error(); else errorState">
        <div class="flex flex-col gap-4">
          <div class="skeleton h-6 w-32"></div>
          <div class="skeleton h-32 w-full"></div>
        </div>
      </ng-container>
      <ng-template #errorState>
        <div class="alert alert-error">
          <pc-icon name="exclamation-triangle" class="mr-2"></pc-icon>
          {{ error() }}
        </div>
      </ng-template>
    </ng-template>
  `,
})
export class NewsletterDetailComponent implements OnInit {
  private readonly service = inject(NewslettersService);
  private readonly route = inject(ActivatedRoute);

  protected readonly email = signal<MarketingEmailType | null>(null);
  protected readonly error = signal<string | null>(null);

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

  protected readonly topLinks = computed<MarketingEmailTopLinkType[]>(() => {
    const data = this.email();
    if (!data?.top_links) return [];
    return Array.isArray(data.top_links) ? data.top_links : [];
  });

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

  public goBack() {
    window.history.back();
  }

  public audienceLabel(): string {
    const data = this.email();
    if (!data) return '—';
    if (data.target_lists) return data.target_lists;
    if (data.segments) return data.segments;
    return '—';
  }

  private formatPercent(value: number | null | undefined): string {
    if (value == null) return '--';
    return `${value.toFixed(1)}%`;
  }

  private formatNumber(value: number | null | undefined): string {
    if (value == null) return '--';
    return new Intl.NumberFormat().format(value);
  }

  private formatDate(value: Date | string | null | undefined): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
}
