import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowsGridComponent } from './workflows-grid';
import { WorkflowsService } from '../services/workflows-service';

class MockWorkflowsService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
}

describe('WorkflowsGridComponent', () => {
  let component: WorkflowsGridComponent;
  let fixture: ComponentFixture<WorkflowsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowsGridComponent],
      providers: [provideRouter([]), { provide: WorkflowsService, useValue: new MockWorkflowsService() }],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowsGridComponent);
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

  it('should create and define the workflow columns', () => {
    expect(component).toBeTruthy();
    expect(component['col'].map((c: { field: string }) => c.field)).toEqual([
      'name',
      'trigger_type',
      'status',
      'steps_count',
      'active_enrollments_count',
      'updated_at',
    ]);
  });

  it('should humanize known trigger types', () => {
    const format = getFormatter('trigger_type');
    expect(format({ value: 'volunteer_signup', data: {} } as never)).toBe('Volunteer Signup');
    expect(format({ value: 'manual', data: {} } as never)).toBe('Manual Enrollment');
    expect(format({ value: null, data: {} } as never)).toBe('--');
  });

  it('should title-case unmapped trigger types by replacing underscores', () => {
    const format = getFormatter('trigger_type');
    expect(format({ value: 'tag_added', data: {} } as never)).toBe('Tag Added');
  });

  it('should humanize known statuses and fall back for others', () => {
    const format = getFormatter('status');
    expect(format({ value: 'active', data: {} } as never)).toBe('Active');
    expect(format({ value: 'draft', data: {} } as never)).toBe('Draft');
    expect(format({ value: 'paused', data: {} } as never)).toBe('Paused');
    expect(format({ value: 'archived', data: {} } as never)).toBe('Archived');
    expect(format({ value: null, data: {} } as never)).toBe('--');
  });

  it('should default counts to 0 when missing', () => {
    const format = getFormatter('steps_count');
    expect(format({ value: undefined, data: {} } as never)).toBe('0');
    expect(format({ value: 5, data: {} } as never)).toBe('5');
  });

  it('should format the updated_at date and fall back to "--" for invalid values', () => {
    const format = getFormatter('updated_at');
    expect(format({ value: '2026-05-01T00:00:00Z', data: {} } as never)).toContain('2026');
    expect(format({ value: 'garbage', data: {} } as never)).toBe('--');
  });
});
