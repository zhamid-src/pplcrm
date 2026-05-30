import { FastifyPluginCallback } from 'fastify';
import { BaseRepository } from '../../../lib/base.repo';
import { sql } from 'kysely';

const db = new BaseRepository('newsletters').db;

const newslettersWebhookRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.post('/webhook', async (req: any, reply) => {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    try {
      const processedNewsletters = new Set<string>();

      // Insert all events that have newsletter_id and tenant_id
      for (const ev of events) {
        if (!ev || !ev.newsletter_id || !ev.tenant_id || !ev.sg_event_id) {
          continue;
        }

        const newsletterId = ev.newsletter_id;
        const tenantId = ev.tenant_id;
        const eventType = ev.event || '';
        const email = ev.email || '';
        const sgEventId = ev.sg_event_id;
        const sgMessageId = ev.sg_message_id || null;
        const url = ev.url || null;
        const ip = ev.ip || null;
        const userAgent = ev.useragent || null;
        const timestamp = ev.timestamp ? new Date(ev.timestamp * 1000) : new Date();

        try {
          await db
            .insertInto('newsletter_events')
            .values({
              tenant_id: tenantId as any,
              newsletter_id: newsletterId as any,
              email,
              event_type: eventType,
              sg_event_id: sgEventId,
              sg_message_id: sgMessageId,
              url,
              ip,
              user_agent: userAgent,
              timestamp,
              created_at: new Date() as any,
            })
            .onConflict((oc) => oc.column('sg_event_id').doNothing())
            .execute();

          processedNewsletters.add(`${tenantId}:${newsletterId}`);
        } catch (insertErr) {
          req.log.error(insertErr, `Failed to insert webhook event ${sgEventId}`);
        }
      }

      // Recompute aggregates for each processed newsletter
      for (const key of processedNewsletters) {
        const [tenantId, newsletterId] = key.split(':');
        
        await db.transaction().execute(async (trx) => {
          // 1. Fetch aggregates
          const stats = await trx
            .selectFrom('newsletter_events')
            .select([
              sql<number>`COUNT(id) FILTER (WHERE event_type = 'delivered')`.as('delivered'),
              sql<number>`COUNT(id) FILTER (WHERE event_type IN ('bounce', 'dropped'))`.as('bounced'),
              sql<number>`COUNT(DISTINCT email) FILTER (WHERE event_type = 'open')`.as('unique_opens'),
              sql<number>`COUNT(DISTINCT email) FILTER (WHERE event_type = 'click')`.as('unique_clicks'),
              sql<number>`COUNT(id) FILTER (WHERE event_type = 'unsubscribe')`.as('unsubscribes'),
              sql<number>`COUNT(id) FILTER (WHERE event_type = 'spamreport')`.as('spamreports'),
              sql<Date | null>`MAX(timestamp) FILTER (WHERE event_type IN ('open', 'click'))`.as('last_engagement'),
            ])
            .where('newsletter_id', '=', newsletterId as any)
            .where('tenant_id', '=', tenantId as any)
            .executeTakeFirst();

          // 2. Fetch top links clicked
          const topLinksResult = await trx
            .selectFrom('newsletter_events')
            .select(['url'])
            .select(({ fn }) => fn.count<number>('id').as('clicks'))
            .where('newsletter_id', '=', newsletterId as any)
            .where('tenant_id', '=', tenantId as any)
            .where('event_type', '=', 'click')
            .where('url', 'is not', null)
            .groupBy('url')
            .orderBy('clicks', 'desc')
            .execute();

          const topLinks = topLinksResult.map((l) => ({
            url: l.url,
            clicks: Number(l.clicks),
          }));

          // 3. Update the newsletters table row
          const newsletter = await trx
            .selectFrom('newsletters')
            .select(['total_recipients'])
            .where('id', '=', newsletterId as any)
            .where('tenant_id', '=', tenantId as any)
            .executeTakeFirst();

          const totalRecipients = Number(newsletter?.total_recipients ?? 0);
          const uniqueOpens = Number(stats?.unique_opens ?? 0);
          const uniqueClicks = Number(stats?.unique_clicks ?? 0);

          const openRate = totalRecipients > 0 ? (uniqueOpens / totalRecipients) * 100 : 0;
          const clickRate = totalRecipients > 0 ? (uniqueClicks / totalRecipients) * 100 : 0;

          await trx
            .updateTable('newsletters')
            .set({
              delivered_count: Number(stats?.delivered ?? 0),
              bounce_count: Number(stats?.bounced ?? 0),
              unique_opens: uniqueOpens,
              unique_clicks: uniqueClicks,
              unsubscribe_count: Number(stats?.unsubscribes ?? 0),
              spam_complaint_count: Number(stats?.spamreports ?? 0),
              last_engagement_at: stats?.last_engagement || null,
              open_rate: openRate as any,
              click_rate: clickRate as any,
              top_links: JSON.stringify(topLinks) as any,
              updated_at: new Date(),
            })
            .where('id', '=', newsletterId as any)
            .where('tenant_id', '=', tenantId as any)
            .execute();
        });
      }

      return reply.code(200).send({ success: true, processedCount: processedNewsletters.size });
    } catch (err: any) {
      req.log.error(err, 'SendGrid webhook processing error');
      return reply.code(500).send({ error: err.message });
    }
  });

  done();
};

export default newslettersWebhookRoute;
