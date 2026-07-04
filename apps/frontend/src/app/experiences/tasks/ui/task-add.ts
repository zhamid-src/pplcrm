import { Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { IAuthUser, AddTaskObj } from '../../../../../../../libs/common/src';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';

import { UserService } from '../../../services/user.service';
import { TasksService } from '../services/tasks-service';
import { TeamsService } from '../../teams/services/teams-service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

@Component({
  selector: 'pc-task-add',
  imports: [FormField, Icon, FormActions],
  templateUrl: './task-add.html',
})
export class TaskAddComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(TasksService);
  private readonly userService = inject(UserService);
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

  public ngOnInit(): void {
    void this.loadOnInit();
  }

  private async loadOnInit(): Promise<void> {
    const end = this._loading.begin();
    try {
      const [us, ts] = await Promise.all([this.userService.getUsers(), this.teams.getAll({ limit: 1000 })]);
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
          due_at: data.due_at ? new Date(data.due_at).toISOString().split('T')[0]! : '',
          assigned_to: data.assigned_to ? String(data.assigned_to) : '',
          team_id: data.team_id ? String(data.team_id) : '',
        });
      }
    } catch (err) {
      this.alertSvc.showError(getUserErrorMessage(err, 'Could not load teammates and teams. Please try again.'));
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
