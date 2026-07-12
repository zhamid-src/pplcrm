import { Component, inject, input, output, signal } from '@angular/core';
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPES } from '@common';
import type { InteractionType } from '@common';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { ActivityService } from '@experiences/activity/services/activity.service';

interface InteractionOption {
  value: InteractionType;
  label: string;
  icon: PcIconNameType;
}

/**
 * Shared "Log an interaction" control: a split-button whose menu offers the
 * four interaction types (call / door knock / note / meeting). Picking one
 * opens a small modal to capture an optional note, then writes a
 * `user_activity` row via `activity.logInteraction` and emits `logged` so the
 * host page can refresh its activity feed. Reused on person, household and
 * company views (households phrase the feed as "Activity at this door").
 */
@Component({
  selector: 'pc-log-interaction',
  imports: [Icon, ModalShell],
  templateUrl: './log-interaction.html',
})
export class LogInteraction {
  /** DB table the record lives in: 'persons' | 'households' | 'companies'. */
  public readonly entity = input.required<string>();
  public readonly entityId = input.required<string>();
  public readonly label = input<string>('Log an interaction');

  /** Emitted after a successful log so the host can reload its feed. */
  public readonly logged = output<void>();

  private readonly activitySvc = inject(ActivityService);
  private readonly alertSvc = inject(AlertService);

  private readonly _loading = createLoadingGate();
  protected readonly saving = this._loading.visible;

  protected readonly options: InteractionOption[] = INTERACTION_TYPES.map((value) => ({
    value,
    label: INTERACTION_TYPE_LABELS[value],
    icon: this.iconFor(value),
  }));

  protected readonly open = signal(false);
  protected readonly selected = signal<InteractionOption | null>(null);
  protected readonly note = signal('');

  protected choose(option: InteractionOption): void {
    this.selected.set(option);
    this.note.set('');
    this.open.set(true);
    // Close the DaisyUI dropdown (it stays open until the trigger loses focus).
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  /**
   * Syncs state after the shell's dialog has closed (X, ESC, backdrop). While a
   * save is in flight the shell is non-dismissible, so a close here is final.
   */
  protected close(): void {
    this.open.set(false);
    this.selected.set(null);
  }

  protected async save(): Promise<void> {
    const option = this.selected();
    if (!option) return;
    const end = this._loading.begin();
    try {
      await this.activitySvc.logInteraction({
        entity: this.entity(),
        entityId: this.entityId(),
        type: option.value,
        note: this.note().trim() || undefined,
      });
      this.alertSvc.showSuccess(`${option.label} logged`);
      this.open.set(false);
      this.selected.set(null);
      this.logged.emit();
    } catch {
      this.alertSvc.showError('Could not log the interaction. Please try again.');
    } finally {
      end();
    }
  }

  private iconFor(type: InteractionType): PcIconNameType {
    switch (type) {
      case 'call':
        return 'phone';
      case 'door_knock':
        return 'map-pin';
      case 'note':
        return 'envelope';
      case 'meeting':
        return 'user-group';
    }
  }
}
