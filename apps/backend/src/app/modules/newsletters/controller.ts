import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload } from '@common';

import { BaseController } from '../../lib/base.controller';
import { NewslettersRepo } from './repositories/newsletters.repo';

export class NewslettersController extends BaseController<'newsletters', NewslettersRepo> {
  constructor() {
    super(new NewslettersRepo());
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getRepo().getAllWithCount(auth.tenant_id, input?.options as any);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: 'newsletters',
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
}
