import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, effect, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AddTeamType, UpdateTeamType } from "@common";
import { AlertService } from "@uxcommon/components/alerts/alert-service";
import { Icon } from "@uxcommon/components/icons/icon";

import { PersonsService } from "../../persons/services/persons-service";
import { TeamDetail, TeamsService } from "../services/teams-service";

interface PersonOption {
  email: string | null;
  id: string;
  label: string;
}

@Component({
  selector: 'pc-team-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, Icon],
  templateUrl: './team-detail.html',
})
export class TeamDetailComponent implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly persons = inject(PersonsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teams = inject(TeamsService);

  private id: string | null = null;

  protected readonly detail = signal<TeamDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    team_captain_id: [''],
    volunteer_ids: this.fb.control<string[]>([]),
  });
  protected readonly isNew = signal(false);
  protected readonly loading = signal(true);
  protected readonly people = signal<PersonOption[]>([]);
  protected readonly saving = signal(false);
  protected readonly volunteers = computed(() => this.detail()?.volunteers ?? []);

  constructor() {
    effect(() => {
      const options = this.people();
      const control = this.form.controls.team_captain_id;
      if (options.length === 0) return;
      const current = control.value;
      if (current && !options.some((p) => p.id === current)) {
        control.setValue('');
      }
      const volunteerControl = this.form.controls.volunteer_ids;
      const currentVolunteers = volunteerControl.value ?? [];
      const validIds = currentVolunteers.filter((id) => options.some((p) => p.id === id));
      if (validIds.length !== currentVolunteers.length) {
        volunteerControl.setValue(validIds, { emitEvent: false });
      }
    });
  }

  public ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] as 'new' | 'edit' | undefined;
    this.isNew.set(mode === 'new');
    if (!this.isNew()) {
      this.id = this.route.snapshot.paramMap.get('id');
    }
    this.loadPeople();
    this.loadTeam();
  }

  protected captainLabel(captainId: string | null) {
    if (!captainId) return '—';
    const person = this.people().find((p) => p.id === captainId);
    return person?.label ?? '—';
  }

  protected async deleteTeam() {
    if (!this.id) return;
    const confirmed = confirm('Delete this team?');
    if (!confirmed) return;
    this.saving.set(true);
    try {
      await this.teams.delete(this.id);
      this.alerts.showSuccess('Team deleted');
      await this.router.navigate(['../'], { relativeTo: this.route });
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete team';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  protected goBack() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UpdateTeamType & AddTeamType = {
      name: raw.name?.trim() ?? '',
      description: raw.description?.trim()?.length ? raw.description.trim() : null,
      team_captain_id: raw.team_captain_id ? raw.team_captain_id : null,
      volunteer_ids: raw.volunteer_ids ?? [],
    };

    this.saving.set(true);
    this.error.set(null);

    try {
      let result: TeamDetail;
      if (this.isNew()) {
        result = await this.teams.add(payload);
        await this.router.navigate(['../', result.id], { relativeTo: this.route });
      } else if (this.id) {
        result = await this.teams.update(this.id, payload);
        this.detail.set(result);
        this.setForm(result);
        this.form.markAsPristine();
        this.alerts.showSuccess('Team updated');
        return;
      } else {
        throw new Error('Missing team identifier');
      }
      this.detail.set(result);
      this.setForm(result);
      this.form.markAsPristine();
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
      this.people.set(items);
    } catch (err) {
      console.error('Failed to load volunteers list', err);
      this.people.set([]);
    }
  }

  private async loadTeam() {
    if (this.isNew()) {
      this.detail.set(null);
      this.setForm(null);
      this.loading.set(false);
      return;
    }
    if (!this.id) {
      this.error.set('Missing team identifier');
      this.loading.set(false);
      return;
    }

    try {
      const team = await this.teams.getById(this.id);
      this.detail.set(team);
      this.setForm(team);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load team';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private setForm(team: TeamDetail | null) {
    this.form.reset(
      {
        name: team?.name ?? '',
        description: team?.description ?? '',
        team_captain_id: team?.team_captain_id ?? '',
        volunteer_ids: team?.volunteers?.map((v) => v.id) ?? [],
      },
      { emitEvent: false },
    );
  }
}
