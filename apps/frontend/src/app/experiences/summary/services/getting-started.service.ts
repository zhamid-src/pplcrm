import { Injectable, computed, inject, signal } from '@angular/core';

import { NewslettersService } from '../../newsletters/services/newsletters-service';
import { PersonsService } from '../../persons/services/persons-service';
import { SettingsService } from '../../settings/services/settings-service';

/** One first-run onboarding step, composed from real account state. */
export interface GettingStartedStep {
  id: 'import' | 'verify-sender' | 'first-newsletter';
  /** The step name, sentence case. */
  label: string;
  done: boolean;
  /** Evidence shown when done, e.g. "5,012 imported" — null until then. */
  evidence: string | null;
  /** Where the primary link for this step goes. */
  route: string;
  /** Primary-link label when this is the next incomplete step. */
  cta: string;
}

const DISMISS_KEY = 'pc-getting-started-dismissed';

/**
 * Drives the dashboard's first-run checklist by composing three existing signals — contact
 * count, a verified sending address, and whether any newsletter exists. No dedicated backend
 * endpoint: each fact comes from an endpoint that already ships. Dismissal persists locally.
 */
@Injectable({ providedIn: 'root' })
export class GettingStartedService {
  private readonly persons = inject(PersonsService);
  private readonly newsletters = inject(NewslettersService);
  private readonly settings = inject(SettingsService);

  private readonly _steps = signal<GettingStartedStep[] | null>(null);
  public readonly steps = this._steps.asReadonly();
  private readonly _dismissed = signal<boolean>(this.readDismissed());

  public readonly doneCount = computed(() => (this._steps() ?? []).filter((s) => s.done).length);
  public readonly total = computed(() => this._steps()?.length ?? 0);
  public readonly nextStep = computed<GettingStartedStep | null>(
    () => (this._steps() ?? []).find((s) => !s.done) ?? null,
  );
  private readonly allDone = computed(() => this._steps() !== null && this.nextStep() === null);
  /** Show the card only once loaded, not fully complete, and not dismissed. */
  public readonly visible = computed(() => !this._dismissed() && this._steps() !== null && !this.allDone());

  /** Fetch the three facts and (re)build the step list. No-op once dismissed. */
  public async refresh(): Promise<void> {
    if (this._dismissed()) return;

    const [contacts, newsletters] = await Promise.all([
      this.safeCount(() => this.persons.count()),
      this.safeCount(() => this.newsletters.count()),
    ]);
    await this.settings.load().catch(() => undefined);
    const sender = this.resolveVerifiedSender();

    this._steps.set([
      {
        id: 'import',
        label: 'Import your contacts',
        done: contacts > 0,
        evidence: contacts > 0 ? `${contacts.toLocaleString()} imported` : null,
        route: '/imports',
        cta: 'Import contacts',
      },
      {
        id: 'verify-sender',
        label: 'Verify a sending address',
        done: sender !== null,
        evidence: sender ? `${sender} verified` : null,
        route: '/workspace/communications',
        cta: 'Verify a sending address',
      },
      {
        id: 'first-newsletter',
        label: 'Send your first newsletter',
        done: newsletters > 0,
        evidence: newsletters > 0 ? `${newsletters.toLocaleString()} created` : null,
        route: '/newsletters/add',
        cta: 'Send your first newsletter',
      },
    ]);
  }

  /** Hide the card for good on this device. */
  public dismiss(): void {
    this._dismissed.set(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode / storage disabled — a non-persisted dismiss is still fine for the session */
    }
  }

  private resolveVerifiedSender(): string | null {
    const emails = this.settings.getValue<string[]>('communications.verified_emails') ?? [];
    if (emails.length) return emails[0] ?? null;
    const domains =
      this.settings.getValue<{ domain: string; status: string }[]>('communications.verified_domains') ?? [];
    return domains.find((d) => d.status === 'verified')?.domain ?? null;
  }

  private async safeCount(fn: () => Promise<number>): Promise<number> {
    try {
      return (await fn()) ?? 0;
    } catch {
      return 0;
    }
  }

  private readDismissed(): boolean {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  }
}
