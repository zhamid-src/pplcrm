import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormField, form, validateStandardSchema, submit } from '@angular/forms/signals';
import { AddWorkflowObj } from '@common';
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
import { TagsService } from '@experiences/tags/services/tags-service';
import { FormsService } from '@experiences/forms/services/forms-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';

@Component({
  selector: 'pc-workflow-detail',
  imports: [RouterModule, FormsModule, FormField, Icon, RecordActivities, DatePipe, VisualNewsletterEditorComponent, AddBtnRow],
  templateUrl: './workflow-detail.html',
  providers: [WorkflowsService, VolunteerEventsFrontendService, TagsService, FormsService, ListsService],
})
export class WorkflowDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflowsSvc = inject(WorkflowsService);
  private readonly personsSvc = inject(PersonsService);
  private readonly alertSvc = inject(AlertService);
  private readonly volunteerEventsSvc = inject(VolunteerEventsFrontendService);
  private readonly tagsSvc = inject(TagsService);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);

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
  // Loaded tags, forms, and static lists
  protected readonly tags = signal<any[]>([]);
  protected readonly webForms = signal<any[]>([]);
  protected readonly lists = signal<any[]>([]);

  // Backing payload signal for workflow settings form
  protected readonly payload = signal<{
    name: string;
    description: string;
    trigger_type:
      | 'volunteer_signup'
      | 'manual'
      | 'tag_added'
      | 'web_form_submitted'
      | 'volunteer_shift_status'
      | 'contact_created'
      | 'list_joined'
      | 'payment_event'
      | 'new_subscriber'
      | 'new_unsubscriber';
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
    validateStandardSchema(p, AddWorkflowObj);
  });

  // Computed signal to resolve the name of the selected event
  protected readonly selectedEventName = computed(() => {
    const eventId = this.payload().trigger_event_id;
    if (!eventId) return null;
    const type = this.payload().trigger_type;
    if (type === 'volunteer_signup') {
      const event = this.volunteerEvents().find((e) => String(e.id) === String(eventId));
      return event ? event.name : 'Unknown Event';
    }
    if (type === 'tag_added') {
      const tag = this.tags().find((t) => String(t.id) === String(eventId));
      return tag ? tag.name : 'Unknown Tag';
    }
    if (type === 'web_form_submitted') {
      const formEl = this.webForms().find((f) => String(f.id) === String(eventId));
      return formEl ? formEl.name : 'Unknown Web Form';
    }
    if (type === 'list_joined') {
      const listEl = this.lists().find((l) => String(l.id) === String(eventId));
      return listEl ? listEl.name : 'Unknown List';
    }
    if (type === 'volunteer_shift_status') {
      if (eventId === 'attended') return 'Attended';
      if (eventId === 'no_show') return 'No Show';
      if (eventId === 'cancelled') return 'Cancelled';
      return eventId;
    }
    return null;
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
    void this.loadTags();
    void this.loadWebForms();
    void this.loadLists();
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

  private async loadTags(): Promise<void> {
    try {
      const res = await this.tagsSvc.getAll({ limit: 1000 });
      this.tags.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to load tags', err);
    }
  }

  private async loadWebForms(): Promise<void> {
    try {
      const res = await this.formsSvc.getAll({ limit: 1000 });
      this.webForms.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to load web forms', err);
    }
  }

  private async loadLists(): Promise<void> {
    try {
      const res = await this.listsSvc.getAll({ limit: 1000 });
      this.lists.set(res?.rows || []);
    } catch (err) {
      console.error('Failed to load lists', err);
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
  protected selectTrigger(
    type:
      | 'volunteer_signup'
      | 'manual'
      | 'tag_added'
      | 'web_form_submitted'
      | 'volunteer_shift_status'
      | 'contact_created'
      | 'list_joined'
      | 'payment_event'
      | 'new_subscriber'
      | 'new_unsubscriber',
  ): void {
    let name = 'New Workflow Campaign';
    let description = 'Custom multi-step communication sequence.';

    switch (type) {
      case 'volunteer_signup':
        name = 'Volunteer Signup Welcome Onboarding';
        description = 'Automated welcoming sequence sent to volunteer signups.';
        break;
      case 'tag_added':
        name = 'Tag Assigned Campaign';
        description = 'Automated campaign triggered when a specific tag is added to a constituent.';
        break;
      case 'web_form_submitted':
        name = 'Web Form Submission Response';
        description = 'Runs automatically after a contact submits a public web form.';
        break;
      case 'volunteer_shift_status':
        name = 'Volunteer Shift Follow-up';
        description = 'Triggered when a volunteer shift status is updated.';
        break;
      case 'contact_created':
        name = 'New Constituent Welcome Series';
        description = 'Welcoming sequence triggered when any new person is added to the database.';
        break;
      case 'list_joined':
        name = 'List Joined Campaign';
        description = 'Triggered when a constituent is added to a static list.';
        break;
      case 'payment_event':
        name = 'Stripe Billing Event Campaign';
        description = 'Runs in response to payment events like invoice payment status updates.';
        break;
      case 'new_subscriber':
        name = 'New Subscriber Onboarding';
        description = 'Welcomes new subscribers to the newsletter list.';
        break;
      case 'new_unsubscriber':
        name = 'Unsubscribe Confirmation Campaign';
        description = 'Triggered when a contact is marked unsubscribed.';
        break;
      case 'manual':
        name = 'Constituent Re-engagement Campaign';
        description = 'Custom multi-step communication sequence.';
        break;
    }

    this.payload.update((p) => ({
      ...p,
      trigger_type: type,
      trigger_event_id: '',
      name,
      description,
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

  protected async deleteWorkflow() {
    const id = this.workflowId();
    if (!id) return;
    const confirmed = confirm('Delete this workflow?');
    if (!confirmed) return;
    const end = this._loading.begin();
    try {
      await this.workflowsSvc.delete(id);
      this.workflowsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Workflow deleted');
      await this.router.navigate(['/workflows']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete workflow';
      this.alertSvc.showError(message);
    } finally {
      end();
    }
  }

  // --- SAVE WORKFLOW SETTINGS & SEQUENCE ---
  protected async saveSettings(done?: (() => void) | Event): Promise<void> {
    if (done instanceof Event) {
      done.preventDefault();
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
            if (typeof done === 'function') {
              done();
            } else {
              void this.router.navigate(['../', newId], { relativeTo: this.route });
            }
          } else {
            const id = this.workflowId();
            if (id) {
              // Update settings
              await this.workflowsSvc.update(id, data);
              // Save steps
              await this.workflowsSvc.saveSteps(id, this.steps());
            }

            this.alertSvc.showSuccess('Workflow saved successfully!');
            if (typeof done === 'function') {
              done();
            } else {
              void this.loadWorkflowDetails();
              void this.loadSteps();
            }
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
    if (trigger === 'tag_added') return 'Tag Added';
    if (trigger === 'web_form_submitted') return 'Web Form Submitted';
    if (trigger === 'volunteer_shift_status') return 'Volunteer Shift Status';
    if (trigger === 'contact_created') return 'New Contact Created';
    if (trigger === 'list_joined') return 'List Joined';
    if (trigger === 'payment_event') return 'Billing / Payment Event';
    if (trigger === 'new_subscriber') return 'New Subscriber';
    if (trigger === 'new_unsubscriber') return 'New Unsubscriber';
    return trigger;
  }
}
