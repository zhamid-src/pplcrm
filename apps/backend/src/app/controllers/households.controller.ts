/* eslint-disable @typescript-eslint/no-unused-vars */
import { HouseholdOperator } from '../db.operators/households.operator';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households', HouseholdOperator> {
  constructor() {
    super(new HouseholdOperator());
  }

  public getAllWithPeopleCount() {
    return this.getOperator().getAllWithPeopleCount();
  }
}
