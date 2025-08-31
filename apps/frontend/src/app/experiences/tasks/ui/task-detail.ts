import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IAuthUser } from '@common';
import { TasksService } from '@experiences/tasks/services/tasks-service';

import { QuillModule } from 'ngx-quill';

import { AuthService } from '../../../auth/auth-service';

@Component({
  selector: 'pc-task-detail',
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './task-detail.html',
})
export class TaskDetail implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly tasks = inject(TasksService);

  private id = signal<string>('');

  protected readonly comments = signal<any[]>([]);
  protected readonly attachments = signal<any[]>([]);
  protected readonly subtasks = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly task = signal<any | null>(null);
  protected readonly users = signal<IAuthUser[]>([]);

  protected newComment = '';
  protected attName = '';
  protected attUrl = '';
  protected subtaskName = '';

  public ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.id.set(id);
    this.load();
  }

  protected async addComment() {
    if (!this.newComment.trim()) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addComment.mutate({ task_id: this.id(), comment: this.newComment.trim() });
      this.newComment = '';
      await Promise.all([this.loadComments(), this.loadAttachments(), this.loadSubtasks()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected asDate(v: any) {
    return v ? new Date(v) : null;
  }

  protected assignToMe() {
    const me = this.auth.getUser();
    if (!me?.id) return;
    this.update({ assigned_to: me.id });
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
      this.task.update((t) => ({ ...(t ?? {}), ...patch }));
    } catch {
      // ignore for now
    }
  }

  protected userName(id: string | null | undefined): string {
    if (!id) return '';
    const uid = String(id);
    const u = this.users().find((x) => String(x.id) === uid);
    return u?.first_name ?? '';
  }

  private async load() {
    this.isLoading.set(true);
    try {
      const [t, us] = await Promise.all([this.tasks.getById(this.id()), this.auth.getUsers()]);
      this.task.set(t as any);
      this.users.set(us);
      await this.loadComments();
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

  protected async addAttachment() {
    const name = this.attName.trim();
    const url = this.attUrl.trim();
    if (!name) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addAttachment.mutate({ task_id: this.id(), filename: name, url });
      this.attName = '';
      this.attUrl = '';
      await this.loadAttachments();
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSubtasks() {
    const list = await (this.tasks as any).api.tasks.getSubtasks.query(this.id());
    this.subtasks.set(list as any[]);
  }

  protected async addSubtask() {
    const name = this.subtaskName.trim();
    if (!name) return;
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.addSubtask.mutate({ task_id: this.id(), name });
      this.subtaskName = '';
      await this.loadSubtasks();
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async toggleSubtask(s: any, isDone: boolean) {
    this.isLoading.set(true);
    try {
      await (this.tasks as any).api.tasks.updateSubtask.mutate({ id: String(s.id), data: { status: isDone ? 'done' : 'todo' } });
      await this.loadSubtasks();
    } finally {
      this.isLoading.set(false);
    }
  }
}
