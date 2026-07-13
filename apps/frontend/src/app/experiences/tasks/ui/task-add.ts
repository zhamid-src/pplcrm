import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IAuthUser,
  AddTaskObj,
  TASK_BOARD_STATUSES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from '../../../../../../../libs/common/src';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';

import { UserService } from '../../../services/user.service';
import { TasksService } from '../services/tasks-service';
import { TeamsService } from '../../teams/services/teams-service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

/** The three due quick-picks the New task dialog offers (spec §4) — no freeform date. */
type DueQuickPick = 'today' | 'tomorrow' | 'next_week' | null;

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
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private _loading = createLoadingGate();

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly isLoading = this._loading.visible;

  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly teamsList = signal<any[]>([]);

  // Autocomplete lists for priority and (advanced) status
  protected readonly priorities = ['low', 'medium', 'high', 'urgent'];
  protected readonly statuses = TASK_BOARD_STATUSES;
  protected readonly statusLabels = TASK_STATUS_LABELS;

  /** Which of the three due quick-picks is selected — null means no due date. */
  protected readonly duePick = signal<DueQuickPick>(null);

  protected readonly payload = signal({
    name: '',
    details: '',
    status: 'todo' as (typeof TASK_STATUSES)[number],
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

  /** Today / Tomorrow / Next week (spec §4) — the only due-date choices in this dialog. */
  protected pickDue(pick: Exclude<DueQuickPick, null>): void {
    const next = this.duePick() === pick ? null : pick;
    this.duePick.set(next);
    this.payload.update((p) => ({ ...p, due_at: next ? this.dueDateFor(next) : '' }));
  }

  private dueDateFor(pick: Exclude<DueQuickPick, null>): string {
    const days = pick === 'today' ? 0 : pick === 'tomorrow' ? 1 : 7;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0] ?? '';
  }

  protected async submit(done?: (() => void) | Event) {
    if (done instanceof Event) {
      done.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      // Guide, don't error (§3): focus the first problem instead of a dead button.
      this.nameInput()?.nativeElement.focus();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const end = this._loading.begin();

    try {
      const taskData = this.toPayload();
      const created = await this.tasks.add(taskData);
      this.tasks.triggerRefresh();
      this.alertSvc.showSuccess(this.createdToastMessage(taskData));
      if (typeof done === 'function') {
        done();
      } else {
        // New card lands in To do with a flash (spec §4) — the list picks this up on init.
        await this.router.navigate(['../'], { relativeTo: this.route, state: { flashId: created?.id } });
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

  /** "Task created — "{title}" assigned to {name} / waiting for an owner, due today." (spec §4) */
  private createdToastMessage(taskData: ReturnType<typeof this.toPayload>): string {
    const assigneePart = taskData.assigned_to
      ? `assigned to ${this.userName(taskData.assigned_to)}`
      : 'waiting for an owner';
    const duePick = this.duePick();
    const duePart =
      duePick === 'today'
        ? ', due today'
        : duePick === 'tomorrow'
          ? ', due tomorrow'
          : duePick === 'next_week'
            ? ', due next week'
            : '';
    return `Task created: "${taskData.name}" ${assigneePart}${duePart}.`;
  }

  private userName(id: string): string {
    const u = this.users().find((x) => String(x.id) === id);
    return u ? `${u.first_name} ${u.last_name || ''}`.trim() : 'them';
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
