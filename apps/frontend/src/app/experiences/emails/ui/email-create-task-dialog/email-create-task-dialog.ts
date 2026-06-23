import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { AddTaskObj } from '../../../../../../../../libs/common/src';
import type { IAuthUser } from '../../../../../../../../libs/common/src/lib/auth';
import type { EmailType } from '../../../../../../../../libs/common/src/lib/models';
import { UserService } from '../../../../services/user.service';
import { TeamsService } from '../../../teams/services/teams-service';
import { TasksService } from '../../../tasks/services/tasks-service';

@Component({
  selector: 'pc-email-create-task-dialog',
  imports: [FormField, Icon],
  templateUrl: './email-create-task-dialog.html',
})
export class EmailCreateTaskDialog {
  private readonly alertSvc = inject(AlertService);
  private readonly tasksSvc = inject(TasksService);
  private readonly userService = inject(UserService);
  private readonly teamsSvc = inject(TeamsService);

  private readonly _loading = createLoadingGate();
  private readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  public readonly email = input.required<EmailType>();

  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly teamsList = signal<any[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isLoading = this._loading.visible;

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

    this.payload.set({ name: '', details, status: 'todo', priority: 'medium', due_at: '', assigned_to: '', team_id: '' });
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

    this.dlgRef().nativeElement.showModal();
  }

  public close() {
    this.dlgRef().nativeElement.close();
  }

  protected async submit() {
    this.form().markAsTouched();
    if (this.form().invalid()) return;

    this.submitting.set(true);
    this.error.set(null);
    const end = this._loading.begin();

    try {
      const raw = this.payload();
      await this.tasksSvc.add({
        name: raw.name.trim(),
        details: raw.details.trim() || undefined,
        status: raw.status as any,
        priority: raw.priority as any,
        due_at: raw.due_at ? new Date(raw.due_at) : undefined,
        assigned_to: raw.assigned_to || null,
        team_id: raw.team_id || null,
      });
      this.tasksSvc.triggerRefresh();
      this.alertSvc.showSuccess('Task created successfully');
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

  protected toTitleCase(s: string): string {
    if (!s) return '';
    return s
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}
