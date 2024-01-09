/* eslint-disable @typescript-eslint/no-unused-vars */
import { HouseholdOperator } from '../db.operators/households.operator';

export class HouseholdsHelper {
  private household = new HouseholdOperator();

  public getAllWithPeopleCount() {
    this.household.getAllWithPeopleCount();
  }
  public findOne(id: bigint) {
    this.household.findOne(id);
  }
  public findAll() {
    this.household.findAll();
  }
}
