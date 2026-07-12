import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsletterDetailComponent } from './newsletter-detail';
import { NewslettersService } from '../services/newsletters-service';
import { FilesService } from '../../files/services/files.service';

const mockEmail = {
  id: '1',
  name: 'Spring Update',
  status: 'sent',
  subject: 'Spring is here',
  preview_text: 'Photos and totals inside',
  // Local (zone-less) timestamps so bucket math is deterministic across machines.
  send_date: new Date('2026-03-01T10:00:00'),
  last_engagement_at: new Date('2026-03-02T10:00:00'),
  created_at: new Date('2026-02-01T00:00:00'),
  updated_at: new Date('2026-02-15T00:00:00'),
  createdby_id: 'user-1',
  updatedby_id: 'user-2',
  open_rate: 45.7,
  click_rate: 12.3,
  unique_opens: 200,
  unique_clicks: 55,
  reply_count: 3,
  unsubscribe_count: 2,
  spam_complaint_count: 0,
  total_recipients: 500,
  delivered_count: 480,
  html_content: '<p>Hello</p>',
  plain_text_content: 'Hello',
  top_links: [{ url: 'https://example.com', clicks: 10 }],
  target_lists: null,
  segments: null,
};

const mockReport = {
  timeline: [
    { time: '2026-03-01 10:00', opens: 5, clicks: 1 },
    { time: '2026-03-01 11:00', opens: 12, clicks: 4 },
    { time: '2026-03-02 09:00', opens: 2, clicks: 0 },
  ],
  opens_in_24h_pct: 89,
  bounces: {
    total: 2,
    hard: 1,
    soft: 1,
    dropped: 0,
    rows: [
      { email: 'gone@example.com', kind: 'hard', reason: 'Mailbox does not exist', occurred_at: null, person: null },
      {
        email: 'full@example.com',
        kind: 'soft',
        reason: 'Mailbox full',
        occurred_at: null,
        person: { id: '9', public_id: 'abcd1234', name: 'Bee Person' },
      },
    ],
  },
  top_links: [
    { url: 'https://example.com/rsvp', clicks: 10, people: 8 },
    { url: 'https://example.com/give', clicks: 5, people: null },
  ],
  tracked_links: 2,
  total_clicks: 15,
  unique_clickers: 9,
  most_engaged: [
    { email: 'cee@example.com', opens: 3, clicks: 2, links: 2, person: { id: '2', public_id: null, name: 'Cee Dee' } },
  ],
  unsubscribes: { total: 2, reasons: [{ reason: null, count: 2 }] },
  spam_reports: { total: 0, rows: [] },
  audience: {
    lists: [{ id: '1', name: 'Donors', mode: 'include', members: 100 }],
    overlap_removed: 3,
    suppressed_skipped: 2,
  },
  previous_sends: [
    {
      id: '0',
      name: 'April update',
      send_date: new Date('2026-02-01T09:00:00'),
      open_rate: 40,
      click_rate: 8,
      unsubscribe_rate: 0.6,
      bounce_rate: 2.1,
    },
    {
      id: '1',
      name: 'Spring Update',
      send_date: new Date('2026-03-01T10:00:00'),
      open_rate: 45.7,
      click_rate: 12.3,
      unsubscribe_rate: 0.4,
      bounce_rate: 1.7,
    },
  ],
  from: { name: 'Riverton Campaign', email: 'hello@riverton.vote' },
};

describe('NewsletterDetailComponent', () => {
  let component: NewsletterDetailComponent;
  let fixture: ComponentFixture<NewsletterDetailComponent>;
  let mockNewslettersSvc: any;
  let mockFilesSvc: any;

  beforeEach(async () => {
    mockNewslettersSvc = {
      getById: vi.fn().mockResolvedValue(mockEmail),
      getReport: vi.fn().mockResolvedValue(mockReport),
      createClickersList: vi.fn(),
      add: vi.fn(),
    };
    mockFilesSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
      uploadFileDirectly: vi.fn(),
      delete: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NewsletterDetailComponent],
      providers: [
        provideRouter([]),
        { provide: NewslettersService, useValue: mockNewslettersSvc },
        { provide: FilesService, useValue: mockFilesSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should load the newsletter and its report for the given id', () => {
    expect(mockNewslettersSvc.getById).toHaveBeenCalledWith('1');
    expect(mockNewslettersSvc.getReport).toHaveBeenCalledWith('1');
    expect(component['email']()).toEqual(mockEmail);
    expect(component['report']()).toEqual(mockReport);
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

  it('should describe the send with date and sender', () => {
    const sentence = component['sentSentence']();
    expect(sentence).toContain('Sent');
    expect(sentence).toContain('hello@riverton.vote');
  });

  it('should compute the five stat tiles with shares and averages', () => {
    const tiles = component['tiles']();
    expect(tiles.map((t) => t.label)).toEqual(['Delivered', 'Open rate', 'Click rate', 'Replies', 'Bounces']);
    expect(tiles[0]?.value).toBe('480');
    expect(tiles[0]?.sub).toBe('96.0% of 500 sent');
    expect(tiles[1]?.value).toBe('45.7%');
    // Average excludes this send — only "April update" remains.
    expect(tiles[1]?.sub).toContain('avg 40.0%');
    expect(tiles[2]?.sub).toContain('9 unique clickers');
    expect(tiles[4]?.value).toBe('2');
    expect(tiles[4]?.sub).toBe('1 hard · 1 soft');
  });

  it('should compute funnel rows as shares of the prior stage', () => {
    const funnel = component['funnel']();
    expect(funnel).toHaveLength(4);
    expect(funnel[1]?.share).toBe('96.0% of sent');
    expect(funnel[2]?.share).toBe('41.7% of delivered');
    // Clicked uses the report's unique clickers (9 of 200 opens).
    expect(funnel[3]?.share).toBe('4.5% of opens');
  });

  it('should bucket the timeline into 3-hour bars over the first 48 hours', () => {
    const chart = component['engagementChart']();
    expect(chart).toHaveLength(16);
    // 10:00 and 11:00 land in bucket 0; 23 hours later lands in bucket 7.
    expect(chart?.[0]?.opens).toBe(17);
    expect(chart?.[0]?.clicks).toBe(5);
    expect(chart?.[7]?.opens).toBe(2);
  });

  it('should compare against the previous send with signed deltas', () => {
    const rows = component['comparison']();
    expect(rows).toHaveLength(4);
    expect(rows[0]?.label).toBe('Open rate');
    expect(rows[0]?.delta).toBe('+5.7 pts vs "April update"');
    expect(rows[0]?.deltaClass).toBe('text-success');
    // Unsubscribe rate went down — lower is better, so that is good news too.
    expect(rows[2]?.delta).toBe('−0.2 pts vs "April update"');
    expect(rows[2]?.deltaClass).toBe('text-success');
  });

  it('should summarize the most engaged readers with initials and links', () => {
    const engaged = component['mostEngaged']();
    expect(engaged[0]?.displayName).toBe('Cee Dee');
    expect(engaged[0]?.initials).toBe('CD');
    expect(engaged[0]?.summary).toBe('Opened 3× · clicked 2 links');
  });

  it('should fall back to a person id route when no public id exists', () => {
    expect(component['personRoute']({ id: '2', public_id: null })).toEqual(['/people', '2']);
    expect(component['personRoute']({ id: '9', public_id: 'abcd1234' })).toEqual(['/people', 'abcd1234']);
  });

  it('should not call the backend when there are no clickers to list', async () => {
    component['report'].set({ ...mockReport, unique_clickers: 0 } as never);
    await component['createClickersList']();
    expect(mockNewslettersSvc.createClickersList).not.toHaveBeenCalled();
  });

  it('should group all unsubscribes under "No reason given"', () => {
    const reasons = component['unsubscribeReasons']();
    expect(reasons).toEqual([{ label: 'No reason given', count: 2, width: 100 }]);
  });

  it('should narrate audience changes since the send', () => {
    expect(component['audienceSinceSend']()).toBe('Since the send: 2 unsubscribed · 2 joined the bounce list.');
  });
});
