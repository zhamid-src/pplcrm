/* eslint-disable @typescript-eslint/no-unused-vars */
import { HouseholdOperator } from '../db.operators/households.operator';

export class HouseholdsHelper {
  private household = new HouseholdOperator();

  public findAll() {
    return this.household.findAll();
  }

  public findOne(id: bigint) {
    return this.household.findOne(id);
  }

  public getAllWithPeopleCount() {
    return this.household.getAllWithPeopleCount();
  }
}
