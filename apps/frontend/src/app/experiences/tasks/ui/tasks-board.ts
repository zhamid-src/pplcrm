import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UpdateTaskType } from '../../../../../../../libs/common/src';
import { Icon } from '@uxcommon/components/icons/icon';

import { TasksService } from '../services/tasks-service';

@Component({
  selector: 'pc-tasks-board',
  imports: [Icon],
  templateUrl: './tasks-board.html',
})
export class TasksBoard implements OnInit {
  private readonly router = inject(Router);
  private readonly svc = inject(TasksService);

  protected readonly gridColsClass = 'grid-cols-1 md:grid-cols-3 xl:grid-cols-6';
  protected readonly statuses = STATUSES as unknown as string[];
  protected readonly tasks = signal<Task[]>([]);
  protected readonly grouped = computed(() => {
    const map: Record<string, Task[]> = Object.fromEntries(this.statuses.map((s) => [s, []]));
    for (const t of this.tasks()) {
      const s = (t.status || 'todo').toLowerCase();
      (map[s] ??= []).push(t);
    }
    return map;
  });

  public ngOnInit(): void {

    void this.loadOnInit();

  }


  private async loadOnInit(): Promise<void> {
    const res = await this.svc.getAll({
      limit: 1000,
      columns: ['id', 'name', 'status', 'priority', 'assigned_to', 'due_at'],
    });
    const rows = (res.rows || []) as unknown as any[];
    const items: Task[] = rows.map((r) => ({
      id: String(r.id),
      name: String(r.name || '(no name)'),
      status: r.status ?? 'todo',
      priority: r.priority ?? null,
      assigned_to: r.assigned_to ?? null,
      due_at: r.due_at ?? null,
    }));
    this.tasks.set(items);
  }

  protected onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.dataTransfer!.dropEffect = 'move';
  }

  protected onDragStart(ev: DragEvent, t: Task) {
    if (ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', t.id);
      ev.dataTransfer.setData('application/x-status', String(t.status || 'todo'));
      ev.dataTransfer.effectAllowed = 'move';
    }
  }

  protected async onDrop(ev: DragEvent, toStatus: string) {
    ev.preventDefault();
    const id = ev.dataTransfer?.getData('text/plain');
    if (!id) return;
    const list = this.tasks();
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const curr = list[idx]!;
    const next = String(toStatus) as UpdateTaskType['status'];
    if (curr.status === next) return;

    try {
      await this.svc.update(id, { status: next } as UpdateTaskType);
      this.svc.triggerRefresh();
      const copy = list.slice();
      copy[idx] = { ...curr, status: String(next) };
      this.tasks.set(copy);
    } catch (_e) {
      // ignore errors; could add toast
    }
  }

  protected openTask(t: Task) {
    void this.router.navigate(['tasks', t.id]);
  }

  protected toLabel(s: string) {
    return STATUS_LABEL[s] || s;
  }

  protected priorityBadgeClass(p?: string | null) {
    const v = (p || '').toLowerCase();
    return v === 'urgent'
      ? 'badge-error'
      : v === 'high'
        ? 'badge-warning'
        : v === 'medium'
          ? 'badge-info'
          : 'badge-neutral';
  }

  protected dateLabel(v?: string | null) {
    if (!v) return '';
    const s = typeof v === 'string' ? v : String(v);
    return s.length > 10 ? s.slice(0, 10) : s;
  }
}

type Task = {
  id: string;
  name: string;
  status: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  due_at?: string | null;
};

const STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'canceled'] as const;
const STATUS_LABEL: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  canceled: 'Canceled',
};
