import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  MarketingEmailType,
  NewsletterReportBounceType,
  NewsletterReportType,
} from '../../../../../../../libs/common/src';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { PcBreadcrumb } from '@uxcommon/components/breadcrumbs/breadcrumbs';
import { DetailLayout } from '@uxcommon/components/detail-layout/detail-layout';
import { StatusBadge, type PcStatusType } from '@uxcommon/components/status-badge/status-badge';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { getUserErrorMessage } from '@frontend/services/api/user-message';
import { NewslettersService } from '../services/newsletters-service';
import { FilesService } from '../../files/services/files.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const STATUS_TONE: Record<string, PcStatusType> = {
  archived: 'ghost',
  draft: 'ghost',
  paused: 'warning',
  queuing: 'info',
  scheduled: 'info',
  sending: 'info',
  sent: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  archived: 'Archived',
  draft: 'Draft',
  paused: 'Paused',
  queuing: 'Sending',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
};

const BOUNCE_KIND_LABEL: Record<NewsletterReportBounceType['kind'], string> = {
  hard: 'Hard',
  soft: 'Soft',
  dropped: 'Dropped',
};

/** The 48-hour engagement chart: sixteen 3-hour buckets from the send moment. */
const CHART_BUCKET_HOURS = 3;
const CHART_BUCKETS = 16;
const MS_PER_HOUR = 3_600_000;
/** Providers throttle senders whose spam-report rate crosses ~0.1% of delivered. */
const SPAM_RATE_DANGER_PCT = 0.1;
/** Bounce rows shown inline; the full set goes through the CSV export. */
const BOUNCE_ROWS_SHOWN = 6;

interface NewsletterAttachment {
  id: string;
  filename: string;
  size_bytes: number | null;
}

interface StatTile {
  label: string;
  value: string;
  valueClass: string;
  sub: string;
}

interface FunnelRow {
  label: string;
  count: string;
  share: string;
  width: number;
}

interface ChartBucket {
  opens: number;
  clicks: number;
  opensPct: number;
  clicksPct: number;
  tip: string;
}

interface CompareRow {
  label: string;
  current: string;
  delta: string | null;
  deltaClass: string;
  bars: { height: number; isCurrent: boolean }[];
}

@Component({
  selector: 'pc-newsletter-detail',
  imports: [DetailLayout, Icon, RouterLink, StatusBadge],
  templateUrl: './newsletter-detail.html',
})
export class NewsletterDetailComponent {
  readonly id = input.required<string>();

  private readonly service = inject(NewslettersService);
  private readonly filesSvc = inject(FilesService);
  private readonly alertSvc = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  protected readonly loading = createLoadingGate();
  protected readonly email = signal<MarketingEmailType | null>(null);
  protected readonly report = signal<NewsletterReportType | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly attachments = signal<NewsletterAttachment[]>([]);
  protected readonly isUploadingAttachment = signal(false);
  protected readonly isCreatingList = signal(false);
  protected readonly isDuplicating = signal(false);
  protected readonly emailExpanded = signal(false);

  /** Attachments can only be managed before a newsletter has gone out. */
  protected readonly canManageAttachments = computed(() => {
    const status = this.email()?.status;
    return status === 'draft' || status === 'scheduled';
  });

  /** A "report" only exists once a send is (or was) underway; before that this page is plain details. */
  protected readonly isUnsent = computed(() => {
    const status = this.email()?.status;
    return status === 'draft' || status === 'scheduled';
  });

  protected readonly eyebrow = computed(() => (this.isUnsent() ? 'Newsletter details' : 'Newsletter report'));

  /** Entity noun while loading; the record's real name (or explicit "Untitled") once loaded. */
  protected readonly pageTitle = computed(() => {
    const email = this.email();
    if (!email) return 'Newsletter';
    return email.name || 'Untitled newsletter';
  });

  protected readonly crumbs = computed<PcBreadcrumb[]>(() => [
    { label: 'Newsletters', route: '/newsletters' },
    { label: this.pageTitle() },
  ]);

  protected readonly sentSentence = computed(() => {
    const email = this.email();
    if (!email) return '';
    const from = this.report()?.from;
    const fromPart = from?.email ? ` · from ${from.name ? `${from.name} ` : ''}<${from.email}>` : '';
    if (email.status === 'sent' && email.send_date) return `Sent ${this.formatDateTime(email.send_date)}${fromPart}`;
    if (email.status === 'scheduled' && email.send_date) {
      return `Scheduled for ${this.formatDateTime(email.send_date)}${fromPart}`;
    }
    return `Not sent yet${fromPart}`;
  });

  protected readonly tiles = computed<StatTile[]>(() => {
    const email = this.email();
    if (!email) return [];
    const report = this.report();
    const sent = email.total_recipients;
    const delivered = email.delivered_count;

    // Averages across the earlier sends in this campaign (excludes this one).
    const history = (report?.previous_sends ?? []).filter((s) => s.id !== email.id);
    const avg = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const avgOpen = avg(history.map((s) => s.open_rate));
    const avgClick = avg(history.map((s) => s.click_rate));

    const bounceTotal = report ? report.bounces.total : email.bounce_count;
    const bounceSubParts: string[] = [];
    if (report && report.bounces.total > 0) {
      bounceSubParts.push(`${report.bounces.hard} hard · ${report.bounces.soft} soft`);
      if (report.bounces.dropped > 0) bounceSubParts.push(`${report.bounces.dropped} dropped`);
    }

    return [
      {
        label: 'Delivered',
        value: this.formatNumber(delivered),
        valueClass: 'text-base-content',
        sub: sent > 0 ? `${this.pct(delivered, sent)} of ${this.formatNumber(sent)} sent` : 'No recipients yet',
      },
      {
        label: 'Open rate',
        value: this.formatPercent(email.open_rate),
        valueClass: email.open_rate > 0 ? 'text-primary' : 'text-base-content',
        sub:
          `${this.formatNumber(email.unique_opens)} unique opens` +
          (avgOpen != null ? ` · avg ${this.formatPercent(avgOpen)}` : ''),
      },
      {
        label: 'Click rate',
        value: this.formatPercent(email.click_rate),
        valueClass: email.click_rate > 0 ? 'text-secondary' : 'text-base-content',
        sub:
          `${this.formatNumber(report?.unique_clickers ?? email.unique_clicks)} unique clickers` +
          (avgClick != null ? ` · avg ${this.formatPercent(avgClick)}` : ''),
      },
      {
        label: 'Replies',
        value: this.formatNumber(email.reply_count),
        valueClass: 'text-base-content',
        sub: email.reply_count > 0 ? 'Landed in the Inbox' : 'None yet',
      },
      {
        label: 'Bounces',
        value: this.formatNumber(bounceTotal),
        valueClass: bounceTotal > 0 ? 'text-warning' : 'text-base-content',
        sub: bounceSubParts.length > 0 ? bounceSubParts.join(' · ') : 'Every address accepted mail',
      },
    ];
  });

  protected readonly funnel = computed<FunnelRow[]>(() => {
    const email = this.email();
    if (!email) return [];
    const sent = email.total_recipients;
    const delivered = email.delivered_count;
    const opened = email.unique_opens;
    const clicked = this.report()?.unique_clickers ?? email.unique_clicks;
    if (sent === 0) return [];
    return [
      { label: 'Sent', count: this.formatNumber(sent), share: '100%', width: 100 },
      {
        label: 'Delivered',
        count: this.formatNumber(delivered),
        share: `${this.pct(delivered, sent)} of sent`,
        width: (delivered / sent) * 100,
      },
      {
        label: 'Opened',
        count: this.formatNumber(opened),
        share: delivered > 0 ? `${this.pct(opened, delivered)} of delivered` : '—',
        width: (opened / sent) * 100,
      },
      {
        label: 'Clicked',
        count: this.formatNumber(clicked),
        share: opened > 0 ? `${this.pct(clicked, opened)} of opens` : '—',
        width: (clicked / sent) * 100,
      },
    ];
  });

  protected readonly bounceRowsShown = computed<NewsletterReportBounceType[]>(
    () => this.report()?.bounces.rows.slice(0, BOUNCE_ROWS_SHOWN) ?? [],
  );

  protected readonly engagementChart = computed<ChartBucket[] | null>(() => {
    const report = this.report();
    if (!report || report.timeline.length === 0) return null;
    const email = this.email();
    const firstBucket = report.timeline[0];
    if (!firstBucket) return null;
    const start = email?.send_date ? new Date(email.send_date).getTime() : this.bucketTime(firstBucket.time);

    const buckets = Array.from({ length: CHART_BUCKETS }, () => ({ opens: 0, clicks: 0 }));
    for (const point of report.timeline) {
      const index = Math.floor((this.bucketTime(point.time) - start) / (CHART_BUCKET_HOURS * MS_PER_HOUR));
      if (index < 0 || index >= CHART_BUCKETS) continue; // engagement past 48h isn't in this chart
      const bucket = buckets[index];
      if (!bucket) continue;
      bucket.opens += point.opens;
      bucket.clicks += point.clicks;
    }
    const max = Math.max(1, ...buckets.map((b) => Math.max(b.opens, b.clicks)));
    return buckets.map((b, i) => ({
      opens: b.opens,
      clicks: b.clicks,
      opensPct: (b.opens / max) * 100,
      clicksPct: (b.clicks / max) * 100,
      tip: `${i * CHART_BUCKET_HOURS}–${(i + 1) * CHART_BUCKET_HOURS}h: ${b.opens} opens · ${b.clicks} clicks`,
    }));
  });

  protected readonly opensIn24hSentence = computed(() => {
    const pctValue = this.report()?.opens_in_24h_pct;
    if (pctValue == null) return null;
    return `${Math.round(pctValue)}% of opens came within 24 hours of send.`;
  });

  protected readonly topLinks = computed(() => {
    const report = this.report();
    if (!report || report.top_links.length === 0) return [];
    const max = Math.max(1, ...report.top_links.map((l) => l.clicks));
    return report.top_links.map((l) => ({
      ...l,
      display: l.url.replace(/^https?:\/\//, ''),
      width: (l.clicks / max) * 100,
    }));
  });

  protected readonly linksSentence = computed(() => {
    const report = this.report();
    if (!report) return '';
    return (
      `${this.formatNumber(report.total_clicks)} clicks from ${this.formatNumber(report.unique_clickers)} ` +
      `people · ${report.tracked_links} tracked link${report.tracked_links === 1 ? '' : 's'}`
    );
  });

  protected readonly comparison = computed<CompareRow[]>(() => {
    const report = this.report();
    const sends = report?.previous_sends ?? [];
    if (sends.length < 2) return [];
    const previous = sends[sends.length - 2];
    const metrics: { label: string; values: number[]; higherIsBetter: boolean }[] = [
      { label: 'Open rate', values: sends.map((s) => s.open_rate), higherIsBetter: true },
      { label: 'Click rate', values: sends.map((s) => s.click_rate), higherIsBetter: true },
      { label: 'Unsubscribe rate', values: sends.map((s) => s.unsubscribe_rate), higherIsBetter: false },
      { label: 'Bounce rate', values: sends.map((s) => s.bounce_rate), higherIsBetter: false },
    ];
    return metrics.map((m) => {
      const current = m.values[m.values.length - 1] ?? 0;
      const prior = m.values[m.values.length - 2] ?? 0;
      const delta = current - prior;
      const good = m.higherIsBetter ? delta > 0 : delta < 0;
      const max = Math.max(0.1, ...m.values);
      return {
        label: m.label,
        current: this.formatPercent(current),
        delta: previous ? `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} pts vs "${previous.name}"` : null,
        deltaClass: Math.abs(delta) < 0.05 ? 'text-base-content/50' : good ? 'text-success' : 'text-error',
        bars: m.values.map((v, i) => ({
          height: Math.max(8, (v / max) * 100),
          isCurrent: i === m.values.length - 1,
        })),
      };
    });
  });

  protected readonly previousSendCount = computed(() => (this.report()?.previous_sends.length ?? 1) - 1);

  protected readonly mostEngaged = computed(() => {
    const report = this.report();
    if (!report) return [];
    return report.most_engaged.map((e) => {
      const displayName = e.person?.name ?? e.email;
      const parts: string[] = [];
      if (e.opens > 0) parts.push(`Opened ${e.opens}×`);
      if (e.links > 0) parts.push(`clicked ${e.links} link${e.links === 1 ? '' : 's'}`);
      else if (e.clicks > 0) parts.push(`clicked ${e.clicks}×`);
      return {
        ...e,
        displayName,
        initials: this.initials(displayName),
        summary: parts.join(' · '),
      };
    });
  });

  protected readonly audienceSinceSend = computed(() => {
    const email = this.email();
    const report = this.report();
    if (!email || !report) return null;
    const parts: string[] = [];
    if (report.unsubscribes.total > 0) parts.push(`${report.unsubscribes.total} unsubscribed`);
    if (report.bounces.total > 0) parts.push(`${report.bounces.total} joined the bounce list`);
    if (report.spam_reports.total > 0) {
      parts.push(`${report.spam_reports.total} spam report${report.spam_reports.total === 1 ? '' : 's'}`);
    }
    return parts.length > 0 ? `Since the send: ${parts.join(' · ')}.` : null;
  });

  protected readonly unsubscribeReasons = computed(() => {
    const report = this.report();
    if (!report || report.unsubscribes.total === 0) return [];
    return report.unsubscribes.reasons.map((r) => ({
      label: r.reason ?? 'No reason given',
      count: r.count,
      width: (r.count / report.unsubscribes.total) * 100,
    }));
  });

  protected readonly unsubscribeRate = computed(() => {
    const email = this.email();
    const total = this.report()?.unsubscribes.total ?? 0;
    if (!email || email.delivered_count === 0) return null;
    return this.pct(total, email.delivered_count);
  });

  protected readonly spamRate = computed(() => {
    const email = this.email();
    const total = this.report()?.spam_reports.total ?? 0;
    if (!email || email.delivered_count === 0) return null;
    return (total / email.delivered_count) * 100;
  });

  protected readonly spamRateIsSafe = computed(() => {
    const rate = this.spamRate();
    return rate != null && rate < SPAM_RATE_DANGER_PCT;
  });

  protected readonly spamRows = computed(() => {
    const report = this.report();
    const email = this.email();
    if (!report) return [];
    return report.spam_reports.rows.map((r) => {
      let timing = '';
      if (r.occurred_at && email?.send_date) {
        const hours = Math.round(
          (new Date(r.occurred_at).getTime() - new Date(email.send_date).getTime()) / MS_PER_HOUR,
        );
        if (hours >= 0) timing = `${hours}h after send`;
      }
      return {
        email: r.email || 'Address withheld by the provider',
        timing: timing || (r.occurred_at ? this.formatDateTime(r.occurred_at) : ''),
      };
    });
  });

  constructor() {
    effect(() => {
      const currentId = this.id();
      void untracked(() => this.load(currentId));
    });
  }

  protected statusLabel(status: string | undefined): string {
    if (!status) return '—';
    return STATUS_LABEL[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected statusTone(status: string | undefined): PcStatusType {
    return (status && STATUS_TONE[status]) || 'ghost';
  }

  protected bounceKindLabel(kind: NewsletterReportBounceType['kind']): string {
    return BOUNCE_KIND_LABEL[kind];
  }

  protected bounceKindTone(kind: NewsletterReportBounceType['kind']): PcStatusType {
    return kind === 'hard' ? 'warning' : 'ghost';
  }

  protected personRoute(person: { id: string; public_id: string | null }): string[] {
    return ['/people', person.public_id ?? person.id];
  }

  protected async createClickersList(): Promise<void> {
    const report = this.report();
    if (!report || report.unique_clickers === 0 || this.isCreatingList()) return;
    this.isCreatingList.set(true);
    try {
      const result = await this.service.createClickersList(this.id());
      this.alertSvc.showSuccess(`List "${result.name}" created with ${this.formatNumber(result.members)} people`);
      await this.router.navigate(['/lists', result.id]);
    } catch (err: unknown) {
      this.alertSvc.showError(getUserErrorMessage(err, 'Failed to create the list'));
    } finally {
      this.isCreatingList.set(false);
    }
  }

  protected async duplicateNewsletter(): Promise<void> {
    const email = this.email();
    if (!email || this.isDuplicating()) return;
    this.isDuplicating.set(true);
    try {
      await this.service.add({
        name: `${email.name} (copy)`,
        status: 'draft',
        subject: email.subject ?? null,
        preview_text: email.preview_text ?? null,
        summary: email.summary ?? null,
        audience_description: email.audience_description ?? null,
        target_lists: email.target_lists ?? null,
        segments: email.segments ?? null,
        html_content: email.html_content ?? null,
        plain_text_content: email.plain_text_content ?? null,
      });
      this.alertSvc.showSuccess(`Draft "${email.name} (copy)" created`);
      await this.router.navigate(['/newsletters']);
    } catch (err: unknown) {
      this.alertSvc.showError(getUserErrorMessage(err, 'Failed to duplicate the newsletter'));
    } finally {
      this.isDuplicating.set(false);
    }
  }

  protected exportReportCsv(): void {
    const email = this.email();
    const report = this.report();
    if (!email) return;
    const lines: string[][] = [
      ['Metric', 'Value'],
      ['Newsletter', email.name],
      ['Status', this.statusLabel(email.status)],
      ['Sent', email.send_date ? new Date(email.send_date).toISOString() : ''],
      ['Recipients', String(email.total_recipients)],
      ['Delivered', String(email.delivered_count)],
      ['Open rate', this.formatPercent(email.open_rate)],
      ['Unique opens', String(email.unique_opens)],
      ['Click rate', this.formatPercent(email.click_rate)],
      ['Unique clickers', String(report?.unique_clickers ?? email.unique_clicks)],
      ['Replies', String(email.reply_count)],
      ['Bounces', String(report?.bounces.total ?? email.bounce_count)],
      ['Unsubscribes', String(report?.unsubscribes.total ?? email.unsubscribe_count)],
      ['Spam reports', String(report?.spam_reports.total ?? email.spam_complaint_count)],
    ];
    if (report && report.top_links.length > 0) {
      lines.push([], ['Link', 'Clicks', 'People']);
      for (const link of report.top_links) {
        lines.push([link.url, String(link.clicks), link.people != null ? String(link.people) : '']);
      }
    }
    this.downloadCsv(this.csvFileName('report'), lines);
  }

  protected exportBouncesCsv(): void {
    const report = this.report();
    if (!report || report.bounces.rows.length === 0) return;
    const lines: string[][] = [['Email', 'Kind', 'Reason', 'Occurred at', 'CRM match']];
    for (const bounce of report.bounces.rows) {
      lines.push([
        bounce.email,
        this.bounceKindLabel(bounce.kind),
        bounce.reason ?? '',
        bounce.occurred_at ? new Date(bounce.occurred_at).toISOString() : '',
        bounce.person?.name ?? '',
      ]);
    }
    this.downloadCsv(this.csvFileName('bounces'), lines);
  }

  protected async onAttachmentSelected(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl?.files?.[0];
    const newsletterId = this.id();
    if (!file || !newsletterId) return;

    this.isUploadingAttachment.set(true);
    try {
      await this.filesSvc.uploadFileDirectly(file, { entityType: 'newsletter', entityId: newsletterId });
      this.alertSvc.showSuccess(`"${file.name}" attached`);
      await this.loadAttachments(newsletterId);
    } catch {
      this.alertSvc.showError('Failed to attach file');
    } finally {
      this.isUploadingAttachment.set(false);
      inputEl.value = '';
    }
  }

  protected async removeAttachment(attachment: NewsletterAttachment): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: `Remove "${attachment.filename}"?`,
      message: 'This detaches the file from this newsletter and deletes it from cloud storage.',
      variant: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      await this.filesSvc.delete(attachment.id);
      this.alertSvc.showSuccess(`"${attachment.filename}" removed`);
      const newsletterId = this.id();
      if (newsletterId) await this.loadAttachments(newsletterId);
    } catch {
      this.alertSvc.showError('Failed to remove attachment');
    }
  }

  protected formatBytes(value: number | null | undefined): string {
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

  protected formatNumber(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat().format(value);
  }

  protected formatPercent(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value.toFixed(1)}%`;
  }

  protected formatSpamRate(value: number | null): string {
    if (value == null) return '—';
    return `${value.toFixed(2)}%`;
  }

  private pct(part: number, whole: number): string {
    return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';
  }

  private formatDateTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  /** Timeline bucket keys are 'YYYY-MM-DD HH24:00' strings; parse as local time. */
  private bucketTime(bucket: string): number {
    return new Date(bucket.replace(' ', 'T')).getTime();
  }

  private initials(name: string): string {
    const words = name
      .replace(/[^\p{L}\p{N}@ ]/gu, '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) return '?';
    const first = words[0]?.charAt(0) ?? '';
    const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';
    return (first + last).toUpperCase() || '?';
  }

  private csvFileName(kind: string): string {
    const name = (this.email()?.name ?? 'newsletter')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${name || 'newsletter'}-${kind}.csv`;
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const escapeCell = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private async load(id: string): Promise<void> {
    if (!id) {
      this.error.set('Newsletter not found.');
      return;
    }
    const end = this.loading.begin();
    try {
      const record = (await this.service.getById(id)) as MarketingEmailType | null;
      if (!record) {
        this.error.set('Newsletter not found.');
        return;
      }
      this.email.set(record);

      const reportData = await this.service.getReport(id);
      this.report.set(reportData);

      await this.loadAttachments(id);
    } catch (err: unknown) {
      console.error(err);
      this.error.set('Unable to load newsletter.');
    } finally {
      end();
    }
  }

  private async loadAttachments(id: string): Promise<void> {
    try {
      const { rows } = await this.filesSvc.getAll({ entityType: 'newsletter', entityId: id });
      this.attachments.set(
        (rows as Record<string, unknown>[]).map((r) => ({
          id: String(r['id']),
          filename: String(r['filename']),
          size_bytes: r['size_bytes'] as number | null,
        })),
      );
    } catch {
      // Non-fatal — attachments are supplementary to the newsletter report.
    }
  }
}
