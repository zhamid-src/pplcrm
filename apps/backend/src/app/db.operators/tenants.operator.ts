import { BaseOperator } from './base.operator';

export class TenantsOperator extends BaseOperator<'tenants'> {
  constructor() {
    super('tenants');
  }
}
