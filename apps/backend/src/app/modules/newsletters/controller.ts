import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload } from '@common';
import { sql } from 'kysely';

import { BaseController } from '../../lib/base.controller';
import { NewslettersRepo } from './repositories/newsletters.repo';
import { BadRequestError, NotFoundError } from '../../errors/app-errors';

export class NewslettersController extends BaseController<'newsletters', NewslettersRepo> {
  constructor() {
    super(new NewslettersRepo());
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getRepo().getAllWithCount(auth.tenant_id, input?.options as any);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: 'newsletters',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }

  public async sendNewsletter(tenant_id: string, id: string, userId: string): Promise<any> {
    const newsletter = (await this.getOneById({ tenant_id, id })) as any;
    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }
    if (newsletter.status === 'sent' || newsletter.status === 'queuing' || newsletter.status === 'sending') {
      throw new BadRequestError('Newsletter has already been sent or is currently sending');
    }

    let includeListIds: string[] = [];
    let excludeListIds: string[] = [];
    let includeTags: string[] = [];
    let excludeTags: string[] = [];

    try {
      if (newsletter.target_lists) {
        const listsObj = JSON.parse(newsletter.target_lists);
        if (Array.isArray(listsObj)) {
          includeListIds = listsObj;
        } else if (listsObj && typeof listsObj === 'object') {
          includeListIds = Array.isArray(listsObj.include) ? listsObj.include : [];
          excludeListIds = Array.isArray(listsObj.exclude) ? listsObj.exclude : [];
        }
      }
    } catch (e) {
      if (newsletter.target_lists) {
        includeListIds = newsletter.target_lists.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    try {
      if (newsletter.segments) {
        const segmentsObj = JSON.parse(newsletter.segments);
        if (Array.isArray(segmentsObj)) {
          includeTags = segmentsObj;
        } else if (segmentsObj && typeof segmentsObj === 'object') {
          includeTags = Array.isArray(segmentsObj.include) ? segmentsObj.include : [];
          excludeTags = Array.isArray(segmentsObj.exclude) ? segmentsObj.exclude : [];
        }
      }
    } catch (e) {
      if (newsletter.segments) {
        includeTags = newsletter.segments.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const db = this.getRepo().db;
    let query = db.selectFrom('persons')
      .select(['persons.email'])
      .where('persons.tenant_id', '=', tenant_id as any)
      .where('persons.email', 'is not', null)
      .where('persons.email', '!=', '');

    query = query.where((eb) => {
      const conditions = [];
      if (includeListIds.length > 0) {
        conditions.push(
          eb.exists(
            db.selectFrom('map_lists_persons')
              .select('person_id')
              .where('map_lists_persons.tenant_id', '=', tenant_id as any)
              .whereRef('map_lists_persons.person_id' as any, '=', 'persons.id' as any)
              .where('map_lists_persons.list_id', 'in', includeListIds)
          )
        );
      }
      if (includeTags.length > 0) {
        conditions.push(
          eb.exists(
            db.selectFrom('map_peoples_tags')
              .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
              .select('map_peoples_tags.person_id')
              .where('map_peoples_tags.tenant_id', '=', tenant_id as any)
              .whereRef('map_peoples_tags.person_id' as any, '=', 'persons.id' as any)
              .where('tags.name', 'in', includeTags)
          )
        );
      }

      if (conditions.length === 0) {
        return eb.val(false);
      }
      return eb.or(conditions);
    });

    if (excludeListIds.length > 0) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            db.selectFrom('map_lists_persons')
              .select('person_id')
              .where('map_lists_persons.tenant_id', '=', tenant_id as any)
              .whereRef('map_lists_persons.person_id' as any, '=', 'persons.id' as any)
              .where('map_lists_persons.list_id', 'in', excludeListIds)
          )
        )
      );
    }

    if (excludeTags.length > 0) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            db.selectFrom('map_peoples_tags')
              .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
              .select('map_peoples_tags.person_id')
              .where('map_peoples_tags.tenant_id', '=', tenant_id as any)
              .whereRef('map_peoples_tags.person_id' as any, '=', 'persons.id' as any)
              .where('tags.name', 'in', excludeTags)
          )
        )
      );
    }

    const persons = await query.execute();
    const recipients = Array.from(new Set(persons.map((p) => p.email?.trim()).filter(Boolean))) as string[];

    if (recipients.length === 0) {
      throw new BadRequestError('No recipients found for the selected lists or tags');
    }

    const settingsRows = await db.selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenant_id as any)
      .where('key', 'in', [
        'communications.sendgrid_api_key',
        'communications.sendgrid_subuser_username',
        'communications.default_from_name',
        'communications.default_from_email',
      ])
      .execute();

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows) {
      if (typeof row.value === 'string') {
        settingsMap[row.key] = row.value;
      }
    }

    const sendgridApiKey = settingsMap['communications.sendgrid_api_key'];
    const subuserUsername = settingsMap['communications.sendgrid_subuser_username'];
    const fromName = settingsMap['communications.default_from_name'] || 'PeopleCRM Team';
    const fromEmail = settingsMap['communications.default_from_email'] || 'pplcrm@campaignraven.com';

    const updated = await this.update({
      tenant_id,
      id,
      row: {
        status: 'queuing',
        total_recipients: recipients.length,
        updatedby_id: userId,
        updated_at: new Date(),
      },
    });

    await db.insertInto('background_jobs' as any)
      .values({
        tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'send-newsletter',
          newsletterId: id,
          tenantId: tenant_id,
          userId: userId,
          recipients,
          offset: 0,
          deliveredCount: 0,
          fromName,
          fromEmail,
          subject: newsletter.subject || 'Newsletter',
          html: newsletter.html_content || '',
          text: newsletter.plain_text_content || undefined,
          sendgridApiKey,
          subuserUsername,
        }),
        run_at: new Date(),
      } as any)
      .execute();

    return updated;
  }

  public async getEngagementStats(tenant_id: string, id: string): Promise<any> {
    const db = this.getRepo().db;
    
    // 1. Fetch recent events (limit 100)
    const activities = await db
      .selectFrom('newsletter_events')
      .select(['email', 'event_type', 'timestamp', 'url', 'ip', 'user_agent'])
      .where('newsletter_id', '=', id as any)
      .where('tenant_id', '=', tenant_id as any)
      .where('event_type', 'in', ['open', 'click', 'bounce', 'dropped', 'unsubscribe', 'spamreport'])
      .orderBy('timestamp', 'desc')
      .limit(100)
      .execute();

    // 2. Fetch timeline data grouped by date/hour
    const timeline = await db
      .selectFrom('newsletter_events')
      .select([
        sql<string>`to_char(timestamp, 'YYYY-MM-DD HH24:00')`.as('time_bucket'),
        sql<number>`COUNT(id) FILTER (WHERE event_type = 'open')`.as('opens'),
        sql<number>`COUNT(id) FILTER (WHERE event_type = 'click')`.as('clicks'),
      ])
      .where('newsletter_id', '=', id as any)
      .where('tenant_id', '=', tenant_id as any)
      .where('event_type', 'in', ['open', 'click'])
      .groupBy('time_bucket')
      .orderBy('time_bucket', 'asc')
      .execute();

    return {
      activities: activities.map((a) => ({
        email: a.email,
        event_type: a.event_type,
        timestamp: a.timestamp,
        url: a.url,
        ip: a.ip,
        user_agent: a.user_agent,
      })),
      timeline: timeline.map((t) => ({
        time: t.time_bucket,
        opens: Number(t.opens),
        clicks: Number(t.clicks),
      })),
    };
  }
}
