import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { TeamsService } from '../services/teams-service';

// View-model for a team card (§15, Fig 17). Derived from the loosely-typed getAll rows.
interface TeamCard {
  id: string;
  name: string;
  description: string | null;
  volunteerCount: number;
  // The lead is a PERSON (the team captain) — the escalation owner per the spec's boundary rule.
  leadName: string | null;
}

@Component({
  selector: 'pc-teams-grid',
  imports: [RouterLink, Icon, GridHeaderComponent],
  templateUrl: './teams-grid.html',
})
export class TeamsGridComponent implements OnInit {
  private readonly teamsSvc = inject(TeamsService);
  private readonly alerts = inject(AlertService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly loaded = signal(false);
  protected readonly teams = signal<TeamCard[]>([]);

  public ngOnInit(): void {
    void this.load();
  }

  protected initialsOf(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 0);
    if (parts.length === 0) return '?';
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
    return (first + last).toUpperCase() || '?';
  }

  private async load(): Promise<void> {
    const end = this._loading.begin();
    try {
      const res = await this.teamsSvc.getAll({ startRow: 0, endRow: 200 });
      this.teams.set((res.rows ?? []).map((row) => this.toCard(row)));
    } catch {
      this.alerts.showError('Could not load teams');
    } finally {
      this.loaded.set(true);
      end();
    }
  }

  private toCard(row: Record<string, unknown>): TeamCard {
    const captain = typeof row['team_captain_name'] === 'string' ? row['team_captain_name'].trim() : '';
    const description = typeof row['description'] === 'string' && row['description'].trim() ? row['description'] : null;
    return {
      id: String(row['id'] ?? ''),
      name: typeof row['name'] === 'string' && row['name'].trim() ? row['name'] : 'Untitled team',
      description,
      volunteerCount: Number(row['volunteer_count'] ?? 0),
      leadName: captain ? captain : null,
    };
  }
}
