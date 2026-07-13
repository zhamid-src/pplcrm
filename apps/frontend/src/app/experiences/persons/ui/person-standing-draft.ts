import { Component, computed, inject, input, model } from '@angular/core';
import { Card as PcCard } from '@uxcommon/components/card/card';
import {
  SUPPORT_LEVELS,
  SUPPORT_LEVEL_LABELS,
  VOTING_STATUSES,
  VOTING_STATUS_LABELS,
} from '../../../../../../../libs/common/src';
import type { SupportLevel, VotingStatus } from '../../../../../../../libs/common/src';

import { CampaignContextService } from '../../../services/campaign-context.service';

/**
 * Campaign-standing capture for the NEW-person form (Campaigns §15). The real
 * standing card (`pc-person-campaign-facts`) writes campaign-scoped rows on every
 * change, which needs a person id that does not exist yet. This draft instead
 * collects the intended values into the parent's signals; the parent applies them
 * (upsertPersonFact / setSubscription) once the person is created. `do_not_contact`
 * is a plain person field, so the parent folds it into the add payload directly.
 */
@Component({
  selector: 'pc-person-standing-draft',
  imports: [PcCard],
  templateUrl: './person-standing-draft.html',
})
export class PersonStandingDraft {
  /** Primary email typed on the form — gates the subscribe control (no email, no consent). */
  readonly email = input<string>('');

  readonly supportLevel = model<SupportLevel | ''>('');
  readonly votingStatus = model<VotingStatus | ''>('');
  readonly subscribe = model<boolean>(false);
  readonly doNotContact = model<boolean>(false);

  protected readonly context = inject(CampaignContextService);

  protected readonly supportLevels = SUPPORT_LEVELS;
  protected readonly supportLabels = SUPPORT_LEVEL_LABELS;
  protected readonly votingStatuses = VOTING_STATUSES;
  protected readonly votingLabels = VOTING_STATUS_LABELS;

  protected readonly activeCampaign = this.context.activeCampaign;
  /** Archived contexts are read-only — campaign-scoped writes would be rejected. */
  protected readonly readonlyContext = this.context.isArchivedContext;
  protected readonly hasEmail = computed(() => !!this.email().trim());

  constructor() {
    void this.context.ensureLoaded();
  }

  protected onSupportChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.supportLevel.set(value === '' ? '' : (value as SupportLevel));
  }

  protected onVotingChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.votingStatus.set(value === '' ? '' : (value as VotingStatus));
  }

  protected onSubscribeToggle(event: Event): void {
    this.subscribe.set((event.target as HTMLInputElement).checked);
  }

  protected onDncToggle(event: Event): void {
    this.doNotContact.set((event.target as HTMLInputElement).checked);
  }
}
