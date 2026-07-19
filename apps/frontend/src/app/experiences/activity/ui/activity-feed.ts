import { Component, inject, signal, OnInit, linkedSignal, resource, computed, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivityService } from '../services/activity.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import { PcIconNameType } from '@icons/icons.index';
import { UserService } from '../../../services/user.service';
import { IAuthUser } from '../../../../../../../libs/common/src';
import { EmptyState } from '@uxcommon/components/empty-state/empty-state';

@Component({
  selector: 'pc-activity-feed',
  imports: [EmptyState, DatePipe, RouterLink, Icon, GridHeaderComponent],
  templateUrl: './activity-feed.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class ActivityFeed implements OnInit {
  private readonly activitySvc = inject(ActivityService);
  private readonly alertSvc = inject(AlertService);
  private readonly userService = inject(UserService);

  protected readonly isLoadingExport = signal(false);

  protected readonly selectedUser = signal<string>('');
  protected readonly selectedEntity = signal<string>('');
  protected readonly selectedActivity = signal<string>('');
  protected readonly searchStr = signal<string>('');
  protected readonly users = signal<IAuthUser[]>([]);

  private readonly pageSize = 25;

  private readonly refreshTrigger = signal(0);

  protected readonly filterState = computed(() => ({
    user: this.selectedUser(),
    entity: this.selectedEntity(),
    activity: this.selectedActivity(),
    refresh: this.refreshTrigger(),
  }));

  protected readonly activities = linkedSignal({
    source: this.filterState,
    computation: () => [] as any[], // Automatically resets to [] when filterState changes
  });

  protected readonly hasMore = linkedSignal({
    source: this.filterState,
    computation: () => false, // Automatically resets to false when filterState changes
  });

  protected readonly currentOffset = linkedSignal({
    source: () => ({
      source: this.filterState,
      user: this.selectedUser(),
      entity: this.selectedEntity(),
      activity: this.selectedActivity(),
      refresh: this.refreshTrigger(),
    }),
    computation: () => 0,
  });

  protected readonly activitiesResource = resource({
    params: () => ({
      offset: this.currentOffset(),
      user: this.selectedUser(),
      entity: this.selectedEntity(),
      activity: this.selectedActivity(),
    }),
    loader: async ({ params }) => {
      return (await this.activitySvc.getFeed({
        startRow: params.offset,
        endRow: params.offset + this.pageSize,
        userId: params.user || undefined,
        entity: params.entity || undefined,
        activity: params.activity || undefined,
      })) as any;
    },
  });

  protected readonly isLoading = computed(() => this.activitiesResource.isLoading());

  /** Placeholder cards for the first-load skeleton (mirrors pc-table's default of 5). */
  protected readonly skeletonRows = Array.from({ length: 5 }, (_, i) => i);

  constructor() {
    effect(() => {
      const res = this.activitiesResource.value() as any;
      if (res) {
        const newRows = res.rows || [];
        if (this.currentOffset() === 0) {
          this.activities.set(newRows);
        } else {
          this.activities.update((curr) => {
            const existingIds = new Set(curr.map((r: any) => r.id));
            const filteredNew = newRows.filter((r: any) => !existingIds.has(r.id));
            return [...curr, ...filteredNew];
          });
        }
        this.hasMore.set(newRows.length === this.pageSize);
      }
    });

    effect(() => {
      const err = this.activitiesResource.error();
      if (err) {
        this.alertSvc.showError('Failed to fetch activity logs');
      }
    });
  }

  public ngOnInit() {
    void this.loadUsers();
  }

  private async loadUsers() {
    try {
      const u = await this.userService.getUsers();
      this.users.set(u || []);
    } catch (err) {
      console.error('Failed to load users for filter', err);
    }
  }

  protected refreshFeed() {
    this.refreshTrigger.update((n) => n + 1);
  }

  protected loadMore() {
    this.currentOffset.update((c) => c + this.pageSize);
  }

  protected async exportFeed() {
    this.isLoadingExport.set(true);
    try {
      const res = await this.activitySvc.exportCsv({
        options: {
          userId: this.selectedUser() || undefined,
          entity: this.selectedEntity() || undefined,
          activity: this.selectedActivity() || undefined,
        },
        fileName: 'activity-log.csv',
      });

      if (res && res.status === 'processing') {
        this.alertSvc.showSuccess('Export queued. We’ll email you activity-log.csv once it’s ready.');
      } else if (res && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName || 'activity-log.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Count exported events = CSV data rows (excludes the header and any trailing newline).
        const eventCount = res.csv.trim().split('\n').length - 1;
        this.alertSvc.showSuccess(
          `Exported ${eventCount} ${eventCount === 1 ? 'event' : 'events'} to activity-log.csv`,
        );
      } else {
        this.alertSvc.showError('No activity data to export');
      }
    } catch (err) {
      console.error('Failed to export activity feed', err);
      this.alertSvc.showError('Failed to export activity feed');
    } finally {
      this.isLoadingExport.set(false);
    }
  }

  // Group the flat feed into day buckets (Today / Yesterday / dated) for scannable headers (§19).
  protected readonly groupedActivities = computed(() => {
    const rows = this.activities();
    const groups: Array<{ key: string; label: string; items: any[] }> = [];
    const byKey = new Map<string, { key: string; label: string; items: any[] }>();
    for (const act of rows) {
      const created = new Date(act.created_at);
      const key = this.dayKey(created);
      let group = byKey.get(key);
      if (!group) {
        group = { key, label: this.dayLabel(created), items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.items.push(act);
    }
    return groups;
  });

  protected readonly totalShown = computed(() => this.activities().length);

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private dayLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (this.dayKey(date) === this.dayKey(today)) return 'Today';
    if (this.dayKey(date) === this.dayKey(yesterday)) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Honest attribution (§19): backend stores a full sentence in metadata.message for
  // tokenised public actions (e.g. delivery volunteer link) — surface it verbatim rather
  // than rebuilding a generic one.
  protected getCustomMessage(act: any): string | null {
    const msg = act.metadata?.message;
    return typeof msg === 'string' && msg.trim().length ? msg : null;
  }

  // "via volunteer link" when the action came through a public token, not a signed-in user.
  protected getViaLabel(act: any): string | null {
    const via = act.metadata?.via ?? act.metadata?.acted_via;
    if (via === 'volunteer_link') return 'via volunteer link';
    return null;
  }

  // Short kind chip label paired with getActivityClass() colour.
  protected getKindLabel(activity: string): string {
    switch (activity) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      case 'merge':
        return 'Merged';
      case 'import':
        return 'Imported';
      case 'export':
        return 'Exported';
      case 'assign':
        return 'Assigned';
      case 'unassign':
        return 'Unassigned';
      case 'close':
        return 'Closed';
      case 'reopen':
        return 'Reopened';
      case 'send':
        return 'Sent';
      case 'submission':
      case 'signup':
        return 'Submitted';
      default:
        return activity.charAt(0).toUpperCase() + activity.slice(1);
    }
  }

  protected getUserInitials(act: any): string {
    const fn = act.first_name || '';
    const ln = act.last_name || '';
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || '?';
  }

  protected getActivityIcon(activity: string): PcIconNameType {
    switch (activity) {
      case 'create':
        return 'plus';
      case 'update':
        return 'pencil-square';
      case 'delete':
        return 'trash';
      case 'merge':
        return 'merge';
      case 'import':
        return 'arrow-up-tray';
      case 'export':
        return 'arrow-down-tray';
      case 'assign':
        return 'user-plus';
      case 'unassign':
        return 'user-circle';
      case 'close':
        return 'check-circle';
      case 'reopen':
        return 'arrow-path';
      default:
        return 'information-circle';
    }
  }

  protected getActivityClass(activity: string): string {
    switch (activity) {
      case 'create':
        return 'border-success text-success';
      case 'update':
        return 'border-info text-info';
      case 'delete':
        return 'border-error text-error';
      case 'merge':
        return 'border-warning text-warning';
      case 'import':
        return 'border-secondary text-secondary';
      case 'export':
        return 'border-primary text-primary';
      case 'assign':
        return 'border-accent text-accent';
      case 'unassign':
        return 'border-base-content/40 text-base-content/60';
      case 'close':
        return 'border-success text-success';
      case 'reopen':
        return 'border-warning text-warning';
      default:
        return 'border-base-content/40 text-base-content/60';
    }
  }

  private formatValue(val: any): string {
    if (val === null || val === undefined || val === '') return 'none';
    if (typeof val === 'boolean') return val ? 'yes' : 'no';
    if (typeof val === 'object') return JSON.stringify(val);
    const str = String(val);
    if (str.length > 40) {
      return `"${str.substring(0, 40)}..."`;
    }
    return `"${str}"`;
  }

  protected getActivityPrefix(act: any): string {
    const meta = act.metadata ?? {};
    const ent = act.entity ?? 'record';

    switch (act.activity) {
      case 'create':
        if (act.activity === 'submission') return ' submitted ';
        return ' created a new ';
      case 'delete':
        return ' deleted ';
      case 'merge':
        return ' merged duplicate ';
      case 'import':
        return ' imported ';
      case 'export':
        return ' exported ';
      case 'assign':
        return ' assigned ';
      case 'unassign':
        return ' unassigned ';
      case 'close':
        return ' closed ';
      case 'reopen':
        return ' reopened ';
      case 'submission':
        return ' submitted ';
      case 'signup':
        return ' signed up for ';
      case 'send':
        return ' sent ';
      case 'update': {
        if (meta['action'] === 'add_comment') {
          return ' added a comment to ';
        }
        if (meta['action'] === 'add_subtask') {
          return ` added subtask "${meta['subtask_name']}" to `;
        }
        if (meta['action'] === 'toggle_subtask') {
          return ` ${meta['status'] === 'done' ? 'completed' : 'reopened'} subtask "${meta['subtask_name']}" on `;
        }
        if (meta['action'] === 'add_attachment') {
          return ` attached file "${meta['filename']}" to `;
        }
        if (meta['action'] === 'change_due_date') {
          if (meta['due_at']) {
            const parts = String(meta['due_at']).split('-');
            let formattedDate = String(meta['due_at']);
            if (parts.length === 3) {
              const year = parseInt(parts[0]!, 10);
              const month = parseInt(parts[1]!, 10) - 1;
              const day = parseInt(parts[2]!, 10);
              const dateVal = new Date(year, month, day);
              formattedDate = dateVal.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            }
            return ` changed the due date to ${formattedDate} on `;
          }
          return ' removed the due date on ';
        }
        if (meta['action'] === 'attach_tag' || meta['action'] === 'attach_issue') {
          return ` attached tag "${meta['name']}" to `;
        }
        if (meta['action'] === 'detach_tag' || meta['action'] === 'detach_issue') {
          return ` detached tag "${meta['name']}" from `;
        }
        if (meta['action'] === 'status_update') {
          return ' updated the status of ';
        }

        // Household address check
        const entLower = ent.toLowerCase();
        if (entLower === 'households' || entLower === 'household') {
          const addressFields = [
            'apt',
            'street_num',
            'street1',
            'street2',
            'city',
            'state',
            'zip',
            'country',
            'formatted_address',
          ];
          if (meta.changes && Object.keys(meta.changes).some((k) => addressFields.includes(k))) {
            return ' updated the address of ';
          }
        }
        return ' updated ';
      }
      default:
        return ` performed ${act.activity} on `;
    }
  }

  protected getEntityLabelText(act: any): string {
    const entLower = (act.entity ?? '').toLowerCase();
    const meta = act.metadata ?? {};
    if (entLower === 'email' || entLower === 'emails') {
      return 'email';
    }

    let typePrefix = '';
    if (entLower === 'persons' || entLower === 'person' || entLower === 'people') typePrefix = 'person ';
    else if (entLower === 'households' || entLower === 'household') typePrefix = 'household ';
    else if (entLower === 'companies' || entLower === 'company') typePrefix = 'company ';
    else if (entLower === 'tasks' || entLower === 'task' || entLower === 'tasks_archived') typePrefix = 'task ';
    else if (entLower === 'teams' || entLower === 'team') typePrefix = 'team ';
    else if (entLower === 'tags' || entLower === 'tag') typePrefix = 'tag ';
    else if (entLower === 'web_forms' || entLower === 'web_form' || entLower === 'forms' || entLower === 'form')
      typePrefix = 'form ';
    else if (entLower === 'volunteer_events' || entLower === 'volunteer_event') typePrefix = 'volunteer event ';
    else if (entLower === 'volunteer_shifts' || entLower === 'volunteer_shift') typePrefix = 'volunteer shift ';
    else if (entLower === 'newsletters' || entLower === 'newsletter') typePrefix = 'newsletter ';

    let label = '';
    if (meta.entity_label) {
      label = meta.entity_label;
    } else if (entLower === 'persons' || entLower === 'person' || entLower === 'people') {
      const name =
        meta.person_name ||
        meta.name ||
        (act.first_name && act.last_name ? `${act.first_name} ${act.last_name}` : null);
      label = name || 'person #' + (act.entity_id || meta.id);
    } else if (entLower === 'households' || entLower === 'household') {
      label = meta.household_name || meta.address || 'household #' + (act.entity_id || meta.id);
    } else if (entLower === 'companies' || entLower === 'company') {
      label = meta.company_name || meta.name || 'company #' + (act.entity_id || meta.id);
    } else if (entLower === 'tasks' || entLower === 'task' || entLower === 'tasks_archived') {
      label = meta.task_name || meta.name || 'task #' + (act.entity_id || meta.id);
    } else if (entLower === 'volunteer_events' || entLower === 'volunteer_event') {
      label = meta.event_name || meta.name || 'event #' + (act.entity_id || meta.id);
    } else if (entLower === 'teams' || entLower === 'team') {
      label = meta.team_name || meta.name || 'team #' + (act.entity_id || meta.id);
    } else if (entLower === 'tags' || entLower === 'tag') {
      label = meta.tag_name || meta.name || 'tag #' + (act.entity_id || meta.id);
    } else {
      label = meta.name || meta.subject || meta.title || meta.task_name || '#' + (act.entity_id || meta.id);
    }

    const normLabel = label.trim().toLowerCase();
    const normPrefix = typePrefix.trim().toLowerCase();

    if (normPrefix && normLabel.startsWith(normPrefix)) {
      return label;
    }
    if (normPrefix === 'volunteer event' && normLabel.startsWith('event')) {
      return 'volunteer ' + label;
    }
    return `${typePrefix}${label}`;
  }

  protected getActivitySuffix(act: any): string {
    const meta = act.metadata ?? {};
    if (act.activity === 'assign') {
      const assignee = meta['assigned_to_name'] ?? meta['person_name'] ?? 'someone';
      return ` to ${assignee}`;
    }
    if (act.activity === 'update' && meta.changes) {
      const parts: string[] = [];
      const keys = Object.keys(meta.changes);
      if (keys.length > 0) {
        for (const key of keys) {
          const change = meta.changes[key];
          const fieldName = key.replace(/_/g, ' ');
          const fromVal = this.formatValue(change.from);
          const toVal = this.formatValue(change.to);
          parts.push(`${fieldName} from ${fromVal} to ${toVal}`);
        }
        return ` (changed ${parts.join(', ')})`;
      }
    }
    return '';
  }

  protected getEntityLink(act: any): { path: string; params?: Record<string, string>; label?: string } | null {
    const metadata = act.metadata ?? {};
    const id = act.entity_id || metadata.id || metadata.event_id;
    if (!id) return null;

    const entity = act.entity?.toLowerCase();
    switch (entity) {
      case 'email':
      case 'emails':
        // Deep-link to inbox and pre-select the email
        return { path: '/inbox', params: { email: id }, label: undefined };
      case 'person':
      case 'persons':
      case 'contact':
      case 'contacts':
        return { path: `/people/${id}`, label: undefined };
      case 'household':
      case 'households':
        return { path: `/households/${id}`, label: undefined };
      case 'task':
      case 'tasks':
      case 'tasks_archived':
        return { path: `/tasks/${id}`, label: undefined };
      case 'volunteer_events':
      case 'volunteer_event':
      case 'volunteer_shifts':
      case 'volunteer_shift': {
        const eventId = metadata.event_id || id;
        return { path: `/events/${eventId}`, label: undefined };
      }
      case 'newsletter':
      case 'newsletters':
        return { path: `/newsletters/${id}`, label: undefined };
      case 'web_forms':
      case 'web_form':
      case 'form':
      case 'forms':
        return { path: `/forms/${id}`, label: undefined };
      case 'company':
      case 'companies':
        return { path: `/companies/${id}`, label: undefined };
      case 'team':
      case 'teams':
        return { path: `/teams/${id}`, label: undefined };
      case 'user':
      case 'users':
        return { path: `/users/${id}`, label: undefined };
      default:
        return null;
    }
  }

  protected onUserChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedUser.set(val);
    this.refreshFeed();
  }

  protected onEntityChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedEntity.set(val);
    this.refreshFeed();
  }

  protected onActivityChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedActivity.set(val);
    this.refreshFeed();
  }

  protected hasActiveFilters(): boolean {
    return !!(this.selectedUser() || this.selectedEntity() || this.selectedActivity());
  }

  protected clearFilters() {
    this.selectedUser.set('');
    this.selectedEntity.set('');
    this.selectedActivity.set('');
    this.refreshFeed();
  }
}
