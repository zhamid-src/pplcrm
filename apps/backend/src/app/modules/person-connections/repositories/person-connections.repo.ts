import { Transaction } from 'kysely';
import { BaseRepository } from '../../../lib/base.repo';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class PersonConnectionsRepo extends BaseRepository<'person_connections'> {
  constructor() {
    super('person_connections');
  }

  public async getForPerson(input: { tenant_id: string; person_id: string }) {
    const { tenant_id, person_id } = input;
    return this.db
      .selectFrom('person_connections as pc')
      .innerJoin('persons as fp', (join) =>
        join.onRef('fp.id', '=', 'pc.from_person_id').on('fp.tenant_id', '=', tenant_id as any),
      )
      .innerJoin('persons as tp', (join) =>
        join.onRef('tp.id', '=', 'pc.to_person_id').on('tp.tenant_id', '=', tenant_id as any),
      )
      .select([
        'pc.id',
        'pc.tenant_id',
        'pc.from_person_id',
        'pc.to_person_id',
        'pc.relation_type',
        'pc.custom_label',
        'pc.is_mutual',
        'pc.notes',
        'pc.created_at',
        'fp.first_name as from_first_name',
        'fp.last_name as from_last_name',
        'tp.first_name as to_first_name',
        'tp.last_name as to_last_name',
      ])
      .where('pc.tenant_id', '=', tenant_id as any)
      .where((eb) =>
        eb.or([
          eb('pc.from_person_id', '=', person_id as any),
          eb.and([eb('pc.is_mutual', '=', true as any), eb('pc.to_person_id', '=', person_id as any)]),
        ]),
      )
      .orderBy('pc.created_at', 'desc')
      .execute();
  }

  public async countForPerson(input: { tenant_id: string; person_id: string }) {
    const { tenant_id, person_id } = input;
    const result = await this.db
      .selectFrom('person_connections as pc')
      .select(({ fn }) => [fn.count<number>('pc.id').as('cnt')])
      .where('pc.tenant_id', '=', tenant_id as any)
      .where((eb) =>
        eb.or([
          eb('pc.from_person_id', '=', person_id as any),
          eb.and([eb('pc.is_mutual', '=', true as any), eb('pc.to_person_id', '=', person_id as any)]),
        ]),
      )
      .executeTakeFirst();
    return Number(result?.cnt ?? 0);
  }

  public async deleteByPersonId(input: { tenant_id: string; person_id: string }, trx?: Transaction<Models>) {
    const db = trx ?? this.db;
    const { tenant_id, person_id } = input;
    return db
      .deleteFrom('person_connections')
      .where('tenant_id', '=', tenant_id as any)
      .where((eb) =>
        eb.or([
          eb('from_person_id', '=', person_id as any),
          eb('to_person_id', '=', person_id as any),
        ]),
      )
      .execute();
  }
}
