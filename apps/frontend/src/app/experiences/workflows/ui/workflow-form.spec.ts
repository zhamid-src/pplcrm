import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { FormsService } from '@experiences/forms/services/forms-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TeamsService } from '@experiences/teams/services/teams-service';
import { WorkflowFormComponent } from './workflow-form';
import { WorkflowsService } from '../services/workflows-service';
import { ShiftsService } from '../../shifts/services/shifts-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

// These tests drive component logic through its signals/methods (no template render) so they stay
// fast and don't need the deep DI of the query-builder / rich-email editor.
describe('WorkflowFormComponent', () => {
  let component: WorkflowFormComponent;
  let fixture: ComponentFixture<WorkflowFormComponent>;

  let mockWorkflowsSvc: any;
  let mockShiftsSvc: any;
  let mockTagsSvc: any;
  let mockFormsSvc: any;
  let mockListsSvc: any;
  let mockTeamsSvc: any;
  let mockAlertSvc: any;
  let mockActivitySvc: any;
  let mockDialogSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  const emptyList = { rows: [], count: 0 };

  beforeEach(() => {
    mockWorkflowsSvc = {
      getById: vi.fn().mockResolvedValue(null),
      getSteps: vi.fn().mockResolvedValue([]),
      getEnrollments: vi.fn().mockResolvedValue([]),
      getRuns: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue({ rows: [], summary: { total: 0, active: 0, runs30d: 0 } }),
      add: vi.fn().mockResolvedValue({ id: 'new-1' }),
      update: vi.fn().mockResolvedValue({ id: 'wf-1' }),
      delete: vi.fn().mockResolvedValue(true),
      saveSteps: vi.fn().mockResolvedValue(true),
      setStatus: vi.fn().mockResolvedValue({ success: true }),
      cancelEnrollment: vi.fn(),
      triggerRefresh: vi.fn(),
    };
    mockShiftsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockTagsSvc = { getAll: vi.fn().mockResolvedValue({ rows: [{ id: 't1', name: 'volunteer' }], count: 1 }) };
    mockFormsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockListsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockTeamsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };
    mockActivitySvc = { getActivities: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }) };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    mockActivatedRoute = { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } };
  });

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [WorkflowFormComponent],
      providers: [
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivityService, useValue: mockActivitySvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    })
      .overrideComponent(WorkflowFormComponent, {
        set: {
          providers: [
            { provide: WorkflowsService, useValue: mockWorkflowsSvc },
            { provide: ShiftsService, useValue: mockShiftsSvc },
            { provide: TagsService, useValue: mockTagsSvc },
            { provide: FormsService, useValue: mockFormsSvc },
            { provide: ListsService, useValue: mockListsSvc },
            { provide: TeamsService, useValue: mockTeamsSvc },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WorkflowFormComponent);
    component = fixture.componentInstance;
  }

  it('should start in new mode with the trigger picker showing', async () => {
    await createComponent();
    component.ngOnInit();
    expect(component['isNew']()).toBe(true);
    expect(component['triggerSelected']()).toBe(false);
    expect(mockWorkflowsSvc.getById).not.toHaveBeenCalled();
  });

  it('should select a trigger, default the name, seed a step, and reveal the sequence', async () => {
    await createComponent();
    component.ngOnInit();

    component['selectTrigger']('web_form_submitted');

    expect(component['triggerSelected']()).toBe(true);
    expect(component['payload']().trigger_type).toBe('web_form_submitted');
    expect(component['payload']().name).toBe('Form submitted automation');
    expect(component['steps']().length).toBe(1);
    expect(component['steps']()[0].kind).toBe('send_email');
  });

  it('should insert and remove steps at a given position', async () => {
    await createComponent();
    component.ngOnInit();
    component['selectTrigger']('manual');

    component['addStepAt'](0, 'wait');
    expect(component['steps']()[0].kind).toBe('wait');
    expect(component['steps']().length).toBe(2);

    component['removeStep'](0);
    expect(component['steps']()[0].kind).toBe('send_email');
    expect(component['steps']().length).toBe(1);
  });

  it('should map steps to the kind-aware save payload (dropping the client uid)', async () => {
    await createComponent();
    component.ngOnInit();
    component['selectTrigger']('tag_added');
    component['tags'].set([{ id: 't1', name: 'volunteer' }]);
    component['steps'].set([]);
    component['addStepAt'](0, 'add_tag');
    component['setStepTag'](0, 't1');

    const payload = component['toStepPayload']();
    expect(payload).toEqual([
      expect.objectContaining({ kind: 'add_tag', config: { tag_id: 't1', tag_name: 'volunteer' } }),
    ]);
    expect((payload[0] as Record<string, unknown>)['uid']).toBeUndefined();
  });

  it('should create the automation and its steps on save', async () => {
    await createComponent();
    component.ngOnInit();
    component['selectTrigger']('manual');
    component['payload'].update((p) => ({ ...p, name: 'Welcome series' }));

    await component['save']();

    expect(mockWorkflowsSvc.add).toHaveBeenCalled();
    expect(mockWorkflowsSvc.saveSteps).toHaveBeenCalledWith('new-1', expect.any(Array));
    expect(mockWorkflowsSvc.triggerRefresh).toHaveBeenCalled();
    expect(component['workflowId']()).toBe('new-1');
  });

  it('should load an existing automation, steps, enrollments and runs in edit mode', async () => {
    mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
    mockWorkflowsSvc.getById.mockResolvedValue({
      name: 'Volunteer follow-up',
      description: 'Say hi',
      trigger_type: 'web_form_submitted',
      trigger_event_id: null,
      status: 'active',
      conditions: null,
    });
    mockWorkflowsSvc.getSteps.mockResolvedValue([
      { kind: 'wait', config: null, delay_days: 2, delay_unit: 'days', subject: null },
    ]);
    mockWorkflowsSvc.getEnrollments.mockResolvedValue([{ id: 'enr-1', status: 'active', current_step_number: 1 }]);
    mockWorkflowsSvc.getRuns.mockResolvedValue([{ id: 'run-1', status: 'success' }]);

    await createComponent();
    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(component['isNew']()).toBe(false);
    expect(component['payload']().name).toBe('Volunteer follow-up');
    expect(component['steps']()[0].kind).toBe('wait');
    expect(component['enrollments']().length).toBe(1);
    expect(component['runs']().length).toBe(1);
  });
});
