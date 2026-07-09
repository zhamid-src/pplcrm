import type { ExportCsvInputType, ExportCsvResponseType, IAuthKeyPayload } from '../../../../../../libs/common/src';
import type { Models, OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import type { Transaction } from 'kysely';
import { sql } from 'kysely';

import { env } from '../../../env';
import { BaseController } from '../../lib/base.controller';
import { CampaignsRepo } from '../campaigns/repositories/campaigns.repo';
import { NewslettersRepo } from './repositories/newsletters.repo';
import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { NewsletterEmailService } from '../../lib/mail/newsletter-mail.service';
import { extractMergeTokens, renderNewsletterHtml, resolveMergeSubstitutions } from '../../lib/mail/newsletter-render';

const DEFAULT_FROM_NAME = 'PeopleCRM Team';
const DEFAULT_FROM_EMAIL = 'pplcrm@campaignraven.com';

export interface SendTestEmailInput {
  subject: string;
  html: string;
  text?: string;
  to: string;
  fromName?: string;
  fromEmail?: string;
}

export class NewslettersController extends BaseController<'newsletters', NewslettersRepo> {
  private readonly campaignsRepo = new CampaignsRepo();

  constructor() {
    super(new NewslettersRepo());
  }

  /**
   * map_newsletters_lists is the source of truth for list targeting (the
   * legacy JSONB target_lists column is still dual-written by callers during
   * the transition, but nothing reads it for behavior anymore).
   */
  public override async add(row: OperationDataType<'newsletters', 'insert'>, trx?: Transaction<Models>) {
    // Every newsletter belongs to a campaign (§15). Callers that predate the
    // context switcher fall back to the tenant's office context.
    const pending = row as Record<string, unknown>;
    if (!pending['campaign_id']) {
      const campaigns = await this.campaignsRepo.getSwitcherList({ tenant_id: String(pending['tenant_id']) });
      const office = campaigns.find((c) => c.kind === 'office');
      if (!office) throw new BadRequestError('No campaign context exists for this organization.');
      pending['campaign_id'] = String(office.id);
    }
    const result = await super.add(row, trx);
    const rowObj = row as Record<string, unknown>;
    const resultObj = result as Record<string, unknown> | undefined;
    if (resultObj?.['id'] != null && rowObj['target_lists'] !== undefined) {
      await this.syncTargetLists(
        String(rowObj['tenant_id']),
        String(resultObj['id']),
        rowObj['target_lists'],
        String(rowObj['createdby_id'] ?? resultObj['createdby_id']),
        trx,
      );
    }
    return result;
  }

  public override async update(input: {
    tenant_id: string;
    id: string;
    row: OperationDataType<'newsletters', 'update'>;
  }) {
    const result = await super.update(input);
    const rowObj = input.row as Record<string, unknown>;
    const resultObj = result as Record<string, unknown> | undefined;
    if (rowObj['target_lists'] !== undefined) {
      await this.syncTargetLists(
        input.tenant_id,
        input.id,
        rowObj['target_lists'],
        String(rowObj['updatedby_id'] ?? resultObj?.['createdby_id']),
      );
    }
    return result;
  }

  /** Tolerates every legacy payload shape: {include, exclude}, bare array, JSON string, CSV string. */
  private parseTargetListSets(value: unknown): { include: string[]; exclude: string[] } {
    let parsed: unknown = value;
    if (typeof parsed === 'string') {
      const raw = parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return {
          include: raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          exclude: [],
        };
      }
    }
    if (Array.isArray(parsed)) {
      return { include: parsed.map((v) => String(v)), exclude: [] };
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const toIds = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
      return { include: toIds(obj['include']), exclude: toIds(obj['exclude']) };
    }
    return { include: [], exclude: [] };
  }

  /** Replace the newsletter's map_newsletters_lists rows; ids that don't resolve to a live list in the tenant are dropped. */
  private async syncTargetLists(
    tenant_id: string,
    newsletterId: string,
    rawTargetLists: unknown,
    actorId: string,
    trx?: Transaction<Models>,
  ): Promise<void> {
    const db = trx ?? this.getRepo().db;
    const { include, exclude } = this.parseTargetListSets(rawTargetLists);

    const candidates = [...new Set([...include, ...exclude])].filter((id) => /^\d+$/.test(id));
    let liveIds = new Set<string>();
    if (candidates.length > 0) {
      const rows = await db
        .selectFrom('lists')
        .select('id')
        .where('tenant_id', '=', tenant_id)
        .where('id', 'in', candidates)
        .execute();
      liveIds = new Set(rows.map((r) => String(r.id)));
    }

    await db
      .deleteFrom('map_newsletters_lists')
      .where('tenant_id', '=', tenant_id)
      .where('newsletter_id', '=', newsletterId)
      .execute();

    const values = [
      ...[...new Set(include)].filter((id) => liveIds.has(id)).map((id) => ({ list_id: id, mode: 'include' as const })),
      ...[...new Set(exclude)].filter((id) => liveIds.has(id)).map((id) => ({ list_id: id, mode: 'exclude' as const })),
    ].map((v) => ({
      tenant_id,
      newsletter_id: newsletterId,
      list_id: v.list_id,
      mode: v.mode,
      createdby_id: actorId,
      updatedby_id: actorId,
    }));
    if (values.length > 0) {
      await db.insertInto('map_newsletters_lists').values(values).execute();
    }
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const result = await this.getRepo().getAllWithCount(auth.tenant_id, input?.options as any);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input) as {
        csv: string;
        fileName: string;
        columns: string[];
        rowCount: number;
      };
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

  public async buildRecipientQuery(tenant_id: string, newsletter: any): Promise<any> {
    let includeTags: string[] = [];
    let excludeTags: string[] = [];

    // List targeting lives in map_newsletters_lists (FK-backed, so no dangling ids).
    const listRows = await this.getRepo()
      .db.selectFrom('map_newsletters_lists')
      .select(['list_id', 'mode'])
      .where('tenant_id', '=', tenant_id)
      .where('newsletter_id', '=', String(newsletter.id))
      .execute();
    const includeListIds = listRows.filter((r) => r.mode === 'include').map((r) => String(r.list_id));
    const excludeListIds = listRows.filter((r) => r.mode === 'exclude').map((r) => String(r.list_id));

    // segments is jsonb (returns pre-parsed object from Kysely) or legacy text string.
    // It stays JSONB deliberately: it holds tag *names*, not ids.
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
    const campaignId = String(newsletter.campaign_id);
    let query = db
      .selectFrom('persons')
      .where('persons.tenant_id', '=', tenant_id)
      .where('persons.email', 'is not', null)
      .where('persons.email', '!=', '')
      // Sendability (§15) = subscribed in THIS campaign ∧ address not suppressed ∧ not DNC(email).
      // 1. Per-campaign consent: an explicit subscribed row in the newsletter's campaign.
      .where((eb) =>
        eb.exists(
          db
            .selectFrom('campaign_subscriptions')
            .select('campaign_subscriptions.person_id')
            .where('campaign_subscriptions.tenant_id', '=', tenant_id)
            .where('campaign_subscriptions.campaign_id', '=', campaignId)
            .where('campaign_subscriptions.status', '=', 'subscribed')
            .where(sql<boolean>`campaign_subscriptions.person_id = persons.id`),
        ),
      )
      // 2. Global address health: hard bounces / spam complaints kill the address everywhere.
      .where((eb) =>
        eb.not(
          eb.exists(
            db
              .selectFrom('email_suppressions')
              .select('email_suppressions.id')
              .where('email_suppressions.tenant_id', '=', tenant_id)
              .where(sql<boolean>`email_suppressions.email = persons.email`),
          ),
        ),
      )
      // 3. Person-level do-not-contact (null channel list = all channels).
      .where(
        sql<boolean>`NOT (persons.do_not_contact AND (persons.do_not_contact_channels IS NULL OR 'email' = ANY(persons.do_not_contact_channels)))`,
      );

    query = query.where((eb) => {
      const conditions = [];
      if (includeListIds.length > 0) {
        conditions.push(
          eb.exists(
            db
              .selectFrom('map_lists_persons')
              .select('person_id')
              .where('map_lists_persons.tenant_id', '=', tenant_id)
              .where(sql<boolean>`map_lists_persons.person_id = persons.id`)
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
              .where('map_peoples_tags.tenant_id', '=', tenant_id)
              .where(sql<boolean>`map_peoples_tags.person_id = persons.id`)
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
              .where('map_lists_persons.tenant_id', '=', tenant_id)
              .where(sql<boolean>`map_lists_persons.person_id = persons.id`)
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
              .where('map_peoples_tags.tenant_id', '=', tenant_id)
              .where(sql<boolean>`map_peoples_tags.person_id = persons.id`)
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
    const baseQuery = await this.buildRecipientQuery(tenant_id, newsletter);

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
      .insertInto('background_jobs')
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

  public async sendTestEmail(tenant_id: string, input: SendTestEmailInput): Promise<{ to: string; delivered: number }> {
    const db = this.getRepo().db;

    // Resolve sender the same way the real newsletter send does: prefer the caller-supplied
    // from name/email, otherwise fall back to the workspace Communications settings.
    const settingsRows = await db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenant_id)
      .where('key', 'in', [
        'communications.sendgrid_api_key',
        'communications.sendgrid_subuser_username',
        'communications.default_from_name',
        'communications.default_from_email',
        'communications.reply_to',
      ])
      .execute();

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows) {
      if (typeof row.value === 'string') {
        settingsMap[row.key] = row.value;
      }
    }

    const fromName = input.fromName || settingsMap['communications.default_from_name'] || DEFAULT_FROM_NAME;
    const fromEmail = input.fromEmail || settingsMap['communications.default_from_email'] || DEFAULT_FROM_EMAIL;
    const replyTo = settingsMap['communications.reply_to'] || undefined;
    const sendgridApiKey = settingsMap['communications.sendgrid_api_key'];
    const subuserUsername = settingsMap['communications.sendgrid_subuser_username'];

    // Apply the same send-time render as the real send so the test reflects what recipients receive:
    // block-JSON stripped, relative images made absolute, merge tokens resolved (to their fallbacks
    // here, since a test address carries no person record).
    const html = renderNewsletterHtml(input.html, { baseUrl: env.appUrl, previewText: null });
    const mergeTokens = extractMergeTokens(input.subject, html, input.text);
    const substitutions = mergeTokens.length ? resolveMergeSubstitutions(mergeTokens, { email: input.to }) : undefined;

    const mailSvc = new NewsletterEmailService();
    const delivered = await mailSvc.sendNewsletter({
      fromName,
      fromEmail,
      replyTo,
      recipients: [{ email: input.to, substitutions }],
      subject: input.subject,
      html,
      text: input.text,
      sendgridApiKey,
      subuserUsername,
    });

    return { to: input.to, delivered };
  }

  public async getEngagementStats(tenant_id: string, id: string): Promise<any> {
    const db = this.getRepo().db;

    // 1. Fetch recent events (limit 100)
    const activities = await db
      .selectFrom('newsletter_events')
      .select(['email', 'event_type', 'timestamp', 'url', 'ip', 'user_agent'])
      .where('newsletter_id', '=', id)
      .where('tenant_id', '=', tenant_id)
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
      .where('newsletter_id', '=', id)
      .where('tenant_id', '=', tenant_id)
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
