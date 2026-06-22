import { TRPCError } from '@trpc/server';
import { BaseController } from '../../lib/base.controller';
import { PersonConnectionsRepo } from './repositories/person-connections.repo';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';
import type { AddConnectionType } from '../../../../../../libs/common/src';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';

export class PersonConnectionsController extends BaseController<'person_connections', PersonConnectionsRepo> {
  constructor() {
    super(new PersonConnectionsRepo());
  }

  public getForPerson(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getForPerson({ tenant_id: auth.tenant_id, person_id });
  }

  public countForPerson(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().countForPerson({ tenant_id: auth.tenant_id, person_id });
  }

  public async addConnection(person_id: string, data: AddConnectionType, auth: IAuthKeyPayload) {
    const existing = await this.getRepo()
      .db.selectFrom('person_connections')
      .select('id')
      .where('tenant_id', '=', auth.tenant_id as any)
      .where('from_person_id', '=', person_id as any)
      .where('to_person_id', '=', data.to_person_id as any)
      .where('relation_type', '=', data.relation_type as any)
      .executeTakeFirst();

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A connection of this type already exists between these contacts.' });
    }

    const row = {
      tenant_id: auth.tenant_id,
      from_person_id: person_id,
      to_person_id: data.to_person_id,
      relation_type: data.relation_type,
      custom_label: data.custom_label ?? null,
      is_mutual: data.is_mutual ?? false,
      notes: data.notes ?? null,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'person_connections', 'insert'>;

    const result = await this.add(row);

    try {
      await this.getRepo().db.insertInto('user_activity' as any).values({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'assign',
        entity: 'persons',
        entity_id: person_id,
        quantity: 1,
        metadata: JSON.stringify({ relation_type: data.relation_type, to_person_id: data.to_person_id }),
        created_at: new Date(),
        updated_at: new Date(),
      }).execute();
    } catch (e) {
      console.error('Failed to log connection activity', e);
    }

    return result;
  }

  public async removeConnection(id: string, auth: IAuthKeyPayload) {
    const connection = await this.getRepo()
      .db.selectFrom('person_connections')
      .select(['from_person_id', 'to_person_id', 'relation_type'])
      .where('id', '=', id as any)
      .where('tenant_id', '=', auth.tenant_id as any)
      .executeTakeFirst();

    if (!connection) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found.' });
    }

    await this.delete(auth.tenant_id, id, auth.user_id);

    try {
      await this.getRepo().db.insertInto('user_activity' as any).values({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'unassign',
        entity: 'persons',
        entity_id: String(connection.from_person_id),
        quantity: 1,
        metadata: JSON.stringify({ relation_type: connection.relation_type, to_person_id: connection.to_person_id }),
        created_at: new Date(),
        updated_at: new Date(),
      }).execute();
    } catch (e) {
      console.error('Failed to log connection removal activity', e);
    }

    return { success: true };
  }
}
