import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsletterDetailComponent } from './newsletter-detail';
import { NewslettersService } from '../services/newsletters-service';

const mockEmail = {
  id: '1',
  name: 'Spring Update',
  status: 'sent',
  subject: 'Spring is here',
  send_date: new Date('2026-03-01T10:00:00Z'),
  last_engagement_at: new Date('2026-03-02T10:00:00Z'),
  created_at: new Date('2026-02-01T00:00:00Z'),
  updated_at: new Date('2026-02-15T00:00:00Z'),
  createdby_id: 'user-1',
  updatedby_id: 'user-2',
  open_rate: 45.678,
  click_rate: 12.3,
  unique_opens: 200,
  unique_clicks: 55,
  reply_count: 3,
  unsubscribe_count: 2,
  spam_complaint_count: 0,
  total_recipients: 500,
  delivered_count: 480,
  top_links: [{ url: 'https://example.com', clicks: 10 }],
  target_lists: null,
  segments: null,
};

const mockStats = {
  activities: [],
  timeline: [
    { time: '2026-03-01 08', opens: 5, clicks: 1 },
    { time: '2026-03-01 09', opens: 12, clicks: 4 },
  ],
};

describe('NewsletterDetailComponent', () => {
  let component: NewsletterDetailComponent;
  let fixture: ComponentFixture<NewsletterDetailComponent>;
  let mockNewslettersSvc: any;

  beforeEach(async () => {
    mockNewslettersSvc = {
      getById: vi.fn().mockResolvedValue(mockEmail),
      getEngagementStats: vi.fn().mockResolvedValue(mockStats),
    };

    await TestBed.configureTestingModule({
      imports: [NewsletterDetailComponent],
      providers: [{ provide: NewslettersService, useValue: mockNewslettersSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should load the newsletter and its engagement stats for the given id', () => {
    expect(mockNewslettersSvc.getById).toHaveBeenCalledWith('1');
    expect(mockNewslettersSvc.getEngagementStats).toHaveBeenCalledWith('1');
    expect(component['email']()).toEqual(mockEmail);
    expect(component['stats']()).toEqual(mockStats);
    expect(component['error']()).toBeNull();
  });

  it('should set an error when the newsletter cannot be found', async () => {
    mockNewslettersSvc.getById.mockResolvedValue(null);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['error']()).toBe('Newsletter not found.');
  });

  it('should set an error when loading fails', async () => {
    mockNewslettersSvc.getById.mockRejectedValue(new Error('network error'));
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['error']()).toBe('Unable to load newsletter.');
  });

  it('should compute core metrics with send date and engagement help text', () => {
    const metrics = component['coreMetrics']();
    const sendDateMetric = metrics.find((m) => m.label === 'Send date');
    expect(sendDateMetric?.help).toContain('Last engagement');
    expect(metrics.find((m) => m.label === 'Created at')?.help).toBe('Created by user user-1');
  });

  it('should compute engagement metrics with formatted percentages and counts', () => {
    const metrics = component['engagementMetrics']();
    expect(metrics.find((m) => m.label === 'Open rate')?.value).toBe('45.7%');
    expect(metrics.find((m) => m.label === 'Click rate')?.value).toBe('12.3%');
    expect(metrics.find((m) => m.label === 'Replies')?.value).toBe('3');
  });

  it('should compute the funnel metrics as percentages of the prior stage', () => {
    const funnel = component['funnelMetrics']();
    expect(funnel?.sent).toBe(500);
    expect(funnel?.delivered).toBe(480);
    expect(funnel?.delPct).toBeCloseTo((480 / 500) * 100, 5);
    expect(funnel?.opPct).toBeCloseTo((200 / 480) * 100, 5);
    expect(funnel?.clPct).toBeCloseTo((55 / 200) * 100, 5);
  });

  it('should extract the top links from the loaded email', () => {
    expect(component['topLinks']()).toEqual([{ url: 'https://example.com', clicks: 10 }]);
  });

  it('should build timeline points and SVG paths from the stats timeline', () => {
    const points = component['timelinePoints']();
    expect(points.points).toHaveLength(2);
    expect(points.opensPath.startsWith('M ')).toBe(true);
    expect(points.gridLines).toHaveLength(5);
  });

  it('should return empty timeline data when there is no stats timeline', () => {
    component['stats'].set(null);
    const points = component['timelinePoints']();
    expect(points).toEqual({ opensPath: '', clicksPath: '', opensArea: '', clicksArea: '', points: [], gridLines: [] });
  });

  it('should format byte sizes with unit suffixes', () => {
    expect(component['formatBytes'](500)).toBe('500 B');
    expect(component['formatBytes'](2048)).toBe('2.0 KB');
    expect(component['formatBytes'](0)).toBe('');
    expect(component['formatBytes'](null)).toBe('');
  });

  it('should describe the audience using target lists or segments, defaulting to a dash', () => {
    expect(component['audienceLabel']()).toBe('—');

    component['email'].set({ ...mockEmail, target_lists: 'VIP Donors' } as never);
    expect(component['audienceLabel']()).toBe('VIP Donors');
  });

  it('should format activity dates and tolerate invalid input', () => {
    expect(component['formatActivityDate'](null)).toBe('');
    expect(component['formatActivityDate']('not-a-date')).toBe('');
    expect(component['formatActivityDate'](new Date('2026-03-01T10:00:00Z'))).toEqual(expect.any(String));
  });
});
