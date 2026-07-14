import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { email, form, required } from '@angular/forms/signals';
import { planDisplayName } from '@common';

import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';
import { Select as PcSelect } from '@uxcommon/components/select/select';

import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { SettingsService } from '../../settings/services/settings-service';
import { UserAdminService } from '../services/useradmin-service';

export interface SeatUsage {
  plan: string;
  seatLimit: number;
  seatsUsed: number;
}

const DEFAULT_ROLE = 'user';

/**
 * "Invite a user" dialog — the only way to add a staff login. Collects email, first and last
 * name, and a role, narrates seat usage honestly (an invitation holds a seat immediately), and
 * sends the invitation email on submit.
 */
@Component({
  selector: 'pc-invite-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, PcInput, PcSelect, ModalShell],
  templateUrl: './invite-user-dialog.html',
})
export class InviteUserDialog {
  private readonly users = inject(UserAdminService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly alerts = inject(AlertService);

  private readonly dlgRef = viewChild.required<ModalShell>('dlg');

  public readonly seatUsage = input<SeatUsage | null>(null);
  public readonly saved = output<void>();

  protected readonly submitting = signal(false);

  protected readonly currentUserRole = computed(() => this.auth.getUser()?.role ?? null);

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
    role: DEFAULT_ROLE,
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
    required(p.last_name);
  });

  protected readonly seatsRemaining = computed(() => {
    const usage = this.seatUsage();
    return usage ? Math.max(0, usage.seatLimit - usage.seatsUsed) : null;
  });

  protected readonly planLabel = computed(() => {
    const usage = this.seatUsage();
    return usage ? planDisplayName(usage.plan) : '';
  });

  public open(): void {
    this.payload.set({ email: '', first_name: '', last_name: '', role: DEFAULT_ROLE });
    this.form().reset();
    void this.prefillDefaultRole();
    this.dlgRef().show();
  }

  public close(): void {
    this.dlgRef().close();
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    this.form().markAsTouched();
    if (this.form().invalid()) return;

    this.submitting.set(true);
    try {
      const raw = this.payload();
      await this.users.add({
        email: raw.email.trim(),
        first_name: raw.first_name.trim(),
        last_name: raw.last_name.trim(),
        role: raw.role || null,
      });
      this.alerts.showSuccess(`Invitation sent to ${raw.email.trim()}`);
      this.saved.emit();
      this.close();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Unable to send the invitation';
      this.alerts.showError(message);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Prefill the role with the tenant's configured default invite role (best-effort). */
  private async prefillDefaultRole(): Promise<void> {
    try {
      await this.settings.load();
      const defaultRole = this.settings.getValue<string>('access.default_role');
      if (defaultRole) {
        this.payload.update((p) => ({ ...p, role: defaultRole }));
      }
    } catch {
      // Ignore — keep the built-in default role.
    }
  }
}
