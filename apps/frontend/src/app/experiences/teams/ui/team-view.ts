import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { TeamsService } from '../services/teams-service';
import { TasksService } from '../../tasks/services/tasks-service';
import { AuthService } from '../../../auth/auth-service';
import { type IAuthUser } from '@common';

@Component({
  selector: 'pc-team-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities],
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <div class="flex items-center gap-3">
            <a routerLink="/teams" class="btn btn-sm btn-ghost gap-1">
              <pc-icon name="arrow-left" [size]="4"></pc-icon>
              Close
            </a>
          </div>
          <div class="flex items-center gap-2">
            <a [routerLink]="['edit']" class="btn btn-primary btn-sm gap-2">
              <pc-icon name="pencil-square" [size]="4"></pc-icon>
              EDIT TEAM
            </a>
          </div>
        </div>

        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (team()) {
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Team Card -->
            <div class="lg:col-span-1 flex flex-col gap-6">
              <!-- Elegant Team Card -->
              <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300">
                <!-- Decorative Card Header Gradient -->
                <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

                <div class="px-6 pb-6 relative flex flex-col items-center">
                  <!-- Team Icon Avatar -->
                  <div class="avatar placeholder -mt-12 mb-3">
                    <div
                      class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg"
                    >
                      <pc-icon name="user-group" [size]="10"></pc-icon>
                    </div>
                  </div>

                  <!-- Name -->
                  <h2 class="text-2xl font-bold text-base-content text-center mb-4 leading-tight">{{ team().name }}</h2>

                  <!-- Details List -->
                  <div class="w-full flex flex-col gap-3 text-sm border-t border-base-200 pt-4">
                    @if (team().description) {
                      <div class="p-3 bg-base-200/30 rounded-lg text-xs text-base-content/70">
                        {{ team().description }}
                      </div>
                    }

                    <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <div class="flex items-center gap-2">
                        <pc-icon name="user-circle" [size]="4" class="text-teal-500"></pc-icon>
                        <span>Team Captain:</span>
                      </div>
                      <span class="font-bold">{{ captainName() }}</span>
                    </div>

                    <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <div class="flex items-center gap-2">
                        <pc-icon name="user-circle" [size]="4" class="text-purple-500"></pc-icon>
                        <span>Team Lead:</span>
                      </div>
                      <span class="font-bold">{{ leadName() }}</span>
                    </div>
                  </div>

                  <!-- System Metadata -->
                  <div
                    class="w-full mt-6 pt-4 border-t border-base-200 text-[10px] text-base-content/40 flex justify-between leading-normal"
                  >
                    <span
                      >Created by {{ getUserName(team().createdby_id) }} on
                      {{ getCreatedAt() | date: 'M/d/yyyy' }}</span
                    >
                    <span
                      >Updated {{ getUpdatedAt() | date: 'M/d/yyyy' }} by {{ getUserName(team().updatedby_id) }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Stats & Tabs -->
            <div class="lg:col-span-2 flex flex-col gap-6">
              <!-- Stats Panel -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Volunteers</span>
                      <h3 class="text-2xl font-bold text-teal-500 mt-1">{{ volunteers().length }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Teammate members</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-teal-500">
                      <pc-icon name="user-group" [size]="5"></pc-icon>
                    </div>
                  </div>
                </div>

                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Target Lists</span>
                      <h3 class="text-2xl font-bold text-indigo-500 mt-1">{{ team().lists?.length || 0 }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Assigned lists</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500">
                      <pc-icon name="queue-list" [size]="5"></pc-icon>
                    </div>
                  </div>
                </div>

                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Active Tasks</span>
                      <h3 class="text-2xl font-bold text-amber-500 mt-1">{{ activeTasksCount() }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Tasks assigned</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-amber-500">
                      <pc-icon name="document-check" [size]="5"></pc-icon>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabs Panel -->
              <div class="card bg-base-100 shadow-xl border border-base-300 flex-grow">
                <!-- Tabs Header -->
                <div role="tablist" class="tabs tabs-lifted w-full pt-4 px-4">
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'activity'"
                    (click)="activeTab.set('activity')"
                  >
                    <pc-icon name="adjustments-horizontal" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Activity Feed</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'volunteers'"
                    (click)="activeTab.set('volunteers')"
                  >
                    <pc-icon name="user-group" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Volunteers ({{ volunteers().length }})</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'lists'"
                    (click)="activeTab.set('lists')"
                  >
                    <pc-icon name="queue-list" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Target Lists ({{ team().lists?.length || 0 }})</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'tasks'"
                    (click)="activeTab.set('tasks')"
                  >
                    <pc-icon name="document-check" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Team Tasks ({{ teamTasks().length }})</span>
                  </a>
                </div>

                <!-- Tab Panels -->
                <div class="p-6">
                  <!-- Panel: General Activity Feed -->
                  @if (activeTab() === 'activity') {
                    <div class="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
                      <pc-record-activities [entity]="'teams'" [entityId]="id!"></pc-record-activities>
                    </div>
                  }

                  <!-- Panel: Associated Volunteers -->
                  @if (activeTab() === 'volunteers') {
                    <div class="flex flex-col gap-3">
                      @if (volunteers().length === 0) {
                        <p class="text-sm text-base-content/40 italic">No volunteers assigned to this team.</p>
                      } @else {
                        <ul class="divide-y divide-base-200">
                          @for (volunteer of volunteers(); track volunteer.id) {
                            <li class="flex items-center justify-between py-2.5 text-sm">
                              <div>
                                <p class="font-medium text-base-content">
                                  {{ volunteer.first_name }} {{ volunteer.last_name }}
                                </p>
                                @if (volunteer.email) {
                                  <p class="text-xs text-base-content/50">{{ volunteer.email }}</p>
                                }
                              </div>
                              <a [routerLink]="['/people', volunteer.id]" class="btn btn-xs btn-ghost text-primary"
                                >View profile</a
                              >
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  }

                  <!-- Panel: Target Lists -->
                  @if (activeTab() === 'lists') {
                    <div class="flex flex-col gap-3">
                      @if (!team().lists?.length) {
                        <p class="text-sm text-base-content/40 italic">No target constituent lists assigned.</p>
                      } @else {
                        <ul class="divide-y divide-base-200">
                          @for (list of team().lists; track list.id) {
                            <li class="flex items-center justify-between py-2.5 text-sm">
                              <div>
                                <p class="font-medium text-base-content">{{ list.name }}</p>
                                <p class="text-xs text-base-content/50">
                                  {{ list.is_dynamic ? 'Dynamic' : 'Static' }} • Target: {{ list.object }}
                                </p>
                              </div>
                              <a [routerLink]="['/lists', list.id]" class="btn btn-xs btn-ghost text-primary"
                                >Open list</a
                              >
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  }

                  <!-- Panel: Team Tasks -->
                  @if (activeTab() === 'tasks') {
                    <div class="flex flex-col gap-4">
                      @if (teamTasks().length === 0) {
                        <p class="text-sm text-base-content/40 italic">No tasks currently assigned to this team.</p>
                      } @else {
                        <div class="overflow-x-auto rounded-lg border border-base-300 shadow-sm">
                          <table class="table table-sm table-zebra w-full text-xs">
                            <thead>
                              <tr class="bg-base-200 text-base-content/70">
                                <th>Task</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Due Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (task of teamTasks(); track task.id) {
                                <tr class="hover:bg-base-200/50">
                                  <td class="font-semibold">
                                    <a [routerLink]="['/tasks', task.id]" class="link hover:no-underline text-primary">
                                      {{ task.name }}
                                    </a>
                                  </td>
                                  <td>
                                    <span
                                      class="badge badge-sm font-semibold uppercase"
                                      [class]="getPriorityClass(task.priority)"
                                    >
                                      {{ task.priority || 'medium' }}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      class="badge badge-sm font-semibold uppercase"
                                      [class]="getStatusClass(task.status)"
                                    >
                                      {{ task.status || 'todo' }}
                                    </span>
                                  </td>
                                  <td>{{ task.due_at ? (task.due_at | date: 'mediumDate') : '—' }}</td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="alert alert-error">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>Team not found or failed to load.</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class TeamViewComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly tasksSvc = inject(TasksService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected id: string | null = null;
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
    this.id = this.route.snapshot.paramMap.get('id');

    // Load users
    this.auth
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  public ngOnInit() {
    void this.loadAllData();
  }

  protected async loadAllData() {
    if (!this.id) return;
    this.isLoading.set(true);
    try {
      // 1. Load team detail
      const data = await this.teamsSvc.getById(this.id);
      this.team.set(data);

      // 2. Load associated tasks
      const res = await this.tasksSvc.getAll({
        filterModel: { team_id: { value: this.id } },
      } as any);
      this.teamTasks.set(res?.rows ?? []);
    } catch (err) {
      this.alertSvc.showError('Failed to load team details: ' + String(err));
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
