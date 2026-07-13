import type { IAuthKeyPayload } from '../../../../../../libs/common/src';
import { ForbiddenError, InternalError, NotFoundError } from '../../errors/app-errors';
import { BaseController } from '../../lib/base.controller';
import { SettingsRepo } from '../settings/repositories/settings.repo';
import { DEMO_MANIFEST_SETTINGS_KEY, DemoSeedManifestObj, deleteDemoData } from './demo-seed';
import type { DemoSeedManifest } from './demo-seed';

/**
 * Exit demo mode: delete exactly the rows the signup seeder created (tracked in
 * the demo_seed_manifest settings row), keep everything else — the six starter
 * forms, the system tags, and anything the user created while exploring.
 */
export class DemoController extends BaseController<'settings', SettingsRepo> {
  constructor() {
    super(new SettingsRepo());
  }

  public async exitDemoMode(auth: IAuthKeyPayload) {
    const manifest = await this.loadManifest(auth.tenant_id);

    const tenant = await this.getRepo()
      .db.selectFrom('tenants')
      .select(['placeholder_household_id', 'subscription_status'])
      .where('id', '=', auth.tenant_id)
      .executeTakeFirst();

    // Demo mode is the pre-plan test drive: exiting (and the configuration it
    // unlocks) requires a subscription first. Same active-status rule as billing.
    const hasActiveSubscription = ['active', 'trialing'].includes(tenant?.subscription_status ?? '');
    if (!hasActiveSubscription) {
      throw new ForbiddenError(
        'Choose a plan before exiting demo mode. Once you subscribe, you can remove the demo data and set up your workspace.',
      );
    }

    const placeholderHouseholdId = tenant?.placeholder_household_id;
    if (!placeholderHouseholdId) {
      throw new InternalError('This workspace has no placeholder household. Cannot exit demo mode.');
    }

    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        await deleteDemoData(
          {
            tenant_id: auth.tenant_id,
            user_id: auth.user_id,
            manifest,
            placeholder_household_id: String(placeholderHouseholdId),
          },
          trx,
        );
      });

    return { success: true };
  }

  private async loadManifest(tenant_id: string): Promise<DemoSeedManifest> {
    const row = await this.getRepo().getByKey({ tenant_id, key: DEMO_MANIFEST_SETTINGS_KEY });
    if (!row) {
      throw new NotFoundError('The demo data has already been removed.');
    }
    const raw: unknown = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    const parsed = DemoSeedManifestObj.safeParse(raw);
    if (!parsed.success) {
      throw new InternalError('The demo data record is malformed. Please contact support.');
    }
    return parsed.data;
  }
}
