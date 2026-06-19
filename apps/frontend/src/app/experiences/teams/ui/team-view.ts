import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { TeamsService } from '../services/teams-service';
import { TasksService } from '../../tasks/services/tasks-service';
import { AuthService } from '../../../auth/auth-service';
import { type IAuthUser } from '@common';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-team-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities, FormActions],
  templateUrl: './team-view.html',
})
export class TeamViewComponent {
  readonly id = input.required<string>();

  private readonly alertSvc = inject(AlertService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly tasksSvc = inject(TasksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(ConfirmDialogService);

  protected readonly isLoading = signal(false);
  protected readonly team = signal<any>(null);
  protected readonly teamTasks = signal<any[]>([]);
  protected readonly volunteers = computed(() => this.team()?.volunteers ?? []);
  protected readonly users = signal<IAuthUser[]>([]);
  private usersById = new Map<string, IAuthUser>();

  // Active tab state
  protected activeTab = signal<'activity' | 'volunteers' | 'lists' | 'tasks'>('activity');

  protected readonly captainName = computed(() => {
    const captainId = this.team()?.team_captain_id;
    if (!captainId) return '—';
    const match = this.volunteers().find((v: any) => v.id === captainId);
    return match ? `${match.first_name} ${match.last_name || ''}`.trim() : '—';
  });

  protected readonly leadName = computed(() => {
    const leadId = this.team()?.team_lead_user_id;
    if (!leadId) return '—';
    const match = this.users().find((u) => String(u.id) === String(leadId));
    return match ? `${match.first_name} ${match.last_name || ''}`.trim() : '—';
  });

  protected readonly activeTasksCount = computed(() => {
    return this.teamTasks().filter((t) => t.status !== 'done' && t.status !== 'canceled').length;
  });

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });

    // Load users
    this.auth
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  protected async loadAllData(id: string) {
    this.isLoading.set(true);
    try {
      // 1. Load team detail
      const data = await this.teamsSvc.getById(id);
      this.team.set(data);

      // 2. Load associated tasks
      const res = await this.tasksSvc.getAll({
        filterModel: { team_id: { value: id } },
      } as any);
      this.teamTasks.set(res?.rows ?? []);
    } catch (err) {
      this.alertSvc.showError('Failed to load team details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected editTeam() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteTeam() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Team',
      message: 'Are you sure you want to delete this team? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.isLoading.set(true);
    try {
      await this.teamsSvc.delete(this.id());
      this.teamsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Team deleted');
      await this.router.navigate(['/teams']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete team';
      this.alertSvc.showError(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected getCreatedAt(): Date | null {
    const date = this.team()?.created_at;
    return date ? new Date(date) : null;
  }

  protected getUpdatedAt(): Date | null {
    const date = this.team()?.updated_at;
    return date ? new Date(date) : null;
  }

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }

  protected getPriorityClass(priority: string | null | undefined): string {
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

  protected getStatusClass(status: string | null | undefined): string {
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
      default:
        return 'badge-ghost';
    }
  }
}
