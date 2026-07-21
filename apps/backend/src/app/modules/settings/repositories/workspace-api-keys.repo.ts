import type { Insertable } from 'kysely';
import { sql } from 'kysely';
import { BaseRepository } from '../../../lib/base.repo';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class WorkspaceApiKeysRepo extends BaseRepository<'workspace_api_keys'> {
  constructor() {
    super('workspace_api_keys');
  }

  public async getByTenantId(tenantId: string) {
    return this.getSelect().selectAll().where('tenant_id', '=', tenantId).executeTakeFirst();
  }

  // Cross-tenant BY DESIGN: this resolves which tenant owns a presented API key, so there is
  // no tenant_id to scope by (same posture as the former Zapier settings-table lookup,
  // SECURITY-REVIEW.md 2.4). The no-unscoped-db-query rule cannot see through getSelect(),
  // so this carries no disable comment — this note is the reviewed justification.
  public async getByKeyHash(keyHash: string) {
    return this.getSelect().selectAll().where('key_hash', '=', keyHash).executeTakeFirst();
  }

  public async create(tenantId: string, keyHash: string, keyPreview: string) {
    const row: Insertable<Models['workspace_api_keys']> = {
      tenant_id: tenantId,
      key_hash: keyHash,
      key_preview: keyPreview,
      created_at: new Date(),
    };

    return this.getInsert()
      .values(row)
      .onConflict((oc) =>
        oc.columns(['tenant_id']).doUpdateSet({
          key_hash: (eb) => eb.ref('excluded.key_hash'),
          key_preview: (eb) => eb.ref('excluded.key_preview'),
          created_at: sql`now()`,
          last_used_at: null,
        }),
      )
      .returningAll()
      .executeTakeFirst();
  }

  public async updateLastUsed(tenantId: string) {
    return this.getUpdate().set({ last_used_at: new Date() }).where('tenant_id', '=', tenantId).executeTakeFirst();
  }

  public async deleteByTenantId(tenantId: string) {
    return this.getDelete().where('tenant_id', '=', tenantId).execute();
  }
}
