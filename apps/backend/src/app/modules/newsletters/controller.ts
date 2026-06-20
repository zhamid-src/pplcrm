import { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload } from '../../../../../../libs/common/src';
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

  public buildRecipientQuery(tenant_id: string, newsletter: any): any {
    let includeListIds: string[] = [];
    let excludeListIds: string[] = [];
    let includeTags: string[] = [];
    let excludeTags: string[] = [];

    // target_lists is jsonb (returns pre-parsed object from Kysely) or legacy text string.
    const parseJsonField = (value: unknown): unknown => {
      if (value == null) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value; // already parsed object from jsonb column
    };

    const listsObj = parseJsonField(newsletter.target_lists);
    if (Array.isArray(listsObj)) {
      includeListIds = listsObj as string[];
    } else if (listsObj && typeof listsObj === 'object') {
      const obj = listsObj as Record<string, unknown>;
      includeListIds = Array.isArray(obj['include']) ? (obj['include'] as string[]) : [];
      excludeListIds = Array.isArray(obj['exclude']) ? (obj['exclude'] as string[]) : [];
    } else if (typeof listsObj === 'string' && listsObj) {
      includeListIds = (listsObj as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const segmentsObj = parseJsonField(newsletter.segments);
    if (Array.isArray(segmentsObj)) {
      includeTags = segmentsObj as string[];
    } else if (segmentsObj && typeof segmentsObj === 'object') {
      const obj = segmentsObj as Record<string, unknown>;
      includeTags = Array.isArray(obj['include']) ? (obj['include'] as string[]) : [];
      excludeTags = Array.isArray(obj['exclude']) ? (obj['exclude'] as string[]) : [];
    } else if (typeof segmentsObj === 'string' && segmentsObj) {
      includeTags = (segmentsObj as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const db = this.getRepo().db;
    let query = db
      .selectFrom('persons')
      .where('persons.tenant_id', '=', tenant_id as any)
      .where('persons.email', 'is not', null)
      .where('persons.email', '!=', '');

    query = query.where((eb) => {
      const conditions = [];
      if (includeListIds.length > 0) {
        conditions.push(
          eb.exists(
            db
              .selectFrom('map_lists_persons')
              .select('person_id')
              .where('map_lists_persons.tenant_id', '=', tenant_id as any)
              .whereRef('map_lists_persons.person_id' as any, '=', 'persons.id' as any)
              .where('map_lists_persons.list_id', 'in', includeListIds),
          ),
        );
      }
      if (includeTags.length > 0) {
        conditions.push(
          eb.exists(
            db
              .selectFrom('map_peoples_tags')
              .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
              .select('map_peoples_tags.person_id')
              .where('map_peoples_tags.tenant_id', '=', tenant_id as any)
              .whereRef('map_peoples_tags.person_id' as any, '=', 'persons.id' as any)
              .where('tags.name', 'in', includeTags),
          ),
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
            db
              .selectFrom('map_lists_persons')
              .select('person_id')
              .where('map_lists_persons.tenant_id', '=', tenant_id as any)
              .whereRef('map_lists_persons.person_id' as any, '=', 'persons.id' as any)
              .where('map_lists_persons.list_id', 'in', excludeListIds),
          ),
        ),
      );
    }

    if (excludeTags.length > 0) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            db
              .selectFrom('map_peoples_tags')
              .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
              .select('map_peoples_tags.person_id')
              .where('map_peoples_tags.tenant_id', '=', tenant_id as any)
              .whereRef('map_peoples_tags.person_id' as any, '=', 'persons.id' as any)
              .where('tags.name', 'in', excludeTags),
          ),
        ),
      );
    }

    return query;
  }

  public async sendNewsletter(tenant_id: string, id: string, userId: string): Promise<any> {
    const newsletter = (await this.getOneById({ tenant_id, id })) as any;
    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }
    if (newsletter.status === 'sent' || newsletter.status === 'queuing' || newsletter.status === 'sending') {
      throw new BadRequestError('Newsletter has already been sent or is currently sending');
    }

    const db = this.getRepo().db;
    const baseQuery = this.buildRecipientQuery(tenant_id, newsletter);

    // Get total count of unique recipients using a distinct count query
    const countResult = await baseQuery
      .select(({ fn }: any) => fn.count(sql`DISTINCT persons.email`).as('count'))
      .executeTakeFirst();
    const totalRecipients = Number((countResult as any)?.count || 0);

    if (totalRecipients === 0) {
      throw new BadRequestError('No recipients found for the selected lists or tags');
    }

    const updated = await this.update({
      tenant_id,
      id,
      row: {
        status: 'queuing',
        total_recipients: totalRecipients,
        delivered_count: 0,
        updatedby_id: userId,
        updated_at: new Date(),
      },
    });

    await db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'send-newsletter',
          newsletterId: id,
          tenantId: tenant_id,
          userId: userId,
          offset: 0,
          deliveredCount: 0,
        }),
        run_at: new Date(),
      })
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
