import { TableType } from "../../../../../common/src/lib/kysely.models";
import { BaseOperator } from "./base.operator";

export class TagsOperator extends BaseOperator<TableType.tags> {
  constructor() {
    super(TableType.tags);
  }

  /**
   * Get the tag by name
   * @param name
   * @returns
   */
  public getOneByName(name: string) {
    return this.selectFrom().where("name", "=", name).executeTakeFirst();
  }
}
