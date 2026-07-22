import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { debounce } from '../../../../../../../libs/common/src';
import { PersonsService } from '../../persons/services/persons-service';
import { CanvassingService } from '../services/canvassing-service';

interface PersonOption {
  id: string;
  name: string;
  contact: string;
}

/**
 * Assign a turf to a volunteer (COMPANION-APPS-PLAN.md §5 B1). Companion links
 * are personal — the access layer verifies the holder against this person's
 * email/mobile on file — so assignment starts with picking who it's for.
 */
@Component({
  selector: 'pc-assign-turf-dialog',
  imports: [FormsModule],
  template: `
    <dialog class="modal" [open]="true">
      <div class="modal-box flex max-w-md flex-col gap-4">
        <h3 class="text-sm font-semibold">Assign "{{ turfName() }}"</h3>
        <p class="text-xs text-base-content/60">
          The link is personal: the volunteer verifies a code sent to their email or mobile on file, and new volunteers
          need a one-time approval from an admin.
        </p>

        @if (!selected()) {
          <label class="input input-bordered flex w-full items-center gap-2">
            <input
              type="text"
              class="grow"
              placeholder="Search people by name…"
              aria-label="Search people"
              [ngModel]="query()"
              (ngModelChange)="onQuery($event)"
            />
          </label>
          @if (searching()) {
            <progress class="progress w-full"></progress>
          } @else if (options().length > 0) {
            <ul class="menu w-full rounded-box border border-base-300 bg-base-100 p-1">
              @for (opt of options(); track opt.id) {
                <li>
                  <button type="button" (click)="choose(opt)">
                    <span class="font-medium">{{ opt.name }}</span>
                    <span class="text-xs text-base-content/50">{{ opt.contact }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else if (query().trim().length > 1) {
            <p class="text-xs text-base-content/60">No people match. Check the spelling or add them first.</p>
          }
        } @else {
          <div class="flex items-center justify-between rounded-box border border-base-300 p-3">
            <div>
              <p class="font-medium">{{ selected()?.name }}</p>
              <p class="text-xs text-base-content/50">{{ selected()?.contact }}</p>
            </div>
            <button type="button" class="btn btn-ghost btn-xs" (click)="selected.set(null)">Change</button>
          </div>
          @if (!selected()?.contact) {
            <p class="text-xs text-warning-content">
              No email or mobile on file. Add one to their person record or the verification step can't reach them.
            </p>
          }
        }

        <div class="modal-action">
          <button type="button" class="btn btn-ghost btn-sm" (click)="cancelled.emit()">Cancel</button>
          <span [class.tooltip]="!selected()" [attr.data-tip]="!selected() ? 'Pick a volunteer to assign' : null">
            <button type="button" class="btn btn-primary btn-sm" [disabled]="!selected() || saving()" (click)="save()">
              @if (saving()) {
                Assigning…
              } @else {
                Assign & copy link
              }
            </button>
          </span>
        </div>
      </div>
      <div class="modal-backdrop" (click)="cancelled.emit()"></div>
    </dialog>
  `,
})
export class AssignTurfDialog {
  public readonly turfId = input.required<string>();
  public readonly turfName = input.required<string>();
  public readonly cancelled = output<void>();
  /** Emits the minted token + which channels the link was sent through (page copies the /t/ link). */
  public readonly assigned = output<{ token: string; sent: { email: boolean; sms: boolean } }>();

  protected readonly options = signal<PersonOption[]>([]);
  protected readonly query = signal('');
  protected readonly saving = signal(false);
  protected readonly selected = signal<PersonOption | null>(null);

  protected readonly searching = computed(() => this.searchGate.visible());

  private readonly alerts = inject(AlertService);
  private readonly personsSvc = inject(PersonsService);
  private readonly searchGate = createLoadingGate();
  private readonly svc = inject(CanvassingService);

  private readonly debouncedSearch = debounce(async (term: string) => {
    if (term.trim().length < 2) {
      this.options.set([]);
      return;
    }
    const end = this.searchGate.begin();
    try {
      const res = await this.personsSvc.getAllWithAddress({ searchStr: term.trim(), startRow: 0, endRow: 8 });
      const rows = (res?.rows ?? []) as Record<string, unknown>[];
      this.options.set(
        rows.map((r) => ({
          id: String(r['id']),
          name: [r['first_name'], r['last_name']].filter(Boolean).join(' ') || String(r['name'] ?? 'Unnamed person'),
          contact: [r['email'], r['mobile']].filter(Boolean).join(' · '),
        })),
      );
    } catch {
      this.options.set([]);
    } finally {
      end();
    }
  }, 250);

  protected choose(opt: PersonOption): void {
    this.selected.set(opt);
    this.options.set([]);
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.debouncedSearch(value);
  }

  protected async save(): Promise<void> {
    const person = this.selected();
    if (!person || this.saving()) return;
    this.saving.set(true);
    try {
      const res = await this.svc.assign({
        turf_id: this.turfId(),
        team_id: null,
        volunteer_person_id: person.id,
      });
      this.assigned.emit(res);
    } catch (err) {
      this.alerts.showError(err instanceof Error && err.message ? err.message : 'Failed to assign turf.');
    } finally {
      this.saving.set(false);
    }
  }
}
