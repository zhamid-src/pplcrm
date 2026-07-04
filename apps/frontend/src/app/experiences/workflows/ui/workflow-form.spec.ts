import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { FormsService } from '@experiences/forms/services/forms-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { WorkflowFormComponent } from './workflow-form';
import { WorkflowsService } from '../services/workflows-service';
import { PersonsService } from '../../persons/services/persons-service';
import { ShiftsService } from '../../shifts/services/shifts-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

describe('WorkflowFormComponent', () => {
  let component: WorkflowFormComponent;
  let fixture: ComponentFixture<WorkflowFormComponent>;

  let mockWorkflowsSvc: any;
  let mockPersonsSvc: any;
  let mockShiftsSvc: any;
  let mockTagsSvc: any;
  let mockFormsSvc: any;
  let mockListsSvc: any;
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
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      saveSteps: vi.fn().mockResolvedValue(true),
      enrollPerson: vi.fn(),
      cancelEnrollment: vi.fn(),
      triggerRefresh: vi.fn(),
    };
    mockPersonsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockShiftsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockTagsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockFormsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
    mockListsSvc = { getAll: vi.fn().mockResolvedValue(emptyList) };
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
        { provide: PersonsService, useValue: mockPersonsSvc },
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
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WorkflowFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  describe('initialization', () => {
    it('should start in new mode with an empty, invalid form when there is no id', async () => {
      await createComponent();

      expect(component['isNew']()).toBe(true);
      expect(component['workflowId']()).toBeNull();
      expect(component['triggerSelected']()).toBe(false);
      expect(mockWorkflowsSvc.getById).not.toHaveBeenCalled();
      expect(component['form']().invalid()).toBe(true);
    });

    it('should treat the "add" route param the same as no id', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('add');
      await createComponent();

      expect(component['isNew']()).toBe(true);
      expect(mockWorkflowsSvc.getById).not.toHaveBeenCalled();
    });

    it('should load an existing workflow, its steps, and enrollments in edit mode', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({
        name: 'Volunteer Welcome',
        description: 'Say hi',
        trigger_type: 'volunteer_signup',
        trigger_event_id: 'evt-1',
        status: 'active',
      });
      mockWorkflowsSvc.getSteps.mockResolvedValue([{ step_number: 1, subject: 'Hello' }]);
      mockWorkflowsSvc.getEnrollments.mockResolvedValue([{ id: 'enr-1' }]);

      await createComponent();

      expect(component['isNew']()).toBe(false);
      expect(component['workflowId']()).toBe('wf-1');
      expect(component['triggerSelected']()).toBe(true);
      expect(mockWorkflowsSvc.getById).toHaveBeenCalledWith('wf-1');
      expect(component['payload']()).toEqual({
        name: 'Volunteer Welcome',
        description: 'Say hi',
        trigger_type: 'volunteer_signup',
        trigger_event_id: 'evt-1',
        status: 'active',
      });
      expect(component['steps']()).toEqual([{ step_number: 1, subject: 'Hello' }]);
      expect(component['enrollments']()).toEqual([{ id: 'enr-1' }]);
    });
  });

  describe('form validation', () => {
    it('should be invalid when the workflow name is blank', async () => {
      await createComponent();
      component['payload'].update((p) => ({ ...p, name: '' }));

      expect(component['form']().invalid()).toBe(true);
    });

    it('should become valid once a name is provided', async () => {
      await createComponent();
      component['payload'].update((p) => ({ ...p, name: 'My Workflow' }));

      expect(component['form']().invalid()).toBe(false);
    });

    it('should block saveSettings from persisting an invalid (nameless) workflow', async () => {
      await createComponent();
      expect(component['form']().invalid()).toBe(true);

      await component['saveSettings']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Please enter a valid workflow name.');
      expect(mockWorkflowsSvc.add).not.toHaveBeenCalled();
      expect(mockWorkflowsSvc.saveSteps).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('should create a new workflow, save its steps, and navigate to the created record', async () => {
      await createComponent();
      component['payload'].set({
        name: 'New Automation',
        description: '',
        trigger_type: 'manual',
        trigger_event_id: '',
        status: 'draft',
      });
      component['steps'].set([{ step_number: 1, subject: 'Hi there' }]);
      mockWorkflowsSvc.add.mockResolvedValue({ id: 'new-wf-id' });

      await component['saveSettings']();

      expect(mockWorkflowsSvc.add).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Automation', trigger_event_id: null }),
      );
      expect(mockWorkflowsSvc.saveSteps).toHaveBeenCalledWith('new-wf-id', [{ step_number: 1, subject: 'Hi there' }]);
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Workflow created successfully!');
      expect(component['isNew']()).toBe(false);
      expect(component['workflowId']()).toBe('new-wf-id');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../', 'new-wf-id'], { relativeTo: mockActivatedRoute });
    });

    it('should update an existing workflow and its steps', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({
        name: 'Existing',
        trigger_type: 'manual',
        trigger_event_id: '',
        status: 'draft',
      });
      await createComponent();
      component['payload'].update((p) => ({ ...p, name: 'Existing Updated' }));
      component['steps'].set([{ step_number: 1, subject: 'Reminder' }]);

      await component['saveSettings']();

      expect(mockWorkflowsSvc.update).toHaveBeenCalledWith(
        'wf-1',
        expect.objectContaining({ name: 'Existing Updated' }),
      );
      expect(mockWorkflowsSvc.saveSteps).toHaveBeenCalledWith('wf-1', [{ step_number: 1, subject: 'Reminder' }]);
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Workflow saved successfully!');
    });

    it('should show an error alert when saving fails', async () => {
      await createComponent();
      component['payload'].update((p) => ({ ...p, name: 'Will Fail' }));
      mockWorkflowsSvc.add.mockRejectedValue(new Error('Server rejected'));

      await component['saveSettings']();

      expect(mockAlertSvc.showError).toHaveBeenCalledWith('Server rejected');
    });
  });

  describe('deleting', () => {
    it('should do nothing when there is no workflow id', async () => {
      await createComponent();
      await component['deleteWorkflow']();
      expect(mockDialogSvc.confirm).not.toHaveBeenCalled();
    });

    it('should delete the workflow after confirmation and navigate back to the list', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({ name: 'To Delete', trigger_type: 'manual', status: 'draft' });
      await createComponent();

      await component['deleteWorkflow']();

      expect(mockDialogSvc.confirm).toHaveBeenCalled();
      expect(mockWorkflowsSvc.delete).toHaveBeenCalledWith('wf-1');
      expect(mockWorkflowsSvc.triggerRefresh).toHaveBeenCalled();
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Workflow deleted');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/workflows']);
    });

    it('should not delete the workflow when confirmation is declined', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({ name: 'Keep Me', trigger_type: 'manual', status: 'draft' });
      mockDialogSvc.confirm.mockResolvedValue(false);
      await createComponent();

      await component['deleteWorkflow']();

      expect(mockWorkflowsSvc.delete).not.toHaveBeenCalled();
    });
  });

  describe('trigger selection', () => {
    it('should set the payload and seed a default step when a trigger is selected', async () => {
      await createComponent();

      component['selectTrigger']('volunteer_signup');

      expect(component['payload']().trigger_type).toBe('volunteer_signup');
      expect(component['payload']().name).toBe('Volunteer Signup Welcome Onboarding');
      expect(component['triggerSelected']()).toBe(true);
      expect(component['steps']()).toHaveLength(1);
      expect(component['steps']()[0].subject).toBe('Welcome to our organization!');
    });

    it('should format known trigger types into readable labels', async () => {
      await createComponent();

      expect(component['formatTriggerType']('volunteer_signup')).toBe('Volunteer Signup');
      expect(component['formatTriggerType']('list_joined')).toBe('List Joined');
      expect(component['formatTriggerType']('something_custom')).toBe('something_custom');
    });
  });

  describe('step designer', () => {
    it('should append a new step and select it', async () => {
      await createComponent();

      component['addStep']();

      expect(component['steps']()).toHaveLength(1);
      expect(component['selectedNodeType']()).toBe('step');
      expect(component['selectedNodeIndex']()).toBe(0);
    });

    it('should insert a step at a given index and re-number subsequent steps', async () => {
      await createComponent();
      component['steps'].set([
        { step_number: 1, subject: 'First' },
        { step_number: 2, subject: 'Second' },
      ]);

      component['addStepAt'](1);

      const steps = component['steps']();
      expect(steps).toHaveLength(3);
      expect(steps.map((s: { step_number: number }) => s.step_number)).toEqual([1, 2, 3]);
      expect(steps[1].subject).toBe('Follow-up message');
    });

    it('should remove a step and re-number the remaining ones', async () => {
      await createComponent();
      component['steps'].set([
        { step_number: 1, subject: 'First' },
        { step_number: 2, subject: 'Second' },
        { step_number: 3, subject: 'Third' },
      ]);
      component['selectedNodeIndex'].set(1);
      component['selectedNodeType'].set('step');

      component['removeStep'](1);

      const steps = component['steps']();
      expect(steps.map((s: { subject: string }) => s.subject)).toEqual(['First', 'Third']);
      expect(steps.map((s: { step_number: number }) => s.step_number)).toEqual([1, 2]);
      expect(component['selectedNodeType']()).toBe('settings');
      expect(component['selectedNodeIndex']()).toBeNull();
    });
  });

  describe('email designer modal', () => {
    it('should open and close the visual editor for a given step', async () => {
      await createComponent();
      component['steps'].set([{ step_number: 1, subject: 'Hi', html_content: '<p>Hi</p>', plain_text_content: 'Hi' }]);

      component['openEmailDesigner'](0);
      expect(component['editingEmailStepIndex']()).toBe(0);
      expect(component['getEditingHtml']()).toBe('<p>Hi</p>');
      expect(component['getEditingText']()).toBe('Hi');

      component['onStepHtmlChange']('<p>Updated</p>');
      expect(component['steps']()[0].html_content).toBe('<p>Updated</p>');

      component['closeEmailDesigner']();
      expect(component['editingEmailStepIndex']()).toBeNull();
      expect(component['getEditingHtml']()).toBe('');
    });
  });

  describe('manual enrollment', () => {
    it('should clear search results for a blank query without calling the API', async () => {
      await createComponent();
      component['searchResults'].set([{ id: 'p1' }]);

      await component['searchContacts']();

      expect(mockPersonsSvc.getAll).not.toHaveBeenCalled();
      expect(component['searchResults']()).toEqual([]);
    });

    it('should search contacts and populate results', async () => {
      await createComponent();
      component['searchQuery'].set('jane');
      mockPersonsSvc.getAll.mockResolvedValue({ rows: [{ id: 'p1', first_name: 'Jane' }], count: 1 });

      await component['searchContacts']();

      expect(mockPersonsSvc.getAll).toHaveBeenCalledWith({ searchStr: 'jane', limit: 10 });
      expect(component['searchResults']()).toEqual([{ id: 'p1', first_name: 'Jane' }]);
    });

    it('should enroll a selected contact and refresh enrollments', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({ name: 'Existing', trigger_type: 'manual', status: 'draft' });
      await createComponent();
      component['searchQuery'].set('jane');
      component['searchResults'].set([{ id: 'p1' }]);
      mockWorkflowsSvc.getEnrollments.mockResolvedValue([{ id: 'enr-1' }]);

      await component['enrollSelected']('p1');
      // loadEnrollments() is fired-and-forgotten (not awaited) after enrolling,
      // so give its internal await a chance to resolve before asserting.
      await fixture.whenStable();

      expect(mockWorkflowsSvc.enrollPerson).toHaveBeenCalledWith('wf-1', 'p1');
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Contact successfully enrolled in campaign.');
      expect(component['searchQuery']()).toBe('');
      expect(component['searchResults']()).toEqual([]);
      expect(component['enrollments']()).toEqual([{ id: 'enr-1' }]);
    });

    it('should cancel an enrollment after confirmation', async () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue('wf-1');
      mockWorkflowsSvc.getById.mockResolvedValue({ name: 'Existing', trigger_type: 'manual', status: 'draft' });
      await createComponent();

      await component['cancelEnrollment']('enr-1');

      expect(mockDialogSvc.confirm).toHaveBeenCalled();
      expect(mockWorkflowsSvc.cancelEnrollment).toHaveBeenCalledWith('enr-1');
      expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Enrollment cancelled.');
    });
  });

  describe('tabs', () => {
    it('should switch tabs and reset the step selection when leaving the steps tab', async () => {
      await createComponent();
      component['selectedNodeType'].set('step');
      component['selectedNodeIndex'].set(2);

      component['selectTab']('enrollments');

      expect(component['activeTab']()).toBe('enrollments');
      expect(component['selectedNodeType']()).toBe('settings');
      expect(component['selectedNodeIndex']()).toBeNull();
    });
  });
});
