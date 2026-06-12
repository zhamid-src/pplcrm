import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AddTeamType, UpdateTeamType, IAuthUser, AddTeamObj } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';

import { PersonsService } from '../../persons/services/persons-service';
import { TeamDetail, TeamsService } from '../services/teams-service';
import { ListsService } from '../../lists/services/lists-service';
import { AuthService } from '../../../auth/auth-service';
import { TasksService } from '../../tasks/services/tasks-service';

interface PersonOption {
  email: string | null;
  id: string;
  label: string;
}

import { DatePipe } from '@angular/common';

@Component({
  selector: 'pc-team-detail',
  imports: [FormField, RouterModule, Icon, DatePipe],
  templateUrl: './team-detail.html',
})
export class TeamDetailComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly persons = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teams = inject(TeamsService);
  private readonly lists = inject(ListsService);
  private readonly auth = inject(AuthService);
  private readonly tasksSvc = inject(TasksService);

  protected id: string | null = null;

  protected readonly detail = signal<TeamDetail | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly payload = signal({
    name: '',
    description: '',
    team_captain_id: '',
    team_lead_user_id: '',
    volunteer_ids: [] as string[],
    list_ids: [] as string[],
  });

  protected readonly form = form(this.payload, (p) => {
    validateStandardSchema(p, AddTeamObj);
  });

  protected readonly isNew = signal(false);
  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected signalPeople = signal<PersonOption[]>([]);
  protected readonly people = computed(() => this.signalPeople());
  protected readonly users = signal<IAuthUser[]>([]);
  protected readonly availableLists = signal<any[]>([]);
  protected readonly assignedLists = signal<any[]>([]);
  protected readonly teamTasks = signal<any[]>([]);
  protected readonly saving = signal(false);
  protected readonly volunteers = computed(() => this.detail()?.volunteers ?? []);

  constructor() {
    effect(() => {
      const options = this.people();
      if (options.length === 0) return;

      const current = untracked(this.payload);
      let nextCaptain = current.team_captain_id;
      let changed = false;

      if (nextCaptain && !options.some((p) => p.id === nextCaptain)) {
        nextCaptain = '';
        changed = true;
      }

      const currentVolunteers = current.volunteer_ids ?? [];
      const validIds = currentVolunteers.filter((id) => options.some((p) => p.id === id));
      if (validIds.length !== currentVolunteers.length) {
        changed = true;
      }

      if (changed) {
        this.payload.update((p) => ({
          ...p,
          team_captain_id: nextCaptain,
          volunteer_ids: validIds,
        }));
      }
    });
  }

  public async ngOnInit(): Promise<void> {
    const end = this._loading.begin();
    try {
      const mode = this.route.snapshot.data['mode'] as 'new' | 'edit' | undefined;
      this.isNew.set(mode === 'new');
      if (!this.isNew()) {
        this.id = this.route.snapshot.paramMap.get('id');
      }
      await Promise.all([this.loadPeople(), this.loadUsers(), this.loadLists(), this.loadTeam()]);

      if (this.isNew()) {
        const state = window.history.state;
        if (state && state.cloneData) {
          const sourceTeamId = state.cloneData.id;
          if (sourceTeamId) {
            try {
              const teamDetail = await this.teams.getById(sourceTeamId);
              this.payload.set({
                name: teamDetail.name ? `${teamDetail.name} (Copy)` : '',
                description: teamDetail.description ?? '',
                team_captain_id: teamDetail.team_captain_id ?? '',
                team_lead_user_id: teamDetail.team_lead_user_id ?? '',
                volunteer_ids: teamDetail.volunteers?.map((v) => v.id) ?? [],
                list_ids: teamDetail.list_ids ?? [],
              });
              this.assignedLists.set(teamDetail.lists ?? []);
            } catch (err) {
              console.error('Failed to load source team details for cloning', err);
              const data = state.cloneData;
              this.payload.set({
                name: data.name ? `${data.name} (Copy)` : '',
                description: data.description ?? '',
                team_captain_id: data.team_captain_id ?? '',
                team_lead_user_id: data.team_lead_user_id ?? '',
                volunteer_ids: [],
                list_ids: [],
              });
            }
          }
        }
      }
    } finally {
      end();
    }
  }

  protected captainLabel(captainId: string | null) {
    if (!captainId) return '—';
    const person = this.people().find((p) => p.id === captainId);
    return person?.label ?? '—';
  }

  protected isVolunteerSelected(id: string): boolean {
    return this.payload().volunteer_ids?.includes(id) ?? false;
  }

  protected onVolunteersChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(select.selectedOptions).map((o) => o.value);

    this.payload.update((p) => ({
      ...p,
      volunteer_ids: selectedOptions,
    }));
    this.form.volunteer_ids().markAsDirty();
  }

  protected isListSelected(id: string): boolean {
    return this.payload().list_ids?.includes(id) ?? false;
  }

  protected onListsChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(select.selectedOptions).map((o) => o.value);

    this.payload.update((p) => ({
      ...p,
      list_ids: selectedOptions,
    }));
    this.form.list_ids().markAsDirty();

    const matching = this.availableLists().filter((l) => selectedOptions.includes(l.id));
    this.assignedLists.set(matching);
  }

  protected async deleteTeam() {
    if (!this.id) return;
    const confirmed = confirm('Delete this team?');
    if (!confirmed) return;
    this.saving.set(true);
    try {
      await this.teams.delete(this.id);
      this.teams.triggerRefresh();
      this.alerts.showSuccess('Team deleted');
      await this.router.navigate(['/teams']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete team';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  protected async save(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    const raw = this.payload();

    this.saving.set(true);
    this.error.set(null);

    try {
      let result: TeamDetail;
      if (this.isNew()) {
        const payload: AddTeamType = {
          name: raw.name?.trim() ?? '',
          description: raw.description?.trim()?.length ? raw.description.trim() : null,
          team_captain_id: raw.team_captain_id || undefined,
          team_lead_user_id: raw.team_lead_user_id || undefined,
          volunteer_ids: raw.volunteer_ids ?? [],
          list_ids: raw.list_ids ?? [],
        };
        result = await this.teams.add(payload);
        this.teams.triggerRefresh();
        await this.router.navigate(['/teams']);
      } else if (this.id) {
        const payload: UpdateTeamType = {
          name: raw.name?.trim() ?? null,
          description: raw.description?.trim()?.length ? raw.description.trim() : null,
          team_captain_id: raw.team_captain_id || null,
          team_lead_user_id: raw.team_lead_user_id || null,
          volunteer_ids: raw.volunteer_ids ?? [],
          list_ids: raw.list_ids ?? [],
        };
        result = await this.teams.update(this.id, payload);
        this.teams.triggerRefresh();
        this.detail.set(result);
        this.setForm(result);
        this.form().reset();
        this.alerts.showSuccess('Team updated');
        await this.router.navigate(['/teams', this.id]);
        return;
      } else {
        throw new Error('Missing team identifier');
      }
      this.detail.set(result);
      this.setForm(result);
      this.form().reset();
      this.alerts.showSuccess(this.isNew() ? 'Team created' : 'Team updated');
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to save team';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  private async loadPeople() {
    try {
      const res = await this.persons.getAll({ limit: 500, tags: ['volunteer'] });
      const items = (res?.rows ?? []).map((person: any) => ({
        id: String(person.id ?? ''),
        label: `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'Unknown',
        email: person.email ?? null,
      }));
      this.signalPeople.set(items);
    } catch (err) {
      console.error('Failed to load volunteers list', err);
      this.signalPeople.set([]);
    }
  }

  private async loadUsers() {
    try {
      const us = await this.auth.getUsers();
      this.users.set(us || []);
    } catch (err) {
      console.error('Failed to load teammates list', err);
      this.users.set([]);
    }
  }

  private async loadLists() {
    try {
      const res = await this.lists.getAll({ limit: 1000 });
      this.availableLists.set(res?.rows ?? []);
    } catch (err) {
      console.error('Failed to load lists', err);
      this.availableLists.set([]);
    }
  }

  private async loadTeam() {
    if (this.isNew()) {
      this.detail.set(null);
      this.setForm(null);
      return;
    }
    if (!this.id) {
      this.error.set('Missing team identifier');
      return;
    }

    try {
      const team = await this.teams.getById(this.id);
      this.detail.set(team);
      this.setForm(team);
      const res = await this.tasksSvc.getAll({
        filterModel: { team_id: { value: this.id } },
      } as any);
      this.teamTasks.set(res?.rows ?? []);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load team';
      this.error.set(message);
      this.alerts.showError(message);
    }
  }

  private setForm(team: TeamDetail | null) {
    this.payload.set({
      name: team?.name ?? '',
      description: team?.description ?? '',
      team_captain_id: team?.team_captain_id ?? '',
      team_lead_user_id: team?.team_lead_user_id ?? '',
      volunteer_ids: team?.volunteers?.map((v) => v.id) ?? [],
      list_ids: team?.list_ids ?? [],
    });
    this.assignedLists.set(team?.lists ?? []);
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
