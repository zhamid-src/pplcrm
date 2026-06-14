import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DashboardStats {
  totalSent: number;
  totalRecipients: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalBounces: number;
}

@Component({
  selector: 'pc-newsletters-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './newsletters-dashboard.html',
  styles: [
    `
      .fill-primary {
        fill: var(--color-primary, #6366f1);
      }
      .fill-secondary {
        fill: var(--color-secondary, #10b981);
      }
    `,
  ],
})
export class NewslettersDashboardComponent {
  public rows = input<any[]>([]);
  protected collapsed = signal(false);

  // Compute overall stats from the dataset
  protected stats = computed<DashboardStats>(() => {
    const list = this.rows() || [];
    // Only aggregate records that have been sent
    const sentList = list.filter((r) => r.status === 'sent');

    if (sentList.length === 0) {
      return { totalSent: 0, totalRecipients: 0, avgOpenRate: 0, avgClickRate: 0, totalBounces: 0 };
    }

    const totalSent = sentList.length;
    let totalRecipients = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalBounces = 0;

    for (const r of sentList) {
      totalRecipients += Number(r.delivered_count ?? r.total_recipients ?? 0);
      totalOpens += Number(r.unique_opens ?? 0);
      totalClicks += Number(r.unique_clicks ?? 0);
      totalBounces += Number(r.bounce_count ?? 0);
    }

    const avgOpenRate = totalRecipients > 0 ? (totalOpens / totalRecipients) * 100 : 0;
    const avgClickRate = totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0;

    return {
      totalSent,
      totalRecipients,
      avgOpenRate,
      avgClickRate,
      totalBounces,
    };
  });

  // Extract comparative chart dataset (up to last 8 sent newsletters)
  protected chartData = computed(() => {
    const list = this.rows() || [];
    // Filter for sent items and sort by date descending
    const sent = list
      .filter((r) => r.status === 'sent' && r.send_date)
      .sort((a, b) => new Date(b.send_date).getTime() - new Date(a.send_date).getTime());

    // Take up to 8 items, then reverse to display chronologically (left to right)
    return sent
      .slice(0, 8)
      .reverse()
      .map((r) => ({
        name: r.name || 'Newsletter',
        openRate: Number(r.open_rate ?? 0),
        clickRate: Number(r.click_rate ?? 0),
      }));
  });

  // SVG Chart layout computations
  protected groupWidth = computed(() => {
    const n = this.chartData().length;
    return n > 0 ? Math.floor(730 / n) : 730;
  });

  protected barSpacing = computed(() => {
    const gw = this.groupWidth();
    return Math.floor(gw * 0.18);
  });

  protected barWidth = computed(() => {
    const gw = this.groupWidth();
    return Math.floor(gw * 0.28);
  });

  protected openBarHeight(rate: number): number {
    // 160px is the maximum height of a bar (corresponding to 100%)
    const clamped = Math.max(0, Math.min(100, rate));
    return Math.round((clamped / 100) * 160);
  }

  protected clickBarHeight(rate: number): number {
    const clamped = Math.max(0, Math.min(100, rate));
    return Math.round((clamped / 100) * 160);
  }

  protected truncate(value: string): string {
    if (value.length <= 15) return value;
    return value.slice(0, 12) + '...';
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value);
  }
}
