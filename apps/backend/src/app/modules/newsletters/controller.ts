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
      return this.buildCsvResponse(rows, input);
    }
    return super.exportCsv(input);
  }
}
