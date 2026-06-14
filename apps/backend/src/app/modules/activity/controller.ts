import { BaseController } from '../../lib/base.controller';
import { UserActivityRepo } from '../../lib/user-activity.repo';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload } from '@common';

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
    options?: { startRow?: number; endRow?: number }
  ) {
    return this.getRepo().getForEntity(tenant_id, entity, entityId, options);
  }

  public async deleteOldActivities(): Promise<void> {
    const tenants = await this.getRepo().db.selectFrom('tenants')
      .select(['id', 'subscription_plan'])
      .execute();

    for (const tenant of tenants) {
      const isHigherPlan = tenant.subscription_plan && tenant.subscription_plan !== 'free';
      const days = isHigherPlan ? 28 : 7;
      const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      await this.getRepo().db.deleteFrom('user_activity')
        .where('tenant_id', '=', tenant.id as any)
        .where('created_at', '<', thresholdDate)
        .execute();
    }
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    const options = (input?.options ?? {}) as any;
    // Remove pagination options to export all matching records
    const { startRow, endRow, ...restOptions } = options;
    const { rows } = await this.getRepo().getAllWithUser(input.tenant_id, restOptions);

    const records = rows.map((row) => ({
      id: String(row.id),
      created_at: new Date(row.created_at).toISOString(),
      user: `${row.first_name} ${row.last_name || ''}`.trim(),
      email: row.email,
      activity: row.activity,
      entity: row.entity,
      entity_id: row.entity_id || '',
      quantity: row.quantity,
      metadata: row.metadata ? JSON.stringify(row.metadata) : '',
    }));

    const columns = input?.columns || ['id', 'created_at', 'user', 'email', 'activity', 'entity', 'entity_id', 'quantity', 'metadata'];
    const response = this.buildCsvResponse(records, { ...input, columns });

    if (auth) {
      try {
        await this.userActivity.log({
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          activity: 'export',
          entity: 'user_activity',
          quantity: response.rowCount,
          metadata: {
            requested_columns: response.columns,
            returned_columns: response.columns,
            file_name: response.fileName,
          },
        });

        const user = await this.getRepo().db.selectFrom('authusers')
          .select(['email'])
          .where('id', '=', auth.user_id as any)
          .executeTakeFirst();
        if (user && user.email) {
          const mailService = new TransactionalEmailService();
          await mailService.sendMail({
            to: user.email,
            subject: `Your Export is Ready: ${response.fileName}`,
            text: `Hi ${auth.name},\n\nYour export of ${response.rowCount} records from the Activity Feed is ready.\n\nFile Name: ${response.fileName}\nDownload Link: http://localhost:4200/downloads/${response.fileName}`,
            html: `<p>Hi ${auth.name},</p><p>Your export of <strong>${response.rowCount}</strong> records from the <strong>Activity Feed</strong> is ready.</p><p><strong>File Name:</strong> ${response.fileName}<br><strong>Download Link:</strong> <a href="http://localhost:4200/downloads/${response.fileName}">Download CSV</a></p>`,
          });
        }
      } catch (err) {
        console.error('Failed to log export activity or send email alert', err);
      }
    }

    return response;
  }
}
