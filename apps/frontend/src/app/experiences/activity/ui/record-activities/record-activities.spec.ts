import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { RecordActivities } from './record-activities';

const activityRow = (id: string, activity: string, extra: Record<string, unknown> = {}) => ({
  id,
  activity,
  entity: 'persons',
  entity_id: 'p1',
  first_name: 'Jane',
  last_name: 'Doe',
  created_at: '2024-01-01T00:00:00Z',
  metadata: {},
  ...extra,
});

describe('RecordActivities', () => {
  let component: RecordActivities;
  let fixture: ComponentFixture<RecordActivities>;
  let mockActivitySvc: any;

  beforeEach(async () => {
    mockActivitySvc = {
      getActivities: vi.fn().mockResolvedValue({ rows: [activityRow('a1', 'create')] }),
    };

    await TestBed.configureTestingModule({
      imports: [RecordActivities],
      providers: [{ provide: ActivityService, useValue: mockActivitySvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordActivities);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entity', 'persons');
    fixture.componentRef.setInput('entityId', 'p1');
  });

  async function flush() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should load activities for the given entity/entityId and render them', async () => {
    fixture.detectChanges();
    await flush();

    expect(mockActivitySvc.getActivities).toHaveBeenCalledWith('persons', 'p1', { startRow: 0, endRow: 10 });
    expect(component['activities']()).toHaveLength(1);
    expect(component['activityCount']()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  it('should show the empty state when there are no activities', async () => {
    mockActivitySvc.getActivities.mockResolvedValue({ rows: [] });

    fixture.detectChanges();
    await flush();

    expect(component['activities']()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No activity recorded yet');
  });

  it('should expose hasMore when a full page is returned, and load more on demand', async () => {
    const fullPage = Array.from({ length: 10 }, (_, i) => activityRow(`a${i}`, 'create'));
    mockActivitySvc.getActivities.mockResolvedValue({ rows: fullPage });

    fixture.detectChanges();
    await flush();

    expect(component['hasMore']()).toBe(true);

    const nextPage = [activityRow('a10', 'update')];
    mockActivitySvc.getActivities.mockResolvedValue({ rows: nextPage });

    component['loadMore']();
    await flush();

    expect(mockActivitySvc.getActivities).toHaveBeenCalledWith('persons', 'p1', { startRow: 10, endRow: 20 });
    expect(component['activities']()).toHaveLength(11);
  });

  it('should reset activities when the entity/entityId changes', async () => {
    fixture.detectChanges();
    await flush();
    expect(component['activities']()).toHaveLength(1);

    mockActivitySvc.getActivities.mockResolvedValue({ rows: [] });
    fixture.componentRef.setInput('entityId', 'p2');
    fixture.detectChanges();

    // The reset effect clears activities synchronously before the new resource resolves.
    expect(component['activities']()).toEqual([]);
    expect(component['hasMore']()).toBe(false);
  });

  it('should map activity types to the correct icon and produce a human-readable label', () => {
    expect(component['getActivityIcon']('create')).toBe('plus');
    expect(component['getActivityIcon']('unknown-type')).toBe('information-circle');

    const label = component['getActivityLabel'](activityRow('a1', 'create'));
    expect(label).toBe('created this person record');
  });

  it('should describe an update activity including its field-level changes', () => {
    const act = activityRow('a2', 'update', {
      metadata: { changes: { first_name: { from: 'Jane', to: 'Janet' } } },
    });

    const label = component['getActivityLabel'](act);
    expect(label).toContain('updated this person record');
    expect(label).toContain('first name from "Jane" to "Janet"');
  });
});
