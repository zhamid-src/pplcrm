import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';

export interface TimeAgoOptions {
  /** Absolute date format for fallback (Intl options) */
  dateStyle?: 'full' | 'long' | 'medium' | 'short';

  /** Locale for absolute date fallback (default: browser/Angular default) */
  locale?: string;

  /** 'long' => "2 minutes ago", 'short' => "2m ago" (default: 'long') */
  style?: TimeAgoStyle;

  /** After this many days, switch to absolute date (default: 7) */
  thresholdDays?: number;
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

@Pipe({
  name: 'timeAgo',
  standalone: true,
  pure: false, // update when change detection runs + we also markForCheck on our own timer
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timerId: any;

  constructor(private cdr: ChangeDetectorRef) {}

  public ngOnDestroy(): void {
    if (this.timerId) clearTimeout(this.timerId);
  }

  public transform(value: string | number | Date | null | undefined, opts?: TimeAgoOptions): string {
    if (!value) return '';
    const options: Required<TimeAgoOptions> = {
      thresholdDays: opts?.thresholdDays ?? 7,
      style: opts?.style ?? 'long',
      locale: opts?.locale ?? (undefined as unknown as string), // allow default locale
      dateStyle: opts?.dateStyle ?? 'short',
      timeStyle: opts?.timeStyle ?? 'short',
    };

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // schedule updates based on the magnitude to avoid extra work
    this.setupTimer(diffMs);

    const diffSec = Math.max(1, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    // Switch to absolute after threshold
    if (diffDay >= options.thresholdDays) {
      const formatter = new Intl.DateTimeFormat(options.locale, {
        dateStyle: options.dateStyle,
        timeStyle: options.timeStyle,
      });
      return formatter.format(date);
    }

    // Relative (time ago)
    if (options.style === 'short') {
      if (diffSec < 60) return 'now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDay}d ago`;
    } else {
      // long
      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
      if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
      return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    }
  }

  /** Update more frequently for fresh times, less frequently for old ones */
  private setupTimer(diffMs: number) {
    if (this.timerId) clearTimeout(this.timerId);

    let nextTickMs = 60000; // default 1 minute
    if (diffMs < 60_000)
      nextTickMs = 1000; // < 1 min -> update every second
    else if (diffMs < 3_600_000)
      nextTickMs = 15_000; // < 1 hr -> every 15s
    else if (diffMs < 86_400_000)
      nextTickMs = 60_000; // < 1 day -> every 1m
    else nextTickMs = 15 * 60_000; // >= 1 day -> every 15m

    this.timerId = setTimeout(() => {
      // Trigger change detection so the pipe recomputes
      this.cdr.markForCheck();
    }, nextTickMs);
  }
}

export type TimeAgoStyle = 'long' | 'short';
