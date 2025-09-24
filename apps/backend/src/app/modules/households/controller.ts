import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload, SettingsType, UpdateHouseholdsType, getAllOptionsType } from '@common';
import { TRPCError } from '@trpc/server';

import { QueryParams } from '../../lib/base.repo';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';
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
   * Add a new household entry for the authenticated user's tenant.
   *
   * @param payload - Household data to insert
   * @param auth - Auth context with tenant and user ID
   * @returns The created household
   */
  public async addHousehold(payload: UpdateHouseholdsType, auth: IAuthKeyPayload) {
    const campaign_id = (await this.settingsController.getCurrentCampaignId(auth)) as SettingsType;

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
      const existing = await this.getRepo().findByFingerprint(
        { tenant_id: auth.tenant_id, campaign_id: String(campaign_id), fp_street: fp_street, fp_full: fp_full },
      );
      if (existing?.id) return { id: String(existing.id) } as any;
    }

    const row = {
      ...payload,
      address_fp_street: fp_street,
      address_fp_full: fp_full,
      campaign_id,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
    };
    return this.add(row as OperationDataType<'households', 'insert'>);
  }

  /**
   * Override update to recompute address fingerprints when address fields change.
   */
  public override async update(input: { tenant_id: string; id: string; row: OperationDataType<'households', 'update'> }) {
    const keys = Object.keys(input.row || {});
    const affectsAddress = keys.some((k) =>
      ['apt', 'street_num', 'street1', 'street2', 'city', 'state', 'zip', 'country'].includes(k),
    );
    if (affectsAddress) {
      const current = (await this.getOneById({ tenant_id: input.tenant_id, id: input.id })) as any;
      const merged = { ...current, ...(input.row as any) };
      (input.row as any).address_fp_street = fingerprintStreet({
        street_num: merged.street_num,
        street1: merged.street1,
        street2: merged.street2,
      });
      (input.row as any).address_fp_full = fingerprintFull({
        apt: merged.apt,
        street_num: merged.street_num,
        street1: merged.street1,
        street2: merged.street2,
        city: merged.city,
        state: merged.state,
        zip: merged.zip,
        country: merged.country,
      });
    }
    return super.update(input);
  }

  /**
   * Attach a tag to a household. Creates the tag if it doesn't exist.
   *
   * @param household_id - ID of the household to tag
   * @param name - Name of the tag to attach
   * @param auth - Auth context
   * @returns The result of the map insertion
   */
  public async attachTag(household_id: string, name: string, auth: IAuthKeyPayload) {
    const row = {
      name,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
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
  public async detachTag(tenant_id: string, household_id: string, tag_name: string) {
    const tag = await this.tagsRepo.getIdByName({ tenant_id, name: tag_name });
    if (tag?.id) {
      const mapId = await this.mapHouseholdsTagRepo.getId(tenant_id, household_id, tag.id);
      if (mapId) {
        await this.mapHouseholdsTagRepo.delete({ tenant_id, id: mapId });
      }
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
  public getDistinctTags(auth: IAuthKeyPayload) {
    return this.getRepo().getDistinctTags(auth.tenant_id);
  }

  /**
   * Get all tags associated with a specific household.
   *
   * @param id - Household ID
   * @param auth - Auth context
   * @returns List of tags for the household
   */
  public getTags(id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getTags(id, auth.tenant_id);
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
}
