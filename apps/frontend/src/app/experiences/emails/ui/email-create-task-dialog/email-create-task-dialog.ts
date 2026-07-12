import { Component, inject, input, signal, viewChild } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';
import { createLoadingGate } from '@uxcommon/loading-gate';

import {
  AddTaskObj,
  TASK_BOARD_STATUSES,
  TASK_STATUS_LABELS,
  TaskBoardStatus,
} from '../../../../../../../../libs/common/src';
import type { IAuthUser } from '../../../../../../../../libs/common/src/lib/auth';
import type { EmailType } from '../../../../../../../../libs/common/src/lib/models';
import { UserService } from '../../../../services/user.service';
import { TeamsService } from '../../../teams/services/teams-service';
import { TasksService } from '../../../tasks/services/tasks-service';

@Component({
  selector: 'pc-email-create-task-dialog',
  imports: [FormField, Icon, ModalShell],
  templateUrl: './email-create-task-dialog.html',
})
export class EmailCreateTaskDialog {
  private readonly alertSvc = inject(AlertService);
  private readonly tasksSvc = inject(TasksService);
  private readonly userService = inject(UserService);
  private readonly teamsSvc = inject(TeamsService);

  private readonly _loading = createLoadingGate();
  private readonly dlgRef = viewChild.required<ModalShell>('dlg');

  public readonly email = input.required<EmailType>();

  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly teamsList = signal<any[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isLoading = this._loading.visible;

  protected readonly priorities = ['low', 'medium', 'high', 'urgent'];
  protected readonly statuses = TASK_BOARD_STATUSES;
  protected readonly statusLabels = TASK_STATUS_LABELS;

  protected readonly payload = signal({
    name: '',
    details: '',
    status: 'todo' as TaskBoardStatus,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_at: '',
    assigned_to: '',
    team_id: '',
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddTaskObj);
  });

  public async open() {
    const em = this.email();

    const date = em.date_sent ? new Date(em.date_sent) : new Date(em.updated_at);
    const datePart = date.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const fromPart = em.from_name ? `${em.from_name} &lt;${em.from_email}&gt;` : (em.from_email ?? '');
    const subject = em.subject ?? '(no subject)';
    const url = `/inbox?email=${encodeURIComponent(em.id)}`;
    const details =
      `<p><a href="${url}">View email thread: ${subject}</a></p>` +
      `<p>From: ${fromPart}<br>Date: ${datePart}<br>Subject: ${subject}</p>`;

    this.payload.set({
      // Prefill a sensible title so the task reads as a follow-up on this thread (§3).
      name: `Follow up: ${subject}`,
      details,
      status: 'todo',
      priority: 'medium',
      due_at: '',
      assigned_to: '',
      team_id: '',
    });
    this.error.set(null);

    if (!this.users().length || !this.teamsList().length) {
      const end = this._loading.begin();
      try {
        const [us, ts] = await Promise.all([this.userService.getUsers(), this.teamsSvc.getAll({ limit: 1000 })]);
        this.users.set(us ?? []);
        this.teamsList.set(ts?.rows ?? []);
      } catch {
        // non-critical; proceed without users/teams
      } finally {
        end();
      }
    }

    this.dlgRef().show();
  }

  public close() {
    this.dlgRef().close();
  }

  protected async submit() {
    this.form().markAsTouched();
    if (this.form().invalid()) return;

    this.submitting.set(true);
    this.error.set(null);
    const end = this._loading.begin();

    try {
      const raw = this.payload();
      const name = raw.name.trim();
      await this.tasksSvc.add({
        name,
        details: raw.details.trim() || undefined,
        status: raw.status as any,
        priority: raw.priority as any,
        due_at: raw.due_at ? new Date(raw.due_at) : undefined,
        assigned_to: raw.assigned_to || null,
        team_id: raw.team_id || null,
      });
      this.tasksSvc.triggerRefresh();
      // Toast repeats all three facts the user chose: title, owner, and due date (§3).
      this.alertSvc.showSuccess(
        `Task “${name}” created — ${this.ownerFact(raw.assigned_to, raw.team_id)}, ${this.dueFact(raw.due_at)}.`,
      );
      this.close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create task';
      this.error.set(msg);
      this.alertSvc.showError(msg);
    } finally {
      this.submitting.set(false);
      end();
    }
  }

  // "assigned to Jane Smith" / "assigned to the Canvass team" / "waiting for an owner".
  private ownerFact(assignedTo: string, teamId: string): string {
    if (assignedTo) {
      const user = this.users().find((u) => String(u.id) === String(assignedTo));
      const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() : '';
      if (name) return `assigned to ${name}`;
    }
    if (teamId) {
      const team = this.teamsList().find((t) => String(t?.id) === String(teamId));
      const teamName = typeof team?.name === 'string' ? team.name : '';
      if (teamName) return `assigned to the ${teamName} team`;
    }
    return 'waiting for an owner';
  }

  // "due May 3, 2026" / "no due date".
  private dueFact(dueAt: string): string {
    if (!dueAt) return 'no due date';
    const date = new Date(dueAt);
    if (Number.isNaN(date.getTime())) return 'no due date';
    return `due ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
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
