import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';

export interface TimeAgoOptions {
  thresholdDays?: number;
  style?: 'long' | 'short' | 'compact' | string;
  compact?: boolean;
  hideSuffix?: boolean;
  // Index signature ensures any other existing options in your codebase are accepted
  [key: string]: any;
}

@Pipe({
  name: 'timeAgo', // Matched to your template casing
  pure: false, // Must be false to update the UI over time
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastValue?: string | number | Date | null;
  private lastOptsJson?: string;
  private lastResult = '';

  constructor(private cdr: ChangeDetectorRef) {}

  public transform(value: string | number | Date | null | undefined, opts?: TimeAgoOptions): string {
    // Stringify options to avoid pure:false memory reference loops
    const optsJson = opts ? JSON.stringify(opts) : '';

    // Only recalculate if the date OR the options have actually changed
    if (this.lastValue === value && this.lastOptsJson === optsJson && this.timerId) {
      return this.lastResult;
    }

    this.lastValue = value;
    this.lastOptsJson = optsJson;
    this.clearTimer();

    if (!value) {
      this.lastResult = '';
      return this.lastResult;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      this.lastResult = String(value);
      return this.lastResult;
    }

    const diffMs = new Date().getTime() - date.getTime();

    // Calculate and cache the result
    this.lastResult = this.formatTimeAgo(date, diffMs, opts);
    this.setupTimer(diffMs);

    return this.lastResult;
  }

  private formatTimeAgo(date: Date, diffMs: number, opts?: TimeAgoOptions): string {
    const seconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // If a threshold is set and exceeded, fallback to a standard date string
    if (opts?.thresholdDays !== undefined && days >= opts.thresholdDays) {
      return date.toLocaleDateString(undefined, {
        month: opts.style === 'short' ? 'short' : 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const suffix = opts?.hideSuffix ? '' : ' ago';

    // Handle compact/short styles
    if (opts?.compact || opts?.style === 'compact' || opts?.style === 'short') {
      if (seconds < 60) return 'now';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      return `${days}d`;
    }

    // Default long style
    if (seconds < 60) return 'just now';
    if (minutes === 1) return `a minute${suffix}`;
    if (minutes < 60) return `${minutes} minutes${suffix}`;
    if (hours === 1) return `an hour${suffix}`;
    if (hours < 24) return `${hours} hours${suffix}`;
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days${suffix}`;

    const months = Math.floor(days / 30);
    if (months === 1) return `a month${suffix}`;
    if (months < 12) return `${months} months${suffix}`;

    const years = Math.floor(days / 365);
    if (years === 1) return `a year${suffix}`;
    return `${years} years${suffix}`;
  }

  private setupTimer(diffMs: number): void {
    const seconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(seconds / 60);

    let timeoutMs = 60000;

    // Scale update frequency based on age to save CPU
    if (seconds < 60) {
      timeoutMs = 10000; // 10 seconds
    } else if (minutes < 60) {
      timeoutMs = 60000; // 1 minute
    } else if (minutes < 1440) {
      timeoutMs = 3600000; // 1 hour
    } else {
      timeoutMs = 86400000; // 1 day
    }

    // Native setTimeout triggers Angular's zoneless scheduler internally
    // when markForCheck is called inside it.
    this.timerId = setTimeout(() => {
      this.cdr.markForCheck();
    }, timeoutMs);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public ngOnDestroy(): void {
    this.clearTimer();
  }
}
