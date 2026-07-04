import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { NewslettersGridComponent } from './newsletters-grid';
import { NewslettersService } from '../services/newsletters-service';

class MockNewslettersService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
}

describe('NewslettersGridComponent', () => {
  let component: NewslettersGridComponent;
  let fixture: ComponentFixture<NewslettersGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewslettersGridComponent],
      providers: [provideRouter([]), { provide: NewslettersService, useValue: new MockNewslettersService() }],
    }).compileComponents();

    fixture = TestBed.createComponent(NewslettersGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and define the newsletter columns', () => {
    expect(component).toBeTruthy();
    expect(component['col'].map((c) => c.field)).toEqual([
      'name',
      'status',
      'updated_at',
      'delivered_count',
      'total_recipients',
      'open_rate',
      'click_rate',
      'send_date',
    ]);
  });

  it('should format the status column into title case with underscores replaced', () => {
    const statusCol = component['col'].find((c) => c.field === 'status');
    expect(statusCol?.valueFormatter?.({ value: 'in_progress', data: {} } as never)).toBe('In Progress');
    expect(statusCol?.valueFormatter?.({ value: null, data: {} } as never)).toBe('--');
  });

  it('should format count columns using locale grouping', () => {
    const deliveredCol = component['col'].find((c) => c.field === 'delivered_count');
    expect(deliveredCol?.valueFormatter?.({ value: 12345, data: {} } as never)).toBe('12,345');
    expect(deliveredCol?.valueFormatter?.({ value: 'not-a-number', data: {} } as never)).toBe('--');
  });

  it('should format percent columns with a trailing percent sign', () => {
    const openRateCol = component['col'].find((c) => c.field === 'open_rate');
    expect(openRateCol?.valueFormatter?.({ value: 42.567, data: {} } as never)).toBe('42.6%');
    expect(openRateCol?.valueFormatter?.({ value: null, data: {} } as never)).toBe('--');
  });

  it('should format date columns and fall back to "--" for invalid values', () => {
    const sendDateCol = component['col'].find((c) => c.field === 'send_date');
    expect(sendDateCol?.valueFormatter?.({ value: '2026-03-15T00:00:00Z', data: {} } as never)).toContain('2026');
    expect(sendDateCol?.valueFormatter?.({ value: null, data: {} } as never)).toBe('--');
    expect(sendDateCol?.valueFormatter?.({ value: 'not-a-date', data: {} } as never)).toBe('--');
  });

  it('should fall back to the row data value when the params value is absent', () => {
    const nameStatusCol = component['col'].find((c) => c.field === 'status');
    expect(nameStatusCol?.valueFormatter?.({ value: undefined, data: { status: 'sent' } } as never)).toBe('Sent');
  });
});
