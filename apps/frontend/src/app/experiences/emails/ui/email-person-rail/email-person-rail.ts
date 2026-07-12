import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@uxcommon/components/icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailStateStore } from '../../services/store/email-state.store';
import { PersonsService } from '../../../persons/services/persons-service';
import type { EmailType } from '../../../../../../../../libs/common/src/lib/models';

interface RailTag {
  color?: string | null;
  name: string;
}

interface RailPerson {
  company_name?: string | null;
  email?: string | null;
  first_name?: string | null;
  id: string;
  issues?: RailTag[];
  last_name?: string | null;
  tags?: RailTag[];
}

/**
 * Person context rail (§5) — a 236px card giving the inbox a "who am I talking to"
 * answer. Reuses the person already resolved for the email header; adds no backend.
 * Collapses to a 48px strip that keeps the avatar initials (identity, never hidden).
 */
@Component({
  selector: 'pc-email-person-rail',
  imports: [RouterLink, Icon, TagItem, TimeAgoPipe],
  templateUrl: 'email-person-rail.html',
})
export class EmailPersonRail {
  protected readonly stateStore = inject(EmailStateStore);
  private readonly store = inject(EmailsStore);
  private readonly personsSvc = inject(PersonsService);
  private readonly alertSvc = inject(AlertService);

  public readonly email = input<EmailType | null>(null);

  protected readonly collapsed = this.stateStore.personRailCollapsed;

  protected readonly addingToContacts = signal(false);

  protected readonly person = computed<RailPerson | null>(() => {
    const e = this.email();
    if (!e) return null;
    const header = this.store.getEmailHeaderById(e.id)();
    const p = (header as { person?: RailPerson } | null | undefined)?.person;
    return p ?? null;
  });

  /** Falls back to the raw sender when no person record is matched. */
  protected readonly displayName = computed<string>(() => {
    const p = this.person();
    if (p) {
      const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
      if (full) return full;
      if (p.email) return p.email;
    }
    const e = this.email();
    return e?.from_email ?? 'Unknown sender';
  });

  protected readonly initial = computed<string>(() => (this.displayName()[0] ?? '?').toUpperCase());

  /** Honest role subline: only what the tags/fields actually say (§0 — no faked data). */
  protected readonly subline = computed<string | null>(() => {
    const p = this.person();
    if (!p) return null;
    const parts: string[] = [];
    const tagNames = (p.tags ?? []).map((t) => t.name.toLowerCase());
    if (tagNames.includes('donor')) parts.push('Donor');
    else if (tagNames.includes('volunteer')) parts.push('Volunteer');
    if (p.company_name) parts.push(p.company_name);
    return parts.length ? parts.join(' · ') : null;
  });

  protected readonly tags = computed<RailTag[]>(() => this.person()?.tags ?? []);
  protected readonly issues = computed<RailTag[]>(() => this.person()?.issues ?? []);

  protected toggle(): void {
    this.stateStore.togglePersonRail();
  }

  /** Creates a person from the unmatched sender; the rail then re-resolves the match (§5). */
  protected async addToContacts(): Promise<void> {
    const e = this.email();
    if (!e?.from_email || this.addingToContacts()) return;

    this.addingToContacts.set(true);
    try {
      await this.personsSvc.add({
        email: e.from_email,
        first_name: e.sender_first_name ?? this.guessFirstName(e.from_name),
        last_name: e.sender_last_name ?? this.guessLastName(e.from_name),
      });
      await this.store.refreshEmailHeader(e.id);
      this.alertSvc.showSuccess(`Added ${e.from_email} to your contacts.`);
    } catch (err) {
      this.alertSvc.showError(err instanceof Error ? err.message : 'Unable to add contact');
    } finally {
      this.addingToContacts.set(false);
    }
  }

  private guessFirstName(fromName: string | undefined): string | undefined {
    return fromName?.trim().split(/\s+/)[0];
  }

  private guessLastName(fromName: string | undefined): string | undefined {
    const parts = fromName?.trim().split(/\s+/) ?? [];
    return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
  }
}
