import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskView } from './task-view';
import { AuthService } from '../../../auth/auth-service';
import { UserService } from '../../../services/user.service';
import { TasksService } from '@experiences/tasks/services/tasks-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TeamsService } from '../../teams/services/teams-service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TaskView', () => {
  let component: TaskView;
  let fixture: ComponentFixture<TaskView>;
  let mockAuth: any;
  let mockUserService: any;
  let mockTasks: any;
  let mockTeams: any;
  let mockDialogs: any;
  let mockAlert: any;

  beforeEach(async () => {
    mockAuth = {
      getUser: vi.fn().mockReturnValue({ id: 'u1' }),
    };

    mockUserService = {
      getUsers: vi.fn().mockResolvedValue([{ id: 'u1', first_name: 'User 1' }]),
      resolveAvatarUrl: vi.fn().mockReturnValue(null),
    };

    mockTasks = {
      getById: vi.fn().mockResolvedValue({
        id: 't1',
        name: 'Task 1',
        status: 'todo',
        priority: 'medium',
        assigned_to: 'u1',
        due_at: null,
        details: null,
      }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(true),
      triggerRefresh: vi.fn(),
      api: {
        tasks: {
          getComments: vi.fn().mockResolvedValue([]),
          getAttachments: vi.fn().mockResolvedValue([]),
          getSubtasks: vi.fn().mockResolvedValue([]),
        },
      },
    };

    mockTeams = {
      getAll: vi.fn().mockResolvedValue({ rows: [] }),
    };

    mockDialogs = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    mockAlert = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    const mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('t1'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [TaskView],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: UserService, useValue: mockUserService },
        { provide: TasksService, useValue: mockTasks },
        { provide: TeamsService, useValue: mockTeams },
        { provide: ConfirmDialogService, useValue: mockDialogs },
        { provide: AlertService, useValue: mockAlert },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskView);
    component = fixture.componentInstance;
  });

  it('should load task details on init', async () => {
    component.ngOnInit();
    await new Promise((r) => setTimeout(r, 10));

    expect(mockTasks.getById).toHaveBeenCalledWith('t1');
    expect(component['task']()).toBeDefined();
    expect(component['task']().id).toBe('t1');
  });

  it('should update task and trigger refresh', async () => {
    component.ngOnInit();
    await new Promise((r) => setTimeout(r, 10));

    await component['update']({ name: 'Updated Task Name' });

    expect(mockTasks.update).toHaveBeenCalledWith('t1', { name: 'Updated Task Name' });
    expect(mockTasks.triggerRefresh).toHaveBeenCalled();
    expect(mockAlert.showSuccess).toHaveBeenCalledWith('Task updated successfully');
  });

  it('should delete task and trigger refresh', async () => {
    component.ngOnInit();
    await new Promise((r) => setTimeout(r, 10));

    const mockRouter = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(mockRouter, 'navigate').mockResolvedValue(true);

    await component['deleteTask']();

    expect(mockDialogs.confirm).toHaveBeenCalled();
    expect(mockTasks.delete).toHaveBeenCalledWith('t1');
    expect(mockTasks.triggerRefresh).toHaveBeenCalled();
    expect(mockAlert.showSuccess).toHaveBeenCalledWith('Task deleted successfully');
    expect(navigateSpy).toHaveBeenCalledWith(['/tasks']);
  });
});
