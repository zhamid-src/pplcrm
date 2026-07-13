import { TRPCError } from '@trpc/server';
import { BaseController } from '../../lib/base.controller';
import { UserActivityRepo } from '../../lib/user-activity.repo';
import type {
  ExportCsvInputType,
  ExportCsvResponseType,
  getAllOptionsType,
  IAuthKeyPayload,
  InteractionType,
} from '../../../../../../libs/common/src';
import { ExportsRepo } from '../exports/repositories/exports.repo';

export class ActivityController extends BaseController<'user_activity', UserActivityRepo> {
  constructor() {
    super(new UserActivityRepo());
  }

  public async getFeed(auth: IAuthKeyPayload, options?: any) {
    return this.getRepo().getAllWithUser(auth.tenant_id, options || {});
  }

  public async getActivities(
    tenant_id: string,
    entity: string,
    entityId: string,
    options?: { startRow?: number; endRow?: number },
  ) {
    return this.getRepo().getForEntity(tenant_id, entity, entityId, options);
  }

  /**
   * Record a human-authored interaction (call / door knock / note / meeting)
   * against a record. Writes a single `user_activity` row attributed to the
   * signed-in user; the free-text note + occurrence time ride in `metadata`.
   */
  public async logInteraction(
    auth: IAuthKeyPayload,
    input: { entity: string; entityId: string; type: InteractionType; note?: string; occurredAt?: Date },
  ): Promise<void> {
    await this.getRepo().log({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      activity: input.type,
      entity: input.entity,
      entity_id: input.entityId,
      metadata: {
        note: input.note?.trim() || null,
        occurred_at: (input.occurredAt ?? new Date()).toISOString(),
      },
    });
  }

  // The Activity log page promises "the last 90 days" to every user, so retention is a
  // flat 90 days for all tenants (was 7 free / 28 paid) to keep that copy honest.
  public static readonly ACTIVITY_RETENTION_DAYS = 90;

  public async deleteOldActivities(): Promise<void> {
    const tenants = await this.getRepo().db.selectFrom('tenants').select(['id']).execute();

    const thresholdDate = new Date(Date.now() - ActivityController.ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    for (const tenant of tenants) {
      await this.getRepo()
        .db.deleteFrom('user_activity')
        .where('tenant_id', '=', tenant.id)
        .where('created_at', '<', thresholdDate)
        .execute();
    }
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (!auth) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const options: NonNullable<getAllOptionsType> = input?.options ?? {};
    // Remove pagination options to export all matching records
    const { startRow: _startRow, endRow: _endRow, ...restOptions } = options;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const fileName = input?.fileName?.trim() || `activity-feed-export-${ts}.csv`;
    const columns = input?.columns || [
      'id',
      'created_at',
      'user',
      'email',
      'activity',
      'entity',
      'entity_id',
      'quantity',
      'metadata',
    ];

    const exportsRepo = new ExportsRepo();
    const exportRecord = await exportsRepo.create({
      tenant_id: auth.tenant_id,
      user_id: auth.user_id,
      entity: 'user_activity',
      file_name: fileName,
      columns,
    });

    const exportId = String(exportRecord.id);

    await this.getRepo()
      .db.insertInto('background_jobs')
      .values({
        tenant_id: auth.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'export_csv',
          export_id: exportId,
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          entity: 'user_activity',
          table: 'user_activity',
          options: restOptions,
          columns,
          file_name: fileName,
        }),
        run_at: new Date(),
        max_attempts: 3,
      })
      .execute();

    return {
      status: 'processing',
    };
  }
}
