import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { ZapierService } from './zapier.service';
import { PersonsService } from '../persons/services/persons.service';
import type { IAuthKeyPayload } from '@common';

const zapierService = new ZapierService();
const personsService = new PersonsService();

const upsertPersonSchema = z.object({
  email: z.string().email('Valid email required for person matching').max(255),
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  mobile: z.string().trim().max(30).optional(),
  home_phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(10000).optional(),
  linkedin: z.string().trim().max(255).optional(),
  twitter: z.string().trim().max(255).optional(),
  facebook: z.string().trim().max(255).optional(),
  instagram: z.string().trim().max(255).optional(),
});

const tagActionSchema = z.object({
  email: z.string().email('Valid email required to identify the person').max(255),
  tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50),
});

async function resolveAuth(tenantId: string, db: any): Promise<IAuthKeyPayload | null> {
  const owner = await db
    .selectFrom('authusers')
    .select(['id', 'first_name', 'last_name', 'role'])
    .where('tenant_id', '=', tenantId)
    .where('role', 'in', ['owner', 'admin'])
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (!owner) return null;

  const name = [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Zapier';

  return {
    user_id: String(owner.id),
    tenant_id: tenantId,
    session_id: 'zapier',
    name,
    role: owner.role ?? 'admin',
    source: 'api',
  } as IAuthKeyPayload;
}

async function extractTenantId(req: any): Promise<string | null> {
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;
  return zapierService.lookupTenantByApiKey(apiKey);
}

const zapierInboundRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/persons/upsert', async (req, reply) => {
    const tenantId = await extractTenantId(req);
    if (!tenantId) {
      return reply.code(401).send({ error: 'Invalid or missing API key' });
    }

    const parsed = upsertPersonSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { email, ...fields } = parsed.data;

    try {
      const db =
        (personsService as any).personsRepo?.db ?? (await import('../../lib/base.repo')).BaseRepository.dbInstance;
      const auth = await resolveAuth(tenantId, db);
      if (!auth) {
        return reply.code(500).send({ error: 'Tenant has no admin user configured' });
      }

      const existing = await db
        .selectFrom('persons')
        .select(['id', 'email'])
        .where('tenant_id', '=', tenantId)
        .where('email', 'ilike', email.trim())
        .executeTakeFirst();

      if (existing) {
        const result = await personsService.updatePerson(String(existing.id), { email, ...fields } as any, auth);
        return reply.code(200).send({ action: 'updated', person: result });
      } else {
        const result = await personsService.addPerson({ email, ...fields } as any, auth);
        return reply.code(201).send({ action: 'created', person: result });
      }
    } catch (err: any) {
      console.error('[Zapier Inbound] /persons/upsert error:', err.message);
      return reply.code(500).send({ error: 'Failed to upsert person' });
    }
  });

  fastify.post('/persons/tag', async (req, reply) => {
    const tenantId = await extractTenantId(req);
    if (!tenantId) {
      return reply.code(401).send({ error: 'Invalid or missing API key' });
    }

    const parsed = tagActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { email, tag_name } = parsed.data;

    try {
      const db =
        (personsService as any).personsRepo?.db ?? (await import('../../lib/base.repo')).BaseRepository.dbInstance;
      const auth = await resolveAuth(tenantId, db);
      if (!auth) {
        return reply.code(500).send({ error: 'Tenant has no admin user configured' });
      }

      const person = await db
        .selectFrom('persons')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('email', 'ilike', email.trim())
        .executeTakeFirst();

      if (!person) {
        return reply.code(404).send({ error: 'No person found with that email' });
      }

      await personsService.attachTag(String(person.id), tag_name, 'tag', auth);
      return reply.code(200).send({ success: true });
    } catch (err: any) {
      console.error('[Zapier Inbound] /persons/tag error:', err.message);
      return reply.code(500).send({ error: 'Failed to add tag' });
    }
  });

  fastify.post('/persons/untag', async (req, reply) => {
    const tenantId = await extractTenantId(req);
    if (!tenantId) {
      return reply.code(401).send({ error: 'Invalid or missing API key' });
    }

    const parsed = tagActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { email, tag_name } = parsed.data;

    try {
      const db =
        (personsService as any).personsRepo?.db ?? (await import('../../lib/base.repo')).BaseRepository.dbInstance;
      const auth = await resolveAuth(tenantId, db);
      if (!auth) {
        return reply.code(500).send({ error: 'Tenant has no admin user configured' });
      }

      const person = await db
        .selectFrom('persons')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('email', 'ilike', email.trim())
        .executeTakeFirst();

      if (!person) {
        return reply.code(404).send({ error: 'No person found with that email' });
      }

      await personsService.detachTag({
        tenant_id: tenantId,
        person_id: String(person.id),
        name: tag_name,
        type: 'tag',
        user_id: auth.user_id,
        source: auth.source,
      });

      return reply.code(200).send({ success: true });
    } catch (err: any) {
      console.error('[Zapier Inbound] /persons/untag error:', err.message);
      return reply.code(500).send({ error: 'Failed to remove tag' });
    }
  });

  done();
};

export default zapierInboundRoute;
