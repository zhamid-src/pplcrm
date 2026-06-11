import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IAuthUser } from '@common';
import { TasksService } from '@experiences/tasks/services/tasks-service';
import { TeamsService } from '../../teams/services/teams-service';
import { QuillModule } from 'ngx-quill';

import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { SanitizeHtmlPipe } from '@uxcommon/pipes/sanitize-html.pipe';
import { MentionifyPipe } from '@uxcommon/pipes/mention.pipe';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';
import { MentionController, userDisplay } from '@uxcommon/mentions/mention-controller';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';

import { UserAvatarComponent } from '../../../uxcommon/components/user-avatar/user-avatar';

@Component({
  selector: 'pc-task-view',
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    FormsModule,
    RouterModule,
    QuillModule,
    Icon,
    SanitizeHtmlPipe,
    MentionifyPipe,
    TimeAgoPipe,
    RecordActivities,
    UserAvatarComponent,
  ],
  templateUrl: './task-view.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TaskView implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(TasksService);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  private readonly teams = inject(TeamsService);

  protected id = signal<string>('');
  protected readonly task = signal<any | null>(null);
  protected readonly comments = signal<any[]>([]);
  protected readonly attachments = signal<any[]>([]);
  protected readonly subtasks = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly assignedTo = signal<string>('');
  protected readonly teamsList = signal<any[]>([]);
  protected readonly teamId = signal<string>('');

  // Form Fields & Inline Editing State
  protected isEditingName = signal(false);
  protected isEditingDetails = signal(false);
  protected isEditingDueDate = signal(false);
  protected tempName = signal('');
  protected tempDetails = signal('');
  protected readonly defaultDetails =
    '<p class="italic text-base-content/40">No details or description provided. Click here to add descriptions...</p>';
  private readonly activityHistory = viewChild<any>('activityHistory');

  private refreshActivities() {
    const component = this.activityHistory();
    if (component) {
      void component.loadActivities();
    }
  }

  protected newComment = signal('');
  protected attName = signal('');
  protected attUrl = signal('');
  protected subtaskName = signal('');

  // Expand / collapse sections
  protected showComments = signal(true);
  protected showSubtasks = signal(true);
  protected showAttachments = signal(true);

  // Autocomplete mentions (shared controller)
  private readonly taskComposer = viewChild<any>('taskComposer');
  public mc = new MentionController(() => this.users());

  // Priority classes and options for display/inputs
  protected readonly priorities = ['low', 'medium', 'high', 'urgent'];
  protected readonly statuses = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];

  public ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.id.set(id);
    this.load();
  }

  // Load task and its children
  private async load() {
    this.isLoading.set(true);
    try {
      const [t, us, ts] = await Promise.all([
        this.tasks.getById(this.id()),
        this.auth.getUsers(),
        this.teams.getAll({ limit: 1000 }),
      ]);
      if (!t) {
        this.alertSvc.showError('Task not found.');
        return;
      }
      this.task.set(t as any);
      this.users.set(us || []);
      this.teamsList.set(ts?.rows ?? []);
      const assigned = (t as any)?.assigned_to;
      this.assignedTo.set(assigned == null ? '' : String(assigned));
      const team = (t as any)?.team_id;
      this.teamId.set(team == null ? '' : String(team));

      // Load subtasks, comments, attachments
      await Promise.all([this.loadComments(), this.loadAttachments(), this.loadSubtasks()]);
    } catch (err) {
      this.alertSvc.showError('Failed to load task details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadComments() {
    const list = await (this.tasks as any).api.tasks.getComments.query(this.id());
    this.comments.set(list as any[]);
  }

  private async loadAttachments() {
    const list = await (this.tasks as any).api.tasks.getAttachments.query(this.id());
    this.attachments.set(list as any[]);
  }

  private async loadSubtasks() {
    const list = await (this.tasks as any).api.tasks.getSubtasks.query(this.id());
    this.subtasks.set(list as any[]);
  }

  protected asDate(v: any) {
    return v ? new Date(v) : null;
  }

  protected dateOnly(v: any) {
    if (!v) return '';
    const s = typeof v === 'string' ? v : new Date(v).toISOString();
    return s.slice(0, 10);
  }

  protected async update(patch: any) {
    if (!this.task()) return;
    const id = this.id();
    try {
      await this.tasks.update(id, patch);
      this.tasks.triggerRefresh();
      this.task.update((t) => ({ ...(t ?? {}), ...patch }));
      if (Object.prototype.hasOwnProperty.call(patch, 'assigned_to')) {
        const v = patch.assigned_to;
        this.assignedTo.set(v == null || v === '' ? '' : String(v));
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'team_id')) {
        const v = patch.team_id;
        this.teamId.set(v == null || v === '' ? '' : String(v));
      }
      this.alertSvc.showSuccess('Task updated successfully');
      this.refreshActivities();
    } catch (err) {
      this.alertSvc.showError('Failed to update task: ' + String(err));
    }
  }

  protected onTeamChange(event: any) {
    const val = event.target.value;
    void this.update({ team_id: val || null });
  }

  // Inline name editing trigger & save
  protected startEditingName() {
    this.tempName.set(this.task()?.name || '');
    this.isEditingName.set(true);
  }

  protected async saveName() {
    const nextName = this.tempName().trim();
    if (!nextName) {
      this.isEditingName.set(false);
      return;
    }
    await this.update({ name: nextName });
    this.isEditingName.set(false);
  }

  protected cancelEditingName() {
    this.isEditingName.set(false);
  }

  // Inline details (Quill description) editing trigger & save
  protected startEditingDetails() {
    this.tempDetails.set(this.task()?.details || '');
    this.isEditingDetails.set(true);
  }

  protected async saveDetails() {
    await this.update({ details: this.tempDetails() });
    this.isEditingDetails.set(false);
  }

  protected cancelEditingDetails() {
    this.isEditingDetails.set(false);
  }

  // Subtask Actions
  protected async addSubtask() {
    const name = this.subtaskName().trim();
    if (!name) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addSubtask.mutate({ task_id: this.id(), name });
      this.subtaskName.set('');
      await this.loadSubtasks();
      this.refreshActivities();
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async toggleSubtask(s: any, isDone: boolean) {
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.updateSubtask.mutate({
        id: String(s.id),
        data: { status: isDone ? 'done' : 'todo' },
      });
      await this.loadSubtasks();
      this.refreshActivities();
    } finally {
      this.isLoading.set(false);
    }
  }

  // Comment Actions
  protected async addComment() {
    const plain = this.newComment().trim();
    if (!plain) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addComment.mutate({ task_id: this.id(), comment: plain });
      this.newComment.set('');
      await Promise.all([this.loadComments(), this.loadAttachments(), this.loadSubtasks()]);
      this.refreshActivities();
    } finally {
      this.isLoading.set(false);
    }
  }

  // Attachment Actions
  protected async addAttachment() {
    const name = this.attName().trim();
    const url = this.attUrl().trim();
    if (!name) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addAttachment.mutate({ task_id: this.id(), filename: name, url });
      this.attName.set('');
      this.attUrl.set('');
      await this.loadAttachments();
      this.refreshActivities();
    } finally {
      this.isLoading.set(false);
    }
  }

  // Status and Priority Dropdown Handlers
  protected onStatusChange(event: any) {
    const status = event.target.value;
    void this.update({ status });
  }

  protected onPriorityChange(event: any) {
    const priority = event.target.value;
    void this.update({ priority });
  }

  protected onDueDateChange(event: any) {
    const value = this.normalizeCalendarValue(event);
    void this.update({ due_at: value });
  }

  protected onAssignedChange(v: string) {
    this.assignedTo.set(v);
    void this.update({ assigned_to: v || null });
  }

  protected assignToMe() {
    const me = this.auth.getUser();
    if (!me?.id) return;
    this.update({ assigned_to: me.id });
  }

  protected isArchived() {
    return (this.task()?.status || '') === 'archived';
  }

  protected async archiveTask() {
    await this.update({ status: 'archived' });
  }

  protected async unarchiveTask() {
    await this.update({ status: 'todo' });
  }

  protected async deleteTask() {
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });

    if (confirmed) {
      this.isLoading.set(true);
      try {
        const deleted = await this.tasks.delete(this.id());
        if (deleted) {
          this.tasks.triggerRefresh();
          this.alertSvc.showSuccess('Task deleted successfully');
          void this.router.navigate(['/tasks']);
        } else {
          this.alertSvc.showError('Failed to delete task.');
        }
      } catch (err) {
        this.alertSvc.showError('Failed to delete task: ' + String(err));
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  // User display name helpers
  protected userName(id: string | null | undefined): string {
    if (!id) return 'Unknown';
    const uid = String(id);
    const u = this.users().find((x) => String(x.id) === uid);
    return u ? `${u.first_name} ${u.last_name || ''}`.trim() : 'Unknown';
  }

  protected userAvatar(id: string | null | undefined): string | null {
    if (!id) return null;
    const uid = String(id);
    const u = this.users().find((x) => String(x.id) === uid);
    return u ? ((u as any).avatar_url ?? null) : null;
  }

  protected myUserId(): string | null {
    return this.auth.getUser()?.id ?? null;
  }

  // Mention autocomplete text area inputs
  protected onComposerInput(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    this.newComment.set(el.value);
    const caret = el.selectionStart ?? this.newComment().length;
    this.mc.updateFromInput(this.newComment(), caret);
  }

  protected onComposerClick(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    const caret = el.selectionStart ?? 0;
    this.mc.updateFromInput(this.newComment(), caret);
  }

  protected onComposerKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.addComment();
      return;
    }
    this.mc.handleKeydown(ev, (u) => this.selectMention(u));
  }

  protected selectMention(u: IAuthUser, ev?: Event) {
    ev?.preventDefault();
    const res = this.mc.select(u, this.newComment());
    this.newComment.set(res.text);
    const el = this.taskComposer()?.nativeElement as HTMLTextAreaElement | undefined;
    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(res.caret, res.caret);
      }
    });
  }

  protected userDisplay = userDisplay;

  private normalizeCalendarValue(event: any): string | null {
    const raw =
      (event?.detail != null && typeof event.detail === 'string' && event.detail) ||
      (event?.detail?.value != null && event.detail.value) ||
      (event?.target?.value != null && event.target.value) ||
      (event?.value != null && event.value) ||
      (typeof event === 'string' ? event : null);

    if (!raw) return null;
    const text = String(raw).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  // Styling helper classes
  protected getStatusBadgeClass(status: string): string {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'done':
        return 'badge-success text-success-content';
      case 'in_progress':
        return 'badge-info text-info-content';
      case 'blocked':
        return 'badge-error text-error-content';
      case 'canceled':
        return 'badge-neutral text-neutral-content';
      case 'archived':
        return 'badge-warning text-warning-content';
      default:
        return 'badge-ghost';
    }
  }

  protected getPriorityBadgeClass(priority: string): string {
    const p = String(priority || '').toLowerCase();
    switch (p) {
      case 'urgent':
        return 'badge-error text-error-content';
      case 'high':
        return 'badge-warning text-warning-content';
      case 'medium':
        return 'badge-info text-info-content';
      default:
        return 'badge-ghost';
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
