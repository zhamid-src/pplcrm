import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  TASK_BOARD_STATUSES,
  TASK_STATUS_LABELS,
  TaskBoardStatus,
  UpdateTaskType,
} from '../../../../../../../libs/common/src';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { SettingsService } from '@experiences/settings/services/settings-service';
import { getUserErrorMessage } from '@frontend/services/api/user-message';

import { AuthService } from '../../../auth/auth-service';
import { UserService } from '../../../services/user.service';
import { TasksService } from '../services/tasks-service';
import { computeTaskSla } from '../services/task-sla';

interface BoardTask {
  id: string;
  name: string;
  status: TaskBoardStatus;
  priority: string | null;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string | null;
  details: string | null;
  team_name: string | null;
}

const CARD_FLASH_MS = 1200;

@Component({
  selector: 'pc-tasks-board',
  imports: [Icon],
  templateUrl: './tasks-board.html',
})
export class TasksBoard implements OnInit {
  private readonly router = inject(Router);
  private readonly svc = inject(TasksService);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly settingsSvc = inject(SettingsService);
  private readonly alerts = inject(AlertService);

  protected readonly columns = TASK_BOARD_STATUSES;
  protected readonly statusLabels = TASK_STATUS_LABELS;

  protected readonly tasks = signal<BoardTask[]>([]);
  protected readonly usersById = signal<Map<string, string>>(new Map());
  protected readonly flashedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly counts = signal<{
    assignedToMe: number;
    openTotal: number;
    slaBreaches: number;
    unassigned: number;
  } | null>(null);

  protected readonly grouped = computed(() => {
    const map = new Map<TaskBoardStatus, BoardTask[]>(this.columns.map((c) => [c, []]));
    for (const t of this.tasks()) {
      map.get(t.status)?.push(t);
    }
    return map;
  });

  /** "12 open tasks · 2 breaching SLA · 4 assigned to you · 3 waiting for an owner" (spec §4). */
  protected readonly countSentence = computed(() => {
    const c = this.counts();
    if (!c) return '';
    return (
      `${c.openTotal} open ${c.openTotal === 1 ? 'task' : 'tasks'} · ${c.slaBreaches} breaching SLA · ` +
      `${c.assignedToMe} assigned to you · ${c.unassigned} waiting for an owner`
    );
  });

  public ngOnInit(): void {
    void this.settingsSvc.load();
    void this.loadOnInit();
  }

  private async loadOnInit(): Promise<void> {
    try {
      const [res, users, counts] = await Promise.all([
        this.svc.getAll({
          limit: 1000,
          columns: ['id', 'name', 'status', 'priority', 'assigned_to', 'due_at', 'created_at', 'details', 'team_name'],
        }),
        this.userService.getUsers(),
        this.svc.getSummaryCounts(),
      ]);
      this.usersById.set(new Map(users.map((u) => [String(u.id), `${u.first_name} ${u.last_name || ''}`.trim()])));
      this.counts.set(counts);

      const rows = (res.rows || []) as unknown as Record<string, unknown>[];
      const items: BoardTask[] = rows.map((r) => this.toBoardTask(r)).filter((t): t is BoardTask => t !== null);
      this.tasks.set(items);
    } catch (err) {
      this.alerts.showError(getUserErrorMessage(err, 'Could not load the task board. Please try again.'));
    }
  }

  private toBoardTask(r: Record<string, unknown>): BoardTask | null {
    const status = String(r['status'] ?? 'todo');
    if (!(this.columns as readonly string[]).includes(status)) return null; // done/archived-excluded rows never reach the board
    return {
      id: String(r['id']),
      name: String(r['name'] || '(no name)'),
      status: status as TaskBoardStatus,
      priority: (r['priority'] as string | null) ?? null,
      assigned_to: r['assigned_to'] == null ? null : String(r['assigned_to']),
      due_at: (r['due_at'] as string | null) ?? null,
      created_at: (r['created_at'] as string | null) ?? null,
      details: (r['details'] as string | null) ?? null,
      team_name: (r['team_name'] as string | null) ?? null,
    };
  }

  protected columnLabel(status: TaskBoardStatus): string {
    return this.statusLabels[status];
  }

  protected cardsFor(status: TaskBoardStatus): BoardTask[] {
    return this.grouped().get(status) ?? [];
  }

  protected assigneeName(id: string | null): string | null {
    if (!id) return null;
    return this.usersById().get(id) ?? null;
  }

  protected assigneeInitial(id: string | null): string {
    const name = this.assigneeName(id);
    return name ? name.slice(0, 1).toUpperCase() : '?';
  }

  protected isFlashed(id: string): boolean {
    return this.flashedIds().has(id);
  }

  protected slaPill(task: BoardTask) {
    return computeTaskSla({
      status: task.status,
      createdAt: task.created_at ? new Date(task.created_at) : null,
      tasksHours: Number(this.settingsSvc.getValue('sla.tasks_hours', 24)),
      workingDays: this.settingsSvc.getValue<string>('sla.working_days', '1,2,3,4,5'),
      workingHoursStart: this.settingsSvc.getValue<string>('sla.working_hours_start', '09:00'),
      workingHoursEnd: this.settingsSvc.getValue<string>('sla.working_hours_end', '17:00'),
    });
  }

  protected waitingReason(task: BoardTask): string | null {
    if (task.status !== 'waiting' || !task.details) return null;
    const oneLine = task.details.trim().split('\n')[0] ?? '';
    return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine || null;
  }

  protected dateLabel(v?: string | null): string {
    if (!v) return '';
    const s = typeof v === 'string' ? v : String(v);
    return s.length > 10 ? s.slice(0, 10) : s;
  }

  protected priorityBadgeClass(p?: string | null): string {
    const v = (p || '').toLowerCase();
    return v === 'urgent'
      ? 'badge-error'
      : v === 'high'
        ? 'badge-warning'
        : v === 'medium'
          ? 'badge-info'
          : 'badge-neutral';
  }

  /** ‹ › move: one column at a time. Disabled (dimmed) at either end — see `moveDisabledReason`. */
  protected canMove(status: TaskBoardStatus, direction: -1 | 1): boolean {
    const idx = this.columns.indexOf(status);
    const nextIdx = idx + direction;
    return nextIdx >= 0 && nextIdx < this.columns.length;
  }

  protected moveDisabledReason(direction: -1 | 1): string {
    const edge = direction < 0 ? this.columns[0] : this.columns[this.columns.length - 1];
    return edge ? `Already in ${this.statusLabels[edge]}` : '';
  }

  protected async moveCard(task: BoardTask, direction: -1 | 1): Promise<void> {
    if (!this.canMove(task.status, direction)) return;
    const idx = this.columns.indexOf(task.status);
    const next = this.columns[idx + direction];
    if (!next) return;
    await this.setStatus(task, next);
  }

  private async setStatus(task: BoardTask, next: TaskBoardStatus): Promise<void> {
    const prevStatus = task.status;
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      await this.svc.update(task.id, { status: next } as UpdateTaskType);
      this.svc.triggerRefresh();
      this.flashCard(task.id);
    } catch (err) {
      this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, status: prevStatus } : t)));
      this.alerts.showError(getUserErrorMessage(err, 'Could not move the task. Please try again.'));
    }
  }

  /** One-click "take" for an unassigned task — assigns it to the current user. */
  protected async takeTask(task: BoardTask): Promise<void> {
    const me = this.auth.getUser();
    if (!me?.id) return;
    try {
      await this.svc.update(task.id, { assigned_to: me.id } as UpdateTaskType);
      this.svc.triggerRefresh();
      this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, assigned_to: me.id } : t)));
      this.flashCard(task.id);
      this.alerts.showSuccess(`You're now assigned to "${task.name}"`);
    } catch (err) {
      this.alerts.showError(getUserErrorMessage(err, 'Could not take the task. Please try again.'));
    }
  }

  private flashCard(id: string): void {
    this.flashedIds.update((s) => new Set([...s, id]));
    setTimeout(() => {
      this.flashedIds.update((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, CARD_FLASH_MS);
  }

  protected openTask(t: BoardTask): void {
    void this.router.navigate(['tasks', t.id]);
  }

  protected openList(): void {
    void this.router.navigate(['/tasks']);
  }
}
