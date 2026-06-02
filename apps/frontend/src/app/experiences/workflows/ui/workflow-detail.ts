import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { WorkflowsService } from '../services/workflows-service';
import { PersonsService } from '../../persons/services/persons-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { TRPCClientError } from '@trpc/client';
import { VisualNewsletterEditorComponent } from '../../newsletters/ui/visual-newsletter-editor';
import { VolunteerEventsFrontendService } from '../../volunteer/services/volunteer-events-frontend-service';

@Component({
  selector: 'pc-workflow-detail',
  imports: [RouterModule, FormsModule, FormField, Icon, RecordActivities, DatePipe, VisualNewsletterEditorComponent],
  templateUrl: './workflow-detail.html',
  providers: [WorkflowsService, VolunteerEventsFrontendService],
})
export class WorkflowDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflowsSvc = inject(WorkflowsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly alertSvc = inject(AlertService);
  private readonly volunteerEventsSvc = inject(VolunteerEventsFrontendService);

  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;

  protected readonly isNew = signal(true);
  protected readonly workflowId = signal<string | null>(null);
  protected readonly activeTab = signal<'steps' | 'enrollments' | 'activity'>('steps');

  // Trigger state and visual designer nodes selection
  protected readonly triggerSelected = signal(false);
  protected readonly selectedNodeType = signal<'trigger' | 'step' | 'settings'>('settings');
  protected readonly selectedNodeIndex = signal<number | null>(null);

  // Modal visual email designer state
  protected readonly editingEmailStepIndex = signal<number | null>(null);

  // Loaded volunteer events list
  protected readonly volunteerEvents = signal<any[]>([]);

  // Backing payload signal for workflow settings form
  protected readonly payload = signal<{
    name: string;
    description: string;
    trigger_type: 'volunteer_signup' | 'manual';
    trigger_event_id: string;
    status: 'active' | 'draft' | 'paused';
  }>({
    name: '',
    description: '',
    trigger_type: 'manual',
    trigger_event_id: '',
    status: 'draft',
  });

  // Signal-based form
  protected readonly form = form(this.payload, (p) => {
    required(p.name);
  });

  // Computed signal to resolve the name of the selected event
  protected readonly selectedEventName = computed(() => {
    const eventId = this.payload().trigger_event_id;
    if (!eventId || this.payload().trigger_type !== 'volunteer_signup') return null;
    const event = this.volunteerEvents().find((e) => String(e.id) === String(eventId));
    return event ? event.name : 'Unknown Event';
  });

  // Steps signal
  protected readonly steps = signal<any[]>([]);
  // Enrollments signal
  protected readonly enrollments = signal<any[]>([]);

  // Search contacts for manual enrollment
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<any[]>([]);
  protected readonly searchingContacts = signal(false);

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    void this.loadVolunteerEvents();
    if (id && id !== 'add') {
      this.isNew.set(false);
      this.workflowId.set(id);
      this.triggerSelected.set(true);
      this.activeTab.set('steps');
      void this.loadWorkflowDetails();
      void this.loadSteps();
      void this.loadEnrollments();
    } else {
      this.isNew.set(true);
      this.triggerSelected.set(false);
    }
  }

  private async loadVolunteerEvents(): Promise<void> {
    try {
      const res = await this.volunteerEventsSvc.getAll({ limit: 1000 });
      this.volunteerEvents.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to load volunteer events', err);
    }
  }

  // --- TAB MANAGEMENT ---
  protected selectTab(tab: 'steps' | 'enrollments' | 'activity'): void {
    this.activeTab.set(tab);
    if (tab !== 'steps') {
      this.selectedNodeType.set('settings');
      this.selectedNodeIndex.set(null);
    }
  }

  // --- TRIGGER SELECTION ---
  protected selectTrigger(type: 'volunteer_signup' | 'manual'): void {
    this.payload.update((p) => ({
      ...p,
      trigger_type: type,
      trigger_event_id: '',
      name: type === 'volunteer_signup' ? 'Volunteer Signup Welcome Onboarding' : 'Constituent Re-engagement Campaign',
      description:
        type === 'volunteer_signup'
          ? 'Automated welcoming sequence sent to volunteer signups.'
          : 'Custom multi-step communication sequence.',
    }));

    // Initialize with 1 default step
    this.steps.set([
      {
        step_number: 1,
        delay_days: 1,
        delay_unit: 'days',
        subject: type === 'volunteer_signup' ? 'Welcome to our organization!' : 'Hello from the team!',
        preview_text: 'Thank you for connecting with us',
        html_content: '<p>Hi there,</p><p>We are thrilled to have you! We will reach out shortly.</p>',
        plain_text_content: 'Hi there,\n\nWe are thrilled to have you! We will reach out shortly.',
      },
    ]);

    this.triggerSelected.set(true);
    this.selectedNodeType.set('settings');
  }

  // --- LOAD DATA ---
  private async loadWorkflowDetails(): Promise<void> {
    const id = this.workflowId();
    if (!id) return;
    const end = this._loading.begin();
    try {
      const record = await this.workflowsSvc.getById(id);
      if (record) {
        this.payload.set({
          name: record.name || '',
          description: record.description || '',
          trigger_type: record.trigger_type || 'manual',
          trigger_event_id: record.trigger_event_id || '',
          status: record.status || 'draft',
        });
      }
    } catch (err) {
      console.error('Failed to load workflow details', err);
      this.alertSvc.showError('Failed to load workflow details.');
    } finally {
      end();
    }
  }

  private async loadSteps(): Promise<void> {
    const id = this.workflowId();
    if (!id) return;
    try {
      const records = await this.workflowsSvc.getSteps(id);
      this.steps.set(records || []);
    } catch (err) {
      console.error('Failed to load workflow steps', err);
    }
  }

  private async loadEnrollments(): Promise<void> {
    const id = this.workflowId();
    if (!id) return;
    try {
      const records = await this.workflowsSvc.getEnrollments(id);
      this.enrollments.set(records || []);
    } catch (err) {
      console.error('Failed to load enrollments', err);
    }
  }

  // --- SAVE WORKFLOW SETTINGS & SEQUENCE ---
  protected async saveSettings(event?: Event): Promise<void> {
    if (event instanceof Event) {
      event.preventDefault();
    }

    this.form().markAsTouched();
    if (!this.form().valid) {
      this.alertSvc.showError('Please enter a valid workflow name.');
      return;
    }

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const raw = this.payload();
          const data = {
            ...raw,
            trigger_event_id: raw.trigger_event_id && raw.trigger_event_id !== '' ? raw.trigger_event_id : null,
          };
          if (this.isNew()) {
            // 1. Create Workflow Settings
            const result = await this.workflowsSvc.add(data);
            const newId = String(result.id);
            this.workflowId.set(newId);
            this.isNew.set(false);

            // 2. Save current steps as well
            await this.workflowsSvc.saveSteps(newId, this.steps());

            this.alertSvc.showSuccess('Workflow created successfully!');
            void this.router.navigate(['../', newId], { relativeTo: this.route });
          } else {
            const id = this.workflowId();
            if (id) {
              // Update settings
              await this.workflowsSvc.update(id, data);
              // Save steps
              await this.workflowsSvc.saveSteps(id, this.steps());
            }

            this.alertSvc.showSuccess('Workflow saved successfully!');
            void this.loadWorkflowDetails();
            void this.loadSteps();
          }
        } catch (err: unknown) {
          if (err instanceof TRPCClientError) {
            this.alertSvc.showError(err.message);
          } else {
            this.alertSvc.showError('An error occurred while saving the workflow.');
          }
        } finally {
          end();
        }
        return null;
      },
    });
  }

  // --- STEP DESIGNER ACTIONS ---
  protected addStepAt(index: number): void {
    const current = [...this.steps()];
    const newStep = {
      step_number: index + 1,
      delay_days: index === 0 ? 1 : 2,
      delay_unit: 'days',
      subject: 'Follow-up message',
      preview_text: '',
      html_content: '<p>Hi there,</p><p>We wanted to touch base again...</p>',
      plain_text_content: 'Hi there,\n\nWe wanted to touch base again...',
    };
    current.splice(index, 0, newStep);

    // Reorder/Re-index step numbers
    const updated = current.map((step, idx) => ({
      ...step,
      step_number: idx + 1,
    }));
    this.steps.set(updated);

    // Auto-select new step properties in sidebar
    this.selectedNodeType.set('step');
    this.selectedNodeIndex.set(index);
  }

  protected addStep(): void {
    this.addStepAt(this.steps().length);
  }

  protected removeStep(index: number): void {
    const current = this.steps();
    const updated = current
      .filter((_, idx) => idx !== index)
      .map((step, idx) => ({
        ...step,
        step_number: idx + 1,
      }));
    this.steps.set(updated);

    // Clear selection if deleted step was selected
    if (this.selectedNodeIndex() === index) {
      this.selectedNodeType.set('settings');
      this.selectedNodeIndex.set(null);
    } else {
      const selectedIndex = this.selectedNodeIndex();
      if (selectedIndex !== null && selectedIndex > index) {
        this.selectedNodeIndex.set(selectedIndex - 1);
      }
    }
  }

  // --- EMAIL DESIGNER MODAL METHODS ---
  protected openEmailDesigner(idx: number): void {
    this.editingEmailStepIndex.set(idx);
  }

  protected closeEmailDesigner(): void {
    this.editingEmailStepIndex.set(null);
  }

  protected getEditingHtml(): string {
    const idx = this.editingEmailStepIndex();
    if (idx === null) return '';
    return this.steps()[idx]?.html_content || '';
  }

  protected getEditingText(): string {
    const idx = this.editingEmailStepIndex();
    if (idx === null) return '';
    return this.steps()[idx]?.plain_text_content || '';
  }

  protected onStepHtmlChange(html: string): void {
    const idx = this.editingEmailStepIndex();
    if (idx === null) return;
    const current = [...this.steps()];
    current[idx] = {
      ...current[idx],
      html_content: html,
    };
    this.steps.set(current);
  }

  protected onStepTextChange(text: string): void {
    const idx = this.editingEmailStepIndex();
    if (idx === null) return;
    const current = [...this.steps()];
    current[idx] = {
      ...current[idx],
      plain_text_content: text,
    };
    this.steps.set(current);
  }

  // --- MANUAL ENROLLMENT METHODS ---
  protected async searchContacts(): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }
    this.searchingContacts.set(true);
    try {
      const res = await this.personsSvc.getAll({ searchStr: query, limit: 10 });
      this.searchResults.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to search contacts', err);
      this.alertSvc.showError('Failed to search contacts.');
    } finally {
      this.searchingContacts.set(false);
    }
  }

  protected async enrollSelected(personId: string): Promise<void> {
    const wfId = this.workflowId();
    if (!wfId) return;
    const end = this._loading.begin();
    try {
      await this.workflowsSvc.enrollPerson(wfId, personId);
      this.alertSvc.showSuccess('Contact successfully enrolled in campaign.');
      this.searchQuery.set('');
      this.searchResults.set([]);
      void this.loadEnrollments();
    } catch (err: any) {
      console.error('Enrollment failed', err);
      this.alertSvc.showError(err.message || 'Failed to enroll contact.');
    } finally {
      end();
    }
  }

  protected async cancelEnrollment(enrollmentId: string): Promise<void> {
    const confirmCancel = confirm(
      'Are you sure you want to cancel this enrollment? This stops any future emails in this sequence.',
    );
    if (!confirmCancel) return;

    const end = this._loading.begin();
    try {
      await this.workflowsSvc.cancelEnrollment(enrollmentId);
      this.alertSvc.showSuccess('Enrollment cancelled.');
      void this.loadEnrollments();
    } catch (err) {
      console.error('Cancellation failed', err);
      this.alertSvc.showError('Failed to cancel enrollment.');
    } finally {
      end();
    }
  }

  protected formatTriggerType(trigger: string): string {
    if (trigger === 'volunteer_signup') return 'Volunteer Signup';
    if (trigger === 'manual') return 'Manual Enrollment';
    return trigger;
  }
}
