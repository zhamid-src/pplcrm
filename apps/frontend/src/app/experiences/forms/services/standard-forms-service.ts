import { Service } from '@angular/core';
import { getAllOptionsType } from '../../../../../../../libs/common/src';
import { FormsService } from './forms-service';

@Service()
export class StandardFormsService extends FormsService {
  public override async getAll(options?: getAllOptionsType) {
    const result = await super.getAll(options);
    const filtered = result.rows.filter((r: any) => !r.form_type || r.form_type === 'standard');
    return { rows: filtered, count: filtered.length };
  }
}
