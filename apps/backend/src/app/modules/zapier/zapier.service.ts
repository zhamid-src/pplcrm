import crypto from 'crypto';
import { BaseRepository } from '../../lib/base.repo';

export type ZapierEventType =
  | 'person_created'
  | 'person_updated'
  | 'person_deleted'
  | 'person_tag_added'
  | 'person_tag_removed';

function pickPersonFields(p: any): Record<string, any> {
  if (!p) return {};
  return {
    id: p.id ? String(p.id) : null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    email: p.email ?? null,
    email2: p.email2 ?? null,
    mobile: p.mobile ?? null,
    home_phone: p.home_phone ?? null,
    linkedin: p.linkedin ?? null,
    twitter: p.twitter ?? null,
    facebook: p.facebook ?? null,
    instagram: p.instagram ?? null,
    notes: p.notes ?? null,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
  };
}

export { pickPersonFields };

export async function queueZapierTrigger(
  db: any,
  tenant_id: string,
  event_type: ZapierEventType,
  data: Record<string, any>,
): Promise<void> {
  const sub = await db
    .selectFrom('zapier_subscriptions' as any)
    .select('id')
    .where('tenant_id', '=', tenant_id as any)
    .where('event_type', '=', event_type)
    .executeTakeFirst();

  if (!sub) return;

  await db
    .insertInto('background_jobs' as any)
    .values({
      tenant_id,
      queue: 'default',
      status: 'pending',
      payload: JSON.stringify({ type: 'zapier_trigger', tenant_id, event_type, data }),
      run_at: new Date(),
      max_attempts: 5,
    })
    .execute();
}

export class ZapierService {
  private get db() {
    return BaseRepository.dbInstance;
  }

  async getOrCreateApiKey(tenant_id: string): Promise<string> {
    const row = await this.db
      .selectFrom('settings' as any)
      .select('value')
      .where('tenant_id', '=', tenant_id as any)
      .where('key', '=', 'zapier.api_key')
      .executeTakeFirst();

    if (row?.value) {
      const raw = row.value;
      return typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : String(raw);
    }

    return this.regenerateApiKey(tenant_id);
  }

  async regenerateApiKey(tenant_id: string): Promise<string> {
    const key = 'zap_' + crypto.randomBytes(32).toString('hex');
    await this.db
      .insertInto('settings' as any)
      .values({ tenant_id, key: 'zapier.api_key', value: JSON.stringify(key) })
      .onConflict((oc: any) =>
        oc.columns(['tenant_id', 'key']).doUpdateSet({ value: JSON.stringify(key), updated_at: new Date() }),
      )
      .execute();
    return key;
  }

  async getSubscriptions(tenant_id: string) {
    return this.db
      .selectFrom('zapier_subscriptions' as any)
      .select(['id', 'event_type', 'webhook_url', 'created_at', 'updated_at'])
      .where('tenant_id', '=', tenant_id as any)
      .execute();
  }

  async subscribe(tenant_id: string, event_type: ZapierEventType, webhook_url: string): Promise<void> {
    await this.db
      .insertInto('zapier_subscriptions' as any)
      .values({ tenant_id, event_type, webhook_url })
      .onConflict((oc: any) =>
        oc.columns(['tenant_id', 'event_type']).doUpdateSet({ webhook_url, updated_at: new Date() }),
      )
      .execute();
  }

  async unsubscribe(tenant_id: string, event_type: ZapierEventType): Promise<void> {
    await this.db
      .deleteFrom('zapier_subscriptions' as any)
      .where('tenant_id', '=', tenant_id as any)
      .where('event_type', '=', event_type)
      .execute();
  }

  async fireTrigger(tenant_id: string, event_type: ZapierEventType, data: Record<string, any>): Promise<void> {
    const subs = await this.db
      .selectFrom('zapier_subscriptions' as any)
      .select('webhook_url')
      .where('tenant_id', '=', tenant_id as any)
      .where('event_type', '=', event_type)
      .execute();

    for (const sub of subs) {
      try {
        const response = await fetch(sub.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          console.error(`[ZapierTrigger] POST to ${sub.webhook_url} failed with status ${response.status}`);
        }
      } catch (err: any) {
        console.error(`[ZapierTrigger] POST to ${sub.webhook_url} error: ${err.message}`);
      }
    }
  }

  async lookupTenantByApiKey(apiKey: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('settings' as any)
      .select('tenant_id')
      .where('key', '=', 'zapier.api_key')
      .where('value', '=', JSON.stringify(apiKey) as any)
      .executeTakeFirst();

    return row ? String(row.tenant_id) : null;
  }
}
