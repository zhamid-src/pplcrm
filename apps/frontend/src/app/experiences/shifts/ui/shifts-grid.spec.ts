import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShiftsGridComponent } from './shifts-grid';
import { ShiftsService } from '../services/shifts-service';

class MockShiftsService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
  triggerRefresh = vi.fn();
}

describe('ShiftsGridComponent', () => {
  let component: ShiftsGridComponent;
  let fixture: ComponentFixture<ShiftsGridComponent>;
  let mockShiftsSvc: MockShiftsService;

  beforeEach(async () => {
    mockShiftsSvc = new MockShiftsService();

    await TestBed.configureTestingModule({
      imports: [ShiftsGridComponent],
      providers: [provideRouter([]), { provide: ShiftsService, useValue: mockShiftsSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftsGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col'].map((c: any) => c.field)).toEqual([
      'name',
      'description',
      'location_address',
      'start_time',
      'end_time',
      'volunteers_count',
      'capacity',
    ]);
  });

  it('should format start_time and end_time as localized dates', () => {
    const startCol = component['col'].find((c: any) => c.field === 'start_time');
    expect(startCol?.valueFormatter?.({ value: '2026-08-01T09:00:00Z', data: {} } as any)).toMatch(/2026/);
    expect(startCol?.valueFormatter?.({ value: null, data: {} } as any)).toBe('');
  });

  it('should mark the capacity column as editable', () => {
    const capacityCol = component['col'].find((c: any) => c.field === 'capacity');
    expect(capacityCol?.editable).toBe(true);
  });

  it('should fall back to the data field when the row value is missing for formatted date columns', () => {
    const endCol = component['col'].find((c: any) => c.field === 'end_time');
    const formatted = endCol?.valueFormatter?.({
      value: undefined,
      data: { end_time: '2026-08-01T12:00:00Z' },
    } as any);
    expect(formatted).toMatch(/2026/);
  });
});
