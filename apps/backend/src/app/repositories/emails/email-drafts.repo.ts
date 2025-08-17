import { BaseRepository } from '../base.repo';
import { OperationDataType } from 'common/src/lib/kysely.models';

export class EmailDraftsRepo extends BaseRepository<'email_drafts'> {
  constructor() {
    super('email_drafts');
  }

  public async countByUser(tenant_id: string, user_id: string): Promise<number> {
    const res = await this.getSelect()
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenant_id)
      .where('user_id', '=', user_id)
      .executeTakeFirst();
    return Number((res as any)?.count || 0);
  }

  public listByUser(tenant_id: string, user_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('user_id', '=', user_id)
      .orderBy('updated_at', 'desc')
      .execute();
  }

  public async saveDraft(
    tenant_id: string,
    user_id: string,
    draft: {
      id?: string;
      to_list: string[];
      cc_list?: string[];
      bcc_list?: string[];
      subject?: string;
      body_html?: string;
      body_delta?: unknown;
    },
  ) {
    const row: OperationDataType<'email_drafts', 'insert'> = {
      tenant_id,
      user_id,
      to_list: draft.to_list || [],
      cc_list: draft.cc_list || [],
      bcc_list: draft.bcc_list || [],
      subject: draft.subject ?? null,
      body_html: draft.body_html ?? null,
      body_delta: (draft.body_delta as any) ?? null,
      meta: null,
      thread_id: null,
      is_locked: false,
      createdby_id: user_id,
      updatedby_id: user_id,
    } as OperationDataType<'email_drafts', 'insert'>;

    if (draft.id) {
      const upd = row as OperationDataType<'email_drafts', 'update'>;
      return this.update({ tenant_id, id: draft.id, row: upd });
    }
    return this.add({ row });
  }
}
