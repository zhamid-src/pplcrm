import {
  ExportCsvInputType,
  ExportCsvResponseType,
  IAuthKeyPayload,
  UpdateHouseholdsType,
  getAllOptionsType,
} from '@common';
import { TRPCError } from '@trpc/server';

import { BaseRepository, QueryParams } from '../../lib/base.repo';
import { fingerprintFull, fingerprintStreet, isBlankAddress } from '../../lib/address-normalize';
import { HouseholdRepo } from './repositories/households.repo';
import { MapHouseholdsTagsRepo } from './repositories/map-households-tags.repo';
import { TagsRepo } from '../tags/repositories/tags.repo';
import { BaseController } from '../../lib/base.controller';
import { SettingsController } from '../settings/controller';
import { OperationDataType } from 'common/src/lib/kysely.models';

/**
 * Controller for managing household records and their associated tags.
 */
export class HouseholdsController extends BaseController<'households', HouseholdRepo> {
  private mapHouseholdsTagRepo = new MapHouseholdsTagsRepo();
  private settingsController = new SettingsController();
  private tagsRepo = new TagsRepo();

  constructor() {
    super(new HouseholdRepo());
  }

  /**
   * Delete multiple households by ID, silently skipping any that are marked
   * `is_placeholder`. Placeholder households are created at tenant setup time
   * and serve as the permanent catch-all for people with no address.
   *
   * @param auth - Auth context
   * @param idsToDelete - Household IDs requested for deletion
   */
  public async deleteManyForTenant(auth: IAuthKeyPayload, idsToDelete: string[]) {
    // Filter out any placeholder households — they are permanent and undeletable
    const placeholders = await this.getRepo().getPlaceholderIds(auth.tenant_id, idsToDelete);
    const safeIds = idsToDelete.filter((id) => !placeholders.has(id));

    if (safeIds.length === 0) return false;
    return this.deleteMany(auth.tenant_id, safeIds);
  }

  /**
   * Add a new household entry for the authenticated user's tenant.
   *
   * @param payload - Household data to insert
   * @param auth - Auth context with tenant and user ID
   * @returns The created household
   */
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

  /**
   * Override update to recompute address fingerprints when address fields change.
   * The fingerprint update is attempted in a separate step so that the main update
   * always succeeds — even if the address_fp_* columns have not been migrated yet.
   */
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
          geocoding_status: isBlankAddress(merged) ? 'failed' : 'pending',
          district: null,
          precinct: null,
          ward: null,
        };
        await super.update({ ...input, row: fpRow as unknown as OperationDataType<'households', 'update'> });

        // Queue geocoding background job if updated address is not blank
        if (!isBlankAddress(merged)) {
          await this.getRepo()
            .db.insertInto('background_jobs' as any)
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

        // Get all member persons of this household to queue duplicates maintenance
        const members = await this.getRepo()
          .db.selectFrom('persons')
          .select('id')
          .where('tenant_id', '=', input.tenant_id)
          .where('household_id', '=', input.id)
          .execute();
        const memberIds = members.map((m) => String(m.id));

        if (memberIds.length > 0) {
          await this.getRepo()
            .db.insertInto('background_jobs' as any)
            .values({
              tenant_id: input.tenant_id,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'potential_duplicates_maintenance',
                tenant_id: input.tenant_id,
                person_ids: memberIds,
                group_keys: [],
              }),
              run_at: new Date(),
              max_attempts: 3,
            })
            .execute();
        }
      } catch (err) {
        console.error('Failed to update address fingerprint and queue duplicates maintenance', err);
      }
    }

    return result;
  }

  /**
   * Attach a tag to a household. Creates the tag if it doesn't exist.
   *
   * @param household_id - ID of the household to tag
   * @param name - Name of the tag to attach
   * @param auth - Auth context
   * @returns The result of the map insertion
   */
  public async attachTag(household_id: string, name: string, type: 'tag' | 'issue' = 'tag', auth: IAuthKeyPayload) {
    const placeholders = await this.getRepo().getPlaceholderIds(auth.tenant_id, [household_id]);
    if (placeholders.has(household_id)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot attach tags to the placeholder household.',
      });
    }

    const row = {
      name,
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

  /**
   * Detach (remove) a tag from a household by name.
   *
   * @param tenant_id - Tenant ID
   * @param household_id - Household ID
   * @param tag_name - Name of the tag to remove
   */
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
      console.error('Failed to log detach tag activity', e);
    }
  }

  /**
   * Get all households and include the count of people in each household.
   *
   * @param auth - Auth context
   * @returns Array of households with people counts
   */
  public getAllWithPeopleCount(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    const { tags, ...queryParams } = options || {};
    return this.getRepo().getAllWithPeopleCount({
      tenant_id: auth.tenant_id,
      options: queryParams as QueryParams<'households' | 'tags' | 'map_households_tags' | 'persons'>,
      tags,
    });
  }

  /**
   * Retrieve the number of people associated with a household.
   */
  public getPeopleCount(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getPeopleCount({ tenant_id: auth.tenant_id, id });
  }

  /**
   * Get a list of all distinct tags used across households for a tenant.
   *
   * @param auth - Auth context
   * @returns List of unique tag names
   */
  public getDistinctTags(auth: IAuthKeyPayload, type?: 'tag' | 'issue') {
    return this.getRepo().getDistinctTags(auth.tenant_id, type);
  }

  /**
   * Get all tags associated with a specific household.
   *
   * @param id - Household ID
   * @param auth - Auth context
   * @returns List of tags for the household
   */
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
      const response = this.buildCsvResponse(rows, input);
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

  /**
   * Internal method to link a tag to a household in the mapping table.
   *
   * @param row - Mapping row containing tag ID and household ID
   * @returns The result of the insert operation
   * @throws TRPCError if tag_id is missing
   */
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

  /**
   * Find potential duplicate households for a tenant.
   */
  public async findPotentialDuplicates(auth: IAuthKeyPayload) {
    return this.getRepo().findPotentialDuplicates(auth.tenant_id);
  }

  /**
   * Merge a duplicate household into a primary household.
   */
  public async mergeHouseholds(target_id: string, source_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().mergeHouseholds({
      tenant_id: auth.tenant_id,
      target_id,
      source_id,
      user_id: auth.user_id,
    });
  }

  /**
   * Queue a background job to recompute address fingerprints for a tenant.
   */
  public async recomputeAddressFingerprints(tenantId: string): Promise<void> {
    await this.getRepo()
      .db.insertInto('background_jobs' as any)
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
