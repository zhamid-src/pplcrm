import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UpdateTaskType } from '@common';
import { Icon } from '@uxcommon/components/icons/icon';

import { TasksService } from '../services/tasks-service';

@Component({
  selector: 'pc-tasks-board',
  standalone: true,
  imports: [CommonModule, Icon],
  template: `
    <div class="p-4">
      <div class="flex items-center gap-2 mb-4">
        <pc-icon name="view-kanban"></pc-icon>
        <h2 class="text-xl font-semibold">Task Board</h2>
      </div>

      <div class="grid gap-4" [ngClass]="gridColsClass">
        @for (col of statuses; track col) {
          <div class="bg-base-200 rounded-lg p-3 min-h-72 flex flex-col">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold">{{ toLabel(col) }}</h3>
              <span class="badge badge-sm">{{ grouped()[col].length || 0 }}</span>
            </div>
            <div
              class="flex-1 overflow-auto"
              [attr.data-status]="col"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, col)"
            >
              <div class="flex flex-wrap gap-2 pb-6" (dragover)="onDragOver($event)" (drop)="onDrop($event, col)">
                @for (t of grouped()[col]; track t.id) {
                  <div
                    class="card bg-warning/10 border border-warning/20 shadow-sm cursor-move w-32 md:w-36 aspect-square relative"
                    draggable="true"
                    (dragstart)="onDragStart($event, t)"
                    (dblclick)="openTask(t)"
                    (dragover)="onDragOver($event)"
                    (drop)="onDrop($event, col)"
                  >
                    <div class="card-body p-3">
                      <div class="flex items-center gap-2 mb-1 pr-6">
                        <span class="badge badge-ghost badge-xs">#{{ t.id }}</span>
                      </div>
                      <span class="badge badge-xs absolute top-2 right-2" [ngClass]="priorityBadgeClass(t.priority)">
                        {{ t.priority || '' }}
                      </span>
                      <div class="text-sm font-medium break-words overflow-hidden">
                        {{ t.name }}
                      </div>
                      <div class="mt-auto text-xs opacity-70">{{ dateLabel(t.due_at) }}</div>
                    </div>
                  </div>
                }
                <!-- Spacer drop zone at bottom of column -->
                <div class="w-full h-16" (dragover)="onDragOver($event)" (drop)="onDrop($event, col)"></div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
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

  public async ngOnInit() {
    const res = await this.svc.getAll({ limit: 1000, columns: ['id', 'name', 'status', 'priority', 'assigned_to', 'due_at'] });
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
    const curr = list[idx];
    const next = String(toStatus) as UpdateTaskType['status'];
    if (curr.status === next) return;

    try {
      await this.svc.update(id, { status: next } as UpdateTaskType);
      const copy = list.slice();
      copy[idx] = { ...curr, status: String(next) };
      this.tasks.set(copy);
    } catch (e) {
      // ignore errors; could add toast
    }
  }

  protected openTask(t: Task) {
    this.router.navigate(['tasks', t.id]);
  }

  protected toLabel(s: string) {
    return STATUS_LABEL[s] || s;
  }

  protected priorityBadgeClass(p?: string | null) {
    const v = (p || '').toLowerCase();
    return v === 'urgent' ? 'badge-error' : v === 'high' ? 'badge-warning' : v === 'medium' ? 'badge-info' : 'badge-ghost';
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
