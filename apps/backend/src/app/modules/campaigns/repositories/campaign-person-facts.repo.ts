import type { Transaction } from 'kysely';

import { BaseRepository } from '../../../lib/base.repo';
import type { Models, OperationDataType } from '../../../../../../../libs/common/src/lib/kysely.models';
import type { SupportLevel, VotingStatus, FactSource } from '../../../../../../../libs/common/src';

/**
 * Campaign-scoped person facts (§15): support level + voting status, one row per
 * (campaign, person). No row / NULL field = Unknown. Upserts touch only the
 * fields the caller provided — a knock that records support must not wipe an
 * earlier voting status, and vice versa.
 */
export class CampaignPersonFactsRepo extends BaseRepository<'campaign_person_facts'> {
  constructor() {
    super('campaign_person_facts');
  }

  public async upsertFact(
    input: {
      tenant_id: string;
      campaign_id: string;
      person_id: string;
      user_id: string;
      /** undefined = leave unchanged; null = reset to Unknown. */
      support_level?: SupportLevel | null;
      voting_status?: VotingStatus | null;
      source: FactSource;
    },
    trx?: Transaction<Models>,
  ) {
    const now = new Date();
    const hasSupport = input.support_level !== undefined;
    const hasVoting = input.voting_status !== undefined;
    if (!hasSupport && !hasVoting) return undefined;

    const supportFields = hasSupport
      ? {
          support_level: input.support_level,
          support_source: input.support_level == null ? null : input.source,
          support_recorded_by: input.support_level == null ? null : input.user_id,
          support_recorded_at: input.support_level == null ? null : now,
        }
      : {};
    const votingFields = hasVoting
      ? {
          voting_status: input.voting_status,
          voting_source: input.voting_status == null ? null : input.source,
          voting_recorded_by: input.voting_status == null ? null : input.user_id,
          voting_recorded_at: input.voting_status == null ? null : now,
        }
      : {};

    const row = {
      tenant_id: input.tenant_id,
      campaign_id: input.campaign_id,
      person_id: input.person_id,
      createdby_id: input.user_id,
      updatedby_id: input.user_id,
      ...supportFields,
      ...votingFields,
    } as OperationDataType<'campaign_person_facts', 'insert'>;

    return this.getInsert(trx)
      .values(row)
      .onConflict((oc) =>
        oc.columns(['tenant_id', 'campaign_id', 'person_id']).doUpdateSet({
          ...supportFields,
          ...votingFields,
          updatedby_id: input.user_id,
          updated_at: now,
        }),
      )
      .returningAll()
      .executeTakeFirst();
  }

  /** All of one person's facts across campaigns, newest campaign first — the history panel. */
  public async getForPerson(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .innerJoin('campaigns', 'campaigns.id', 'campaign_person_facts.campaign_id')
      .where('campaign_person_facts.tenant_id', '=', input.tenant_id)
      .where('campaign_person_facts.person_id', '=', input.person_id)
      .select([
        'campaign_person_facts.campaign_id',
        'campaign_person_facts.support_level',
        'campaign_person_facts.support_source',
        'campaign_person_facts.support_recorded_at',
        'campaign_person_facts.voting_status',
        'campaign_person_facts.voting_source',
        'campaign_person_facts.voting_recorded_at',
        'campaigns.name as campaign_name',
        'campaigns.kind as campaign_kind',
        'campaigns.status as campaign_status',
      ])
      .orderBy('campaigns.created_at', 'desc')
      .execute();
  }
}
