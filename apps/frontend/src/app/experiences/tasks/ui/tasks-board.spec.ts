import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TasksBoard } from './tasks-board';
import { TasksService } from '../services/tasks-service';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TasksBoard', () => {
  let component: TasksBoard;
  let fixture: ComponentFixture<TasksBoard>;
  let mockTasksSvc: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockTasksSvc = {
      getAll: vi.fn().mockResolvedValue({
        rows: [{ id: 't1', name: 'Task 1', status: 'todo', priority: 'medium', assigned_to: null, due_at: null }],
        count: 1,
      }),
      update: vi.fn().mockResolvedValue({}),
      triggerRefresh: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TasksBoard],
      providers: [
        { provide: TasksService, useValue: mockTasksSvc },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksBoard);
    component = fixture.componentInstance;
  });

  // ngOnInit kicks off async work without returning a promise, so trigger it
  // through change detection (inside the zone) and wait for stability.
  const runInit = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should load tasks on init', async () => {
    await runInit();
    expect(mockTasksSvc.getAll).toHaveBeenCalled();
    expect(component['tasks']()).toHaveLength(1);
    expect(component['tasks']()[0].id).toBe('t1');
  });

  it('should update task status and trigger refresh on drop', async () => {
    await runInit();

    const mockDragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn().mockImplementation((type: string) => {
          if (type === 'text/plain') return 't1';
          return 'todo';
        }),
      },
    } as unknown as DragEvent;

    await component['onDrop'](mockDragEvent, 'in_progress');

    expect(mockTasksSvc.update).toHaveBeenCalledWith('t1', { status: 'in_progress' });
    expect(mockTasksSvc.triggerRefresh).toHaveBeenCalled();
    expect(component['tasks']()[0].status).toBe('in_progress');
  });
});
