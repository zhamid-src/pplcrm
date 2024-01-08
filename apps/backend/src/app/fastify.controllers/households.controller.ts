import { HouseholdOperator } from '../db.operators/households.operator';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<'households'> {
  constructor() {
    super(new HouseholdOperator());
  }
}
