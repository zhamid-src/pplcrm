import { BaseController } from '../../lib/base.controller';
import { CompaniesRepo } from './repositories/companies.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';
import type { OperationDataType } from 'common/src/lib/kysely.models';

export class CompaniesController extends BaseController<'companies', CompaniesRepo> {
  constructor() {
    super(new CompaniesRepo());
  }

  public addCompany(payload: any, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      description: payload.description ?? null,
      website: payload.website ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      industry: payload.industry ?? null,
      notes: payload.notes ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'companies', 'insert'>;
    return this.add(row);
  }

  public updateCompany(id: string, row: any, auth: IAuthKeyPayload) {
    const rowWithUpdatedBy = {
      ...row,
      updatedby_id: auth.user_id,
    } as OperationDataType<'companies', 'update'>;
    return this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });
  }

  public async getAllCompanies(auth: IAuthKeyPayload, options?: any) {
    return this.getAllWithCounts(auth.tenant_id, options);
  }
}
