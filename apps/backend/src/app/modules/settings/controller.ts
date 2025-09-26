import { IAuthKeyPayload, SettingsEntryType } from '@common';
import { TRPCError } from '@trpc/server';

import { SettingsRepo } from './repositories/settings.repo';
import { BaseController } from '../../lib/base.controller';

/**
 * Controller for managing settings
 *
 * Extends the base controller to provide default CRUD operations
 * for the `settings` table.
 */
export class SettingsController extends BaseController<'settings', SettingsRepo> {
  constructor() {
    super(new SettingsRepo());
  }

  public async getCurrentCampaignId(auth: IAuthKeyPayload) {
    const row = await this.getRepo().getByKey({
      tenant_id: auth.tenant_id,
      key: 'current_campaign',
    });

    if (!row) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Current campaign setting not found.',
      });
    }

    const value = row.value;

    if (typeof value === 'number' || typeof value === 'string') {
      return String(value);
    }

    if (value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
      const id = (value as Record<string, unknown>)['id'];
      if (typeof id === 'number' || typeof id === 'string') {
        return String(id);
      }
    }

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Current campaign setting is malformed.',
    });
  }

  public async getSnapshot(auth: IAuthKeyPayload) {
    const rows = await this.getRepo().getAllForTenant(auth.tenant_id);

    return rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  public async upsert(auth: IAuthKeyPayload, entries: SettingsEntryType[]) {
    await this.getRepo().upsertMany({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      entries: entries.map((entry) => ({
        key: entry.key,
        value: entry.value as any,
      })),
    });

    return this.getSnapshot(auth);
  }
}
