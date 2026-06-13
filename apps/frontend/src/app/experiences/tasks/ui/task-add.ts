import { Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { IAuthUser, AddTaskObj } from '@common';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';

import { AuthService } from '../../../auth/auth-service';
import { TasksService } from '../services/tasks-service';
import { TeamsService } from '../../teams/services/teams-service';

@Component({
  selector: 'pc-task-add',
  imports: [FormField, Icon, AddBtnRow],
  template: `
    <section
      class="max-w-2xl mx-auto my-8 p-8 bg-base-100 rounded-3xl border border-base-200 shadow-xl space-y-6 transition-all duration-300 hover:shadow-2xl"
    >
      <div class="flex items-center justify-between border-b border-base-200/60 pb-5">
        <div>
          <h1 class="text-2xl font-bold text-primary flex items-center gap-3">
            <span class="p-2 bg-primary/10 rounded-xl">
              <pc-icon name="plus" class="text-primary"></pc-icon>
            </span>
            Create New Task
          </h1>
          <p class="text-sm text-neutral-400 mt-2">Add a new task to assign, track priority, status, and deadlines.</p>
        </div>
        <pc-add-btn-row
          [isLoading]="submitting()"
          [signalForm]="form"
          (btn1Clicked)="submit($event)"
          [buttonsToShow]="'two'"
          [btn1Text]="'Create Task'"
          [btn1Icon]="'save'"
        ></pc-add-btn-row>
      </div>

      <form class="space-y-6" (submit)="submit($event)" novalidate>
        <!-- Task Name -->
        <div class="form-control w-full">
          <label class="label font-semibold text-sm" for="name">
            <span class="label-text">Task Name <span class="text-error">*</span></span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter task name..."
            class="input input-bordered w-full focus:input-primary transition-all duration-200"
            [formField]="form.name"
            [class.input-error]="form.name().invalid() && (form.name().dirty() || form.name().touched())"
            autofocus
          />
          @if (form.name().invalid() && (form.name().dirty() || form.name().touched())) {
            @for (err of form.name().errors(); track err) {
              <p class="text-xs text-error mt-1.5 font-medium flex items-center gap-1">
                <pc-icon name="x-mark" [size]="3"></pc-icon>
                {{ err.message }}
              </p>
            }
          }
        </div>

        <!-- Details / Description -->
        <div class="form-control w-full">
          <label class="label font-semibold text-sm" for="details">
            <span class="label-text">Description / Details</span>
          </label>
          <textarea
            id="details"
            placeholder="Describe the task details, requirements, or instructions..."
            class="textarea textarea-bordered h-32 w-full focus:textarea-primary transition-all duration-200 resize-y"
            [formField]="form.details"
            [class.textarea-error]="form.details().invalid() && (form.details().dirty() || form.details().touched())"
          ></textarea>
          @if (form.details().invalid() && (form.details().dirty() || form.details().touched())) {
            @for (err of form.details().errors(); track err) {
              <p class="text-xs text-error mt-1.5 font-medium flex items-center gap-1">
                <pc-icon name="x-mark" [size]="3"></pc-icon>
                {{ err.message }}
              </p>
            }
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Status -->
          <div class="form-control w-full">
            <label class="label font-semibold text-sm" for="status">
              <span class="label-text">Status</span>
            </label>
            <select
              id="status"
              class="select select-bordered w-full focus:select-primary transition-all duration-200"
              [formField]="form.status"
            >
              @for (s of statuses; track s) {
                <option [value]="s">{{ toTitleCase(s) }}</option>
              }
            </select>
          </div>

          <!-- Priority -->
          <div class="form-control w-full">
            <label class="label font-semibold text-sm" for="priority">
              <span class="label-text">Priority</span>
            </label>
            <select
              id="priority"
              class="select select-bordered w-full focus:select-primary transition-all duration-200"
              [formField]="form.priority"
            >
              @for (p of priorities; track p) {
                <option [value]="p">{{ toTitleCase(p) }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Due Date -->
          <div class="form-control w-full">
            <label class="label font-semibold text-sm" for="due_at">
              <span class="label-text">Due Date</span>
            </label>
            <input
              id="due_at"
              type="date"
              class="input input-bordered w-full focus:input-primary transition-all duration-200"
              [formField]="form.due_at"
              [class.input-error]="form.due_at().invalid() && (form.due_at().dirty() || form.due_at().touched())"
            />
            @if (form.due_at().invalid() && (form.due_at().dirty() || form.due_at().touched())) {
              @for (err of form.due_at().errors(); track err) {
                <p class="text-xs text-error mt-1.5 font-medium flex items-center gap-1">
                  <pc-icon name="x-mark" [size]="3"></pc-icon>
                  {{ err.message }}
                </p>
              }
            }
          </div>

          <!-- Assigned To -->
          <div class="form-control w-full">
            <label class="label font-semibold text-sm" for="assigned_to">
              <span class="label-text">Assignee</span>
            </label>
            <select
              id="assigned_to"
              class="select select-bordered w-full focus:select-primary transition-all duration-200"
              [formField]="form.assigned_to"
            >
              <option value="">Unassigned</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.first_name }} {{ u.last_name || '' }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <!-- Associated Team -->
          <div class="form-control w-full">
            <label class="label font-semibold text-sm" for="team_id">
              <span class="label-text">Associated Team</span>
            </label>
            <select
              id="team_id"
              class="select select-bordered w-full focus:select-primary transition-all duration-200"
              [formField]="form.team_id"
            >
              <option value="">No Team</option>
              @for (t of teamsList(); track t.id) {
                <option [value]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error py-3 text-sm text-error-content rounded-xl flex items-center gap-2">
            <pc-icon name="exclamation-triangle" [size]="4"></pc-icon>
            <span>{{ error() }}</span>
          </div>
        }
      </form>
    </section>
  `,
})
export class TaskAddComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(TasksService);
  private readonly auth = inject(AuthService);
  private readonly teams = inject(TeamsService);

  private _loading = createLoadingGate();

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly isLoading = this._loading.visible;

  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly teamsList = signal<any[]>([]);

  // Autocomplete lists for status and priority
  protected readonly priorities = ['low', 'medium', 'high', 'urgent'];
  protected readonly statuses = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];

  protected readonly payload = signal({
    name: '',
    details: '',
    status: 'todo' as 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled' | 'archived',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_at: '',
    assigned_to: '',
    team_id: '',
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddTaskObj);
  });

  public async ngOnInit() {
    const end = this._loading.begin();
    try {
      const [us, ts] = await Promise.all([this.auth.getUsers(), this.teams.getAll({ limit: 1000 })]);
      this.users.set(us || []);
      this.teamsList.set(ts?.rows ?? []);

      const queryTeamId = this.route.snapshot.queryParamMap.get('team_id');
      if (queryTeamId) {
        this.payload.update((p) => ({
          ...p,
          team_id: queryTeamId,
        }));
      }

      const state = window.history.state;
      if (state && state.cloneData) {
        const data = state.cloneData;
        this.payload.set({
          name: data.name ? `${data.name} (Copy)` : '',
          details: data.details || '',
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          due_at: data.due_at ? new Date(data.due_at).toISOString().split('T')[0] : '',
          assigned_to: data.assigned_to ? String(data.assigned_to) : '',
          team_id: data.team_id ? String(data.team_id) : '',
        });
      }
    } catch (err) {
      this.alertSvc.showError('Failed to load teammates or teams list: ' + String(err));
    } finally {
      end();
    }
  }

  protected cancel() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected async submit(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const end = this._loading.begin();

    try {
      const taskData = this.toPayload();
      await this.tasks.add(taskData);
      this.tasks.triggerRefresh();
      this.alertSvc.showSuccess('Task created successfully');
      if (typeof done === 'function') {
        done();
      } else {
        await this.router.navigate(['../'], { relativeTo: this.route });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create task';
      this.error.set(msg);
      this.alertSvc.showError(msg);
    } finally {
      this.submitting.set(false);
      end();
    }
  }

  private toPayload() {
    const raw = this.payload();
    return {
      name: raw.name.trim(),
      details: raw.details.trim() || undefined,
      status: raw.status as any,
      priority: raw.priority as any,
      due_at: raw.due_at ? new Date(raw.due_at) : undefined,
      assigned_to: raw.assigned_to ? String(raw.assigned_to) : null,
      team_id: raw.team_id ? String(raw.team_id) : null,
    };
  }

  protected toTitleCase(s: string): string {
    if (!s) return '';
    return s
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
