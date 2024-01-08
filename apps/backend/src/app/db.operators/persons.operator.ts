import { BaseOperator } from './base.operator';

export class PersonsOperator extends BaseOperator<'persons'> {
  constructor() {
    super('persons');
  }
}
