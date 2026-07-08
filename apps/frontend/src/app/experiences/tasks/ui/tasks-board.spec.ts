import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { SettingsService } from '@experiences/settings/services/settings-service';
import { AuthService } from '../../../auth/auth-service';
import { UserService } from '../../../services/user.service';
import { TasksService } from '../services/tasks-service';
import { TasksBoard } from './tasks-board';

describe('TasksBoard', () => {
  let component: TasksBoard;
  let fixture: ComponentFixture<TasksBoard>;
  let mockTasksSvc: any;
  let mockRouter: any;
  let mockAuth: any;
  let mockUserService: any;
  let mockSettingsSvc: any;
  let mockAlerts: any;

  const baseRow = {
    id: 't1',
    name: 'Task 1',
    status: 'todo',
    priority: 'medium',
    assigned_to: null,
    due_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    details: null,
    team_name: null,
  };

  beforeEach(async () => {
    mockTasksSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [baseRow], count: 1 }),
      getSummaryCounts: vi.fn().mockResolvedValue({ openTotal: 1, slaBreaches: 0, assignedToMe: 0, unassigned: 1 }),
      update: vi.fn().mockResolvedValue({}),
      triggerRefresh: vi.fn(),
    };

    mockRouter = { navigate: vi.fn() };
    mockAuth = { getUser: vi.fn().mockReturnValue({ id: 'u1', first_name: 'Amira', last_name: 'Hassan' }) };
    mockUserService = { getUsers: vi.fn().mockResolvedValue([]) };
    mockSettingsSvc = {
      load: vi.fn().mockResolvedValue({}),
      getValue: vi.fn((_key: string, fallback: unknown) => fallback),
    };
    mockAlerts = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TasksBoard],
      providers: [
        { provide: TasksService, useValue: mockTasksSvc },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
        { provide: UserService, useValue: mockUserService },
        { provide: SettingsService, useValue: mockSettingsSvc },
        { provide: AlertService, useValue: mockAlerts },
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

  it('should load tasks and summary counts on init', async () => {
    await runInit();
    expect(mockTasksSvc.getAll).toHaveBeenCalled();
    expect(mockTasksSvc.getSummaryCounts).toHaveBeenCalled();
    expect(component['tasks']()).toHaveLength(1);
    expect(component['tasks']()[0]?.id).toBe('t1');
    expect(component['countSentence']()).toContain('1 open task');
    expect(component['countSentence']()).toContain('waiting for an owner');
  });

  it('should move a card one column via moveCard and flash it', async () => {
    await runInit();
    const task = component['tasks']()[0]!;

    await component['moveCard'](task, 1);

    expect(mockTasksSvc.update).toHaveBeenCalledWith('t1', { status: 'in_progress' });
    expect(mockTasksSvc.triggerRefresh).toHaveBeenCalled();
    expect(component['tasks']()[0]?.status).toBe('in_progress');
    expect(component['isFlashed']('t1')).toBe(true);
  });

  it('should dim and refuse the ‹ move at the first column', async () => {
    await runInit();
    const task = component['tasks']()[0]!; // status: todo, the first column

    expect(component['canMove'](task.status, -1)).toBe(false);
    await component['moveCard'](task, -1);
    expect(mockTasksSvc.update).not.toHaveBeenCalled();
  });

  it('should assign an unassigned task to the current user via takeTask', async () => {
    await runInit();
    const task = component['tasks']()[0]!;

    await component['takeTask'](task);

    expect(mockTasksSvc.update).toHaveBeenCalledWith('t1', { assigned_to: 'u1' });
    expect(component['tasks']()[0]?.assigned_to).toBe('u1');
    expect(mockAlerts.showSuccess).toHaveBeenCalled();
  });

  it('should revert the status and toast an error when the move fails', async () => {
    mockTasksSvc.update.mockRejectedValueOnce(new Error('nope'));
    await runInit();
    const task = component['tasks']()[0]!;

    await component['moveCard'](task, 1);

    expect(component['tasks']()[0]?.status).toBe('todo');
    expect(mockAlerts.showError).toHaveBeenCalled();
  });
});
