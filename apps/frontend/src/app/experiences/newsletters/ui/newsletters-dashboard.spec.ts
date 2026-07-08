import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { NewslettersDashboardComponent } from './newsletters-dashboard';

describe('NewslettersDashboardComponent', () => {
  let component: NewslettersDashboardComponent;
  let fixture: ComponentFixture<NewslettersDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewslettersDashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NewslettersDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should report zeroed stats when there are no sent newsletters', () => {
    fixture.componentRef.setInput('rows', [{ status: 'draft' }]);
    fixture.detectChanges();

    expect(component['stats']()).toEqual({
      totalSent: 0,
      totalRecipients: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      totalBounces: 0,
    });
  });

  it('should aggregate open/click rates only across sent newsletters', () => {
    fixture.componentRef.setInput('rows', [
      { status: 'sent', delivered_count: 100, unique_opens: 40, unique_clicks: 10, bounce_count: 2 },
      { status: 'sent', delivered_count: 200, unique_opens: 20, unique_clicks: 5, bounce_count: 1 },
      { status: 'draft', delivered_count: 999, unique_opens: 999, unique_clicks: 999, bounce_count: 999 },
    ]);
    fixture.detectChanges();

    const stats = component['stats']();
    expect(stats.totalSent).toBe(2);
    expect(stats.totalRecipients).toBe(300);
    expect(stats.totalBounces).toBe(3);
    // (40 + 20) opens / 300 recipients * 100
    expect(stats.avgOpenRate).toBeCloseTo(20, 5);
    // (10 + 5) clicks / 300 recipients * 100
    expect(stats.avgClickRate).toBeCloseTo(5, 5);
  });

  it('should build chart data from up to 8 most recent sent newsletters, oldest first', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `Newsletter ${i}`,
      status: 'sent',
      send_date: new Date(2026, 0, i + 1).toISOString(),
      open_rate: i,
      click_rate: i / 2,
    }));
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();

    const chartData = component['chartData']();
    expect(chartData).toHaveLength(8);
    // Most recent 8 (indices 2..9), displayed oldest-to-newest.
    expect(chartData[0]?.name).toBe('Newsletter 2');
    expect(chartData[7]?.name).toBe('Newsletter 9');
  });

  it('should exclude sent newsletters without a send_date from the chart', () => {
    fixture.componentRef.setInput('rows', [
      { name: 'No date', status: 'sent', open_rate: 10, click_rate: 5 },
      { name: 'Has date', status: 'sent', send_date: new Date().toISOString(), open_rate: 20, click_rate: 8 },
    ]);
    fixture.detectChanges();

    const chartData = component['chartData']();
    expect(chartData).toHaveLength(1);
    expect(chartData[0]?.name).toBe('Has date');
  });

  it('should clamp bar heights to the 0-160px range', () => {
    expect(component['openBarHeight'](0)).toBe(0);
    expect(component['openBarHeight'](100)).toBe(160);
    expect(component['openBarHeight'](150)).toBe(160);
    expect(component['openBarHeight'](-10)).toBe(0);
    expect(component['clickBarHeight'](50)).toBe(80);
  });

  it('should truncate long labels and format numbers using locale grouping', () => {
    expect(component['truncate']('Short')).toBe('Short');
    expect(component['truncate']('This is a very long newsletter name')).toBe('This is a ve...');
    expect(component['formatNumber'](1234567)).toBe(new Intl.NumberFormat().format(1234567));
  });
});
