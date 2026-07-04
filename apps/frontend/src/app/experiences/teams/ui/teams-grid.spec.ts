import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsGridComponent } from './teams-grid';
import { TeamsService } from '../services/teams-service';

class MockTeamsService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
}

describe('TeamsGridComponent', () => {
  let component: TeamsGridComponent;
  let fixture: ComponentFixture<TeamsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsGridComponent],
      providers: [provideRouter([]), { provide: TeamsService, useValue: new MockTeamsService() }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsGridComponent);
    component = fixture.componentInstance;
  });

  function getFormatter(field: string) {
    const col = component['col'].find((c: { field: string }) => c.field === field);
    const formatter = col?.valueFormatter;
    if (typeof formatter !== 'function') {
      throw new Error(`Column "${field}" has no valueFormatter function`);
    }
    return formatter;
  }

  function getValueGetter(field: string) {
    const col = component['col'].find((c: { field: string }) => c.field === field);
    const valueGetter = col?.valueGetter;
    if (typeof valueGetter !== 'function') {
      throw new Error(`Column "${field}" has no valueGetter function`);
    }
    return valueGetter;
  }

  it('should create and define the team columns', () => {
    expect(component).toBeTruthy();
    expect(component['col'].map((c: { field: string }) => c.field)).toEqual([
      'name',
      'description',
      'team_captain_name',
      'volunteer_count',
      'updated_at',
    ]);
  });

  it('should read the team captain name from row data via valueGetter', () => {
    const getter = getValueGetter('team_captain_name');
    expect(getter({ data: { team_captain_name: 'Jane Smith' } } as never)).toBe('Jane Smith');
  });

  it('should default the team captain name to an empty string when missing', () => {
    const getter = getValueGetter('team_captain_name');
    expect(getter({ data: {} } as never)).toBe('');
    expect(getter({ data: undefined } as never)).toBe('');
  });

  it('should format the updated_at date using the value when present', () => {
    const format = getFormatter('updated_at');
    expect(format({ value: '2026-05-01T00:00:00Z', data: {} } as never)).toContain('2026');
  });

  it('should fall back to row data for updated_at when no value is provided', () => {
    const format = getFormatter('updated_at');
    expect(format({ value: undefined, data: { updated_at: '2026-05-01T00:00:00Z' } } as never)).toContain('2026');
  });

  it('should return an empty string for missing or invalid updated_at values', () => {
    const format = getFormatter('updated_at');
    expect(format({ value: null, data: {} } as never)).toBe('');
    expect(format({ value: 'garbage', data: {} } as never)).toBe('');
  });
});
