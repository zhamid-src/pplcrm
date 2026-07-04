import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsGridComponent } from './events-grid';
import { EventsFrontendService } from '../services/events-frontend-service';

class MockEventsFrontendService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
  triggerRefresh = vi.fn();
}

describe('EventsGridComponent', () => {
  let component: EventsGridComponent;
  let fixture: ComponentFixture<EventsGridComponent>;
  let mockEventsSvc: MockEventsFrontendService;

  beforeEach(async () => {
    mockEventsSvc = new MockEventsFrontendService();

    await TestBed.configureTestingModule({
      imports: [EventsGridComponent],
      providers: [provideRouter([]), { provide: EventsFrontendService, useValue: mockEventsSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col'].map((c: any) => c.field)).toEqual([
      'name',
      'location_address',
      'start_time',
      'end_time',
      'is_published',
      'registrations_count',
      'capacity',
    ]);
  });

  it('should format start_time and end_time as localized dates', () => {
    const startCol = component['col'].find((c: any) => c.field === 'start_time');
    const formatted = startCol?.valueFormatter?.({ value: '2026-08-01T18:00:00Z', data: {} } as any);
    expect(formatted).toMatch(/2026/);

    const emptyFormatted = startCol?.valueFormatter?.({ value: null, data: {} } as any);
    expect(emptyFormatted).toBe('');
  });

  it('should format is_published as Yes/Draft', () => {
    const publishedCol = component['col'].find((c: any) => c.field === 'is_published');
    expect(publishedCol?.valueFormatter?.({ value: true, data: {} } as any)).toBe('Yes');
    expect(publishedCol?.valueFormatter?.({ value: false, data: {} } as any)).toBe('Draft');
  });

  it('should format capacity as Unlimited when not set', () => {
    const capacityCol = component['col'].find((c: any) => c.field === 'capacity');
    expect(capacityCol?.valueFormatter?.({ value: null, data: {} } as any)).toBe('Unlimited');
    expect(capacityCol?.valueFormatter?.({ value: 50, data: {} } as any)).toBe(50);
  });
});
