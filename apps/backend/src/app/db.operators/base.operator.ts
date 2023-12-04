import { sql } from 'kysely';
import { db } from '../kysely';
import { GetOperandType, Models, OperationDataType } from '../kysely.models';

export class BaseOperator<T extends keyof Models> {
  protected readonly table: T;

  constructor(tableIn: T) {
    this.table = tableIn;
  }

  public getAll() {
    return db.selectFrom(this.table).selectAll().execute();
  }
  public getById(id: GetOperandType<T, 'select', 'id'>) {
    return db
      .selectFrom(this.table)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }
  public getCount() {
    return db
      .selectFrom(this.table)
      .select(sql<string>`count(*)`.as('count'))
      .executeTakeFirst();
  }

  public async add(row: OperationDataType<T, 'insert'>) {
    return db.insertInto(this.table).values(row).executeTakeFirst();
  }

  public async update(
    id: GetOperandType<T, 'update', 'id'>,
    row: OperationDataType<T, 'update'>
  ) {
    return db
      .updateTable(this.table)
      .set(row)
      .where('id', '=', id)
      .executeTakeFirst();
  }

  public async delete(id: GetOperandType<T, 'select', 'id'>) {
    return db.deleteFrom(this.table).where('id', '=', id).executeTakeFirst();
  }
}
