import type {
  ExportCsvInputType,
  ExportCsvResponseType,
  IAuthKeyPayload,
  UpdateHouseholdsType,
  getAllOptionsType,
} from '../../../../../../libs/common/src';
import { TRPCError } from '@trpc/server';
import { sql } from 'kysely';

import type { QueryParams } from '../../lib/base.repo';
import { BaseRepository } from '../../lib/base.repo';
import { fingerprintFull, fingerprintStreet, isBlankAddress, isIncompleteAddress } from '../../lib/address-normalize';
import { HouseholdRepo } from './repositories/households.repo';
import { MapHouseholdsTagsRepo } from './repositories/map-households-tags.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { matchCoordinatesToDistrict } from '../../lib/gis/geocoding';
import { BaseController } from '../../lib/base.controller';
import { SettingsController } from '../settings/controller';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../logger';

export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
  private mapHouseholdsTagRepo = new MapHouseholdsTagsRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();

  constructor() {
    super(new HouseholdRepo());
  }

  public async deleteManyForTenant(auth: IAuthKeyPayload, idsToDelete: string[]) {
    // Filter out any placeholder households — they are permanent and undeletable
    const placeholders = await this.getRepo().getPlaceholderIds(auth.tenant_id, idsToDelete);
    const safeIds = idsToDelete.filter((id) => !placeholders.has(id));

    if (safeIds.length === 0) return false;
    // Members move to the tenant's placeholder household (persons.household_id is
    // NOT NULL) rather than being cascade-deleted along with the household.
    return this.getRepo().deleteManyReassigningPersons({
      tenant_id: auth.tenant_id,
      ids: safeIds,
      user_id: auth.user_id,
    });
  }

  public async addHousehold(payload: UpdateHouseholdsType, auth: IAuthKeyPayload) {
    const campaign_id = await this.settingsController.getCurrentCampaignId(auth);

    const fp_street = fingerprintStreet({
      street_num: payload.street_num,
      street1: payload.street1,
      street2: payload.street2,
    });
    const fp_full = fingerprintFull({
      apt: payload.apt,
      street_num: payload.street_num,
      street1: payload.street1,
      street2: payload.street2,
      city: payload.city,
      state: payload.state,
      zip: payload.zip,
      country: payload.country,
    });

    // Try to dedupe: find existing by fingerprint
    if (fp_street || fp_full) {
      const existing = await this.getRepo().findByFingerprint({
        tenant_id: auth.tenant_id,
        campaign_id: String(campaign_id),
        fp_street: fp_street,
        fp_full: fp_full,
      });
      if (existing?.id) return { id: String(existing.id) } as any;
    }

    const row = {
      ...payload,
      address_fp_street: fp_street,
      address_fp_full: fp_full,
      campaign_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    };
    return this.add(row as OperationDataType<'households', 'insert'>);
  }

  public override async getOneById(input: { tenant_id: string; id: string }) {
    const household = await super.getOneById(input);
    if (!household) return undefined;

    const tenantRow = await (BaseRepository as any)['_db']
      .selectFrom('tenants')
      .select('placeholder_household_id')
      .where('id', '=', input.tenant_id)
      .executeTakeFirst();

    const is_placeholder = tenantRow?.placeholder_household_id
      ? String(tenantRow.placeholder_household_id) === String((household as any).id)
      : false;
    return {
      ...household,
      is_placeholder,
    } as any;
  }

  public override async update(input: {
    tenant_id: string;
    id: string;
    row: OperationDataType<'households', 'update'>;
  }) {
    const placeholders = await this.getRepo().getPlaceholderIds(input.tenant_id, [input.id]);
    if (placeholders.has(input.id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'The placeholder household cannot be edited.',
      });
    }

    const keys = Object.keys(input.row || {});
    const affectsAddress = keys.some((k) =>
      ['apt', 'street_num', 'street1', 'street2', 'city', 'state', 'zip', 'country'].includes(k),
    );

    // Perform the main update without fingerprint columns first
    const result = await super.update(input);

    // Attempt fingerprint recompute in a separate, non-fatal step
    if (affectsAddress) {
      try {
        const current = (await this.getOneById({ tenant_id: input.tenant_id, id: input.id })) as any;
        const merged = { ...current, ...(input.row as any) };

        let geocoding_status = isBlankAddress(merged) || isIncompleteAddress(merged) ? 'failed' : 'pending';
        let district = null;
        let precinct = null;
        let ward = null;

        // If autocomplete coordinates are provided in the update, use them and map boundaries synchronously
        if (input.row.lat && input.row.lng && Number(input.row.lat) !== 0 && Number(input.row.lng) !== 0) {
          try {
            const matched = await matchCoordinatesToDistrict(Number(input.row.lat), Number(input.row.lng));
            district = matched.district;
            precinct = matched.precinct;
            ward = matched.ward;
            geocoding_status = 'success';
          } catch (err) {
            logger.error({ err }, 'Failed to map coordinates to district during update');
          }
        }

        const fpRow: any = {
          address_fp_street: fingerprintStreet({
            street_num: merged.street_num,
            street1: merged.street1,
            street2: merged.street2,
          }),
          address_fp_full: fingerprintFull({
            apt: merged.apt,
            street_num: merged.street_num,
            street1: merged.street1,
            street2: merged.street2,
            city: merged.city,
            state: merged.state,
            zip: merged.zip,
            country: merged.country,
          }),
          geocoding_status,
          district,
          precinct,
          ward,
        };
        await super.update({ ...input, row: fpRow as unknown as OperationDataType<'households', 'update'> });

        // Queue geocoding background job if geocoding status is pending
        if (geocoding_status === 'pending') {
          await this.getRepo()
            .db.insertInto('background_jobs')
            .values({
              tenant_id: input.tenant_id,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'geocode_household',
                household_id: input.id,
                tenant_id: input.tenant_id,
              }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
        // Duplicate maintenance is only calculated nightly
      } catch (err) {
        logger.error({ err }, 'Failed to update address fingerprint and queue duplicates maintenance');
      }
    }

    return result;
  }

  public async attachTag(household_id: string, name: string, type: 'tag' | 'issue' = 'tag', auth: IAuthKeyPayload) {
    const placeholders = await this.getRepo().getPlaceholderIds(auth.tenant_id, [household_id]);
    if (placeholders.has(household_id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot attach tags to the placeholder household.',
      });
    }

    const randomHexColor = () =>
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
    const row = {
      name,
      color: randomHexColor(),
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      type,
    };

    const tag = await this.tagsRepo.addOrGet({
      row: row as OperationDataType<'tags', 'insert'>,
      onConflictColumn: 'name',
    });

    return this.addToMap({
      tag_id: tag?.id as string | undefined,
      household_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    });
  }

  public async detachTag(
    tenant_id: string,
    household_id: string,
    tag_name: string,
    type: 'tag' | 'issue' = 'tag',
    userId?: string,
  ) {
    const placeholders = await this.getRepo().getPlaceholderIds(tenant_id, [household_id]);
    if (placeholders.has(household_id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot detach tags from the placeholder household.',
      });
    }

    const tag = await this.tagsRepo.getIdByName({ tenant_id, name: tag_name, type });
    if (tag?.id) {
      await this.mapHouseholdsTagRepo.deleteMapping(tenant_id, household_id, tag.id);
    }

    try {
      if (userId) {
        await this.userActivity.log({
          tenant_id,
          user_id: userId,
          activity: 'update',
          entity: 'households',
          entity_id: household_id,
          quantity: 1,
          metadata: { id: household_id, action: `detach_${type}`, name: tag_name },
        });
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to log detach tag activity');
    }
  }

  public getAllWithPeopleCount(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithPeopleCount({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'>,
      tags,
    });
  }

  public getPeopleCount(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getPeopleCount({ tenant_id: auth.tenant_id, id });
  }

  public countDistinctWards(auth: IAuthKeyPayload) {
    return this.getRepo().countDistinctWards(auth.tenant_id);
  }

  public getDistinctTags(auth: IAuthKeyPayload, type?: 'tag' | 'issue') {
    return this.getRepo().getDistinctTags(auth.tenant_id, type);
  }

  public getTags(id: string, auth: IAuthKeyPayload, type?: 'tag' | 'issue') {
    return this.getRepo().getTags(id, auth.tenant_id, type);
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getAllWithPeopleCount(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input) as {
        csv: string;
        fileName: string;
        columns: string[];
        rowCount: number;
      };
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: 'households',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }

  private async addToMap(row: {
    tag_id: string | undefined;
    household_id: string;
    tenant_id: string;
    createdby_id: string;
    updatedby_id: string;
  }) {
    if (!row.tag_id) {
      throw new TRPCError({
        message: 'Failed to add the tag',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }

    return await this.mapHouseholdsTagRepo.add({
      row: row as OperationDataType<'map_households_tags', 'insert'>,
    });
  }

  public async getPotentialDuplicates(auth: IAuthKeyPayload, options?: { page?: number; pageSize?: number }) {
    return this.getRepo().getPotentialDuplicates(auth.tenant_id, options);
  }

  public async mergeHouseholds(target_id: string, source_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().mergeHouseholds({
      tenant_id: auth.tenant_id,
      target_id,
      source_id,
      user_id: auth.user_id,
    });
  }

  public async getLastFingerprintRecomputation(tenantId: string): Promise<{ lastRunAt: string | null }> {
    const job = await this.getRepo()
      .db.selectFrom('background_jobs')
      .select(['created_at'])
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'recompute_address_fingerprints')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    return { lastRunAt: job?.created_at ? new Date(job.created_at).toISOString() : null };
  }

  public async recomputeAddressFingerprints(tenantId: string): Promise<void> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const existingJob = await this.getRepo()
      .db.selectFrom('background_jobs')
      .select(['created_at'])
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'recompute_address_fingerprints')
      .where('created_at', '>', oneMonthAgo)
      .executeTakeFirst();

    if (existingJob) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Address fingerprints can only be recomputed once a month. A request was already submitted recently.',
      });
    }

    await this.getRepo()
      .db.insertInto('background_jobs')
      .values({
        tenant_id: tenantId,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'recompute_address_fingerprints',
          tenant_id: tenantId,
        }),
        run_at: new Date(),
        max_attempts: 3,
      })
      .execute();
  }
}
