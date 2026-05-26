import { BaseRepository } from '../../lib/base.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';
import { sql } from 'kysely';

export class DashboardController {
  private get db() {
    return (BaseRepository as any)['_db'];
  }

  public async getStats(auth: IAuthKeyPayload) {
    const tenant_id = auth.tenant_id;

    // 1. Emails Assigned (Assigned open inbox emails by rep)
    const emailsAssigned = await this.db.selectFrom('emails')
      .innerJoin('authusers', 'authusers.id', 'emails.assigned_to')
      .select([
        'emails.assigned_to as user_id',
        'authusers.first_name',
        'authusers.last_name',
        sql<number>`count(emails.id)`.as('count')
      ])
      .where('emails.tenant_id', '=', tenant_id)
      .where('emails.folder_id', '=', '1') // Inbox
      .where('emails.status', '=', 'open')
      .groupBy(['emails.assigned_to', 'authusers.first_name', 'authusers.last_name'])
      .execute();

    // 2. Emails Closed by Rep (Closed inbox emails by rep)
    const emailsClosed = await this.db.selectFrom('emails')
      .innerJoin('authusers', 'authusers.id', 'emails.assigned_to')
      .select([
        'emails.assigned_to as user_id',
        'authusers.first_name',
        'authusers.last_name',
        sql<number>`count(emails.id)`.as('count')
      ])
      .where('emails.tenant_id', '=', tenant_id)
      .where('emails.folder_id', '=', '1') // Inbox
      .where('emails.status', '=', 'closed')
      .groupBy(['emails.assigned_to', 'authusers.first_name', 'authusers.last_name'])
      .execute();

    // 3. Average 1st Response Time
    const incomingEmails = await this.db.selectFrom('emails')
      .select(['id', 'from_email', 'created_at'])
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', '1') // Inbox
      .execute();

    let totalResponseTimeMs = 0;
    let responseCount = 0;

    for (const email of incomingEmails) {
      const earliestComment = await this.db.selectFrom('email_comments')
        .select('created_at')
        .where('email_id', '=', email.id)
        .orderBy('created_at', 'asc')
        .limit(1)
        .executeTakeFirst();

      const earliestOutbound = email.from_email ? await this.db.selectFrom('emails')
        .select('created_at')
        .where('folder_id', '=', '3') // Sent
        .where('to_email', 'like', `%${email.from_email}%`)
        .where('created_at', '>', email.created_at)
        .orderBy('created_at', 'asc')
        .limit(1)
        .executeTakeFirst() : null;

      const commentTime = earliestComment ? new Date(earliestComment.created_at).getTime() : null;
      const outboundTime = earliestOutbound ? new Date(earliestOutbound.created_at).getTime() : null;

      let firstResponseTime: number | null = null;
      if (commentTime && outboundTime) {
        firstResponseTime = Math.min(commentTime, outboundTime);
      } else if (commentTime) {
        firstResponseTime = commentTime;
      } else if (outboundTime) {
        firstResponseTime = outboundTime;
      }

      if (firstResponseTime) {
        const diff = firstResponseTime - new Date(email.created_at).getTime();
        if (diff > 0) {
          totalResponseTimeMs += diff;
          responseCount++;
        }
      }
    }

    const avgFirstResponseHours = responseCount > 0 ? (totalResponseTimeMs / responseCount) / (1000 * 60 * 60) : 0;

    // 4. Average Time to Close
    const closedEmails = await this.db.selectFrom('emails')
      .select(['created_at', 'updated_at'])
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', '1')
      .where('status', '=', 'closed')
      .execute();

    let totalTimeToCloseMs = 0;
    let closedCount = 0;

    for (const email of closedEmails) {
      const diff = new Date(email.updated_at).getTime() - new Date(email.created_at).getTime();
      if (diff > 0) {
        totalTimeToCloseMs += diff;
        closedCount++;
      }
    }

    const avgTimeToCloseHours = closedCount > 0 ? (totalTimeToCloseMs / closedCount) / (1000 * 60 * 60) : 0;

    // 5. Contacts Growth (Last 30 days)
    const growthRows = await this.db.selectFrom('persons')
      .select([
        sql<string>`date_trunc('day', created_at)`.as('day'),
        sql<number>`count(id)`.as('count')
      ])
      .where('tenant_id', '=', tenant_id)
      .where('created_at', '>=', sql`now() - interval '30 days'`)
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`, 'asc')
      .execute();

    const contactsGrowth = growthRows.map((r: any) => ({
      date: r.day ? new Date(r.day).toISOString().split('T')[0] : '',
      count: Number(r.count || 0),
    }));

    return {
      avgFirstResponseHours,
      avgTimeToCloseHours,
      emailsAssigned,
      emailsClosed,
      contactsGrowth,
    };
  }
}
