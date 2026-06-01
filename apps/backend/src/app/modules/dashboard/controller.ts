import { BaseRepository } from '../../lib/base.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';
import { sql } from 'kysely';

export class DashboardController {
  private get db() {
    return (BaseRepository as any)['_db'];
  }

  public async getStats(auth: IAuthKeyPayload) {
    const tenant_id = auth.tenant_id;

    // 1. Fetch all users in the tenant
    const users = await this.db.selectFrom('authusers')
      .select(['id', 'first_name', 'last_name'])
      .where('tenant_id', '=', tenant_id)
      .execute();

    // 2. Fetch all inbox emails for this tenant (folder_id '11' is Inbox)
    const inboxEmails = await this.db.selectFrom('emails')
      .select(['id', 'from_email', 'created_at', 'updated_at', 'status', 'assigned_to'])
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', '11')
      .execute();

    // 2.5 Fetch all close activities for emails in this tenant to determine who closed them
    const closeActivities = await this.db.selectFrom('user_activity')
      .select(['entity_id', 'user_id'])
      .where('tenant_id', '=', tenant_id)
      .where('activity', '=', 'close')
      .where('entity', 'in', ['email', 'emails'])
      .orderBy('created_at', 'asc')
      .execute();

    const closerMap = new Map<string, string>();
    for (const act of closeActivities) {
      if (act.entity_id) {
        closerMap.set(String(act.entity_id), String(act.user_id));
      }
    }

    // 3. Fetch earliest comment times grouped by email_id
    const earliestComments = await this.db.selectFrom('email_comments')
      .select(['email_id', sql<string>`min(created_at)`.as('earliest_comment_at')])
      .where('tenant_id', '=', tenant_id)
      .groupBy('email_id')
      .execute();
    const commentMap = new Map<string, number>(
      earliestComments
        .filter((c: any) => c.email_id && c.earliest_comment_at)
        .map((c: any) => [c.email_id, new Date(c.earliest_comment_at).getTime()])
    );

    // 4. Fetch all sent emails for the tenant to match outbound replies in memory (folder_id '3' is Sent)
    const sentEmails = await this.db.selectFrom('emails')
      .select(['to_email', 'created_at'])
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', '3')
      .orderBy('created_at', 'asc')
      .execute();

    const sentMap = new Map<string, number[]>();
    for (const sent of sentEmails) {
      if (!sent.to_email) continue;
      const emails = sent.to_email.toLowerCase().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      for (const e of emails) {
        let list = sentMap.get(e);
        if (!list) {
          list = [];
          sentMap.set(e, list);
        }
        list.push(new Date(sent.created_at).getTime());
      }
    }

    // Initialize user stats map
    const userStatsMap: Record<string, {
      user_id: string;
      first_name: string;
      last_name: string;
      openCount: number;
      closedCount: number;
      totalResponseTimeMs: number;
      responseCount: number;
      totalTimeToCloseMs: number;
      timeToCloseCount: number;
      slaBreaches: number;
    }> = {};

    for (const u of users) {
      userStatsMap[u.id] = {
        user_id: u.id,
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        openCount: 0,
        closedCount: 0,
        totalResponseTimeMs: 0,
        responseCount: 0,
        totalTimeToCloseMs: 0,
        timeToCloseCount: 0,
        slaBreaches: 0,
      };
    }

    let globalTotalResponseTimeMs = 0;
    let globalResponseCount = 0;
    let globalTotalTimeToCloseMs = 0;
    let globalTimeToCloseCount = 0;
    let unassignedCount = 0;
    let unassignedSlaBreaches = 0;

    const nowMs = Date.now();
    const SLA_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

    for (const email of inboxEmails) {
      const isAssigned = !!email.assigned_to && userStatsMap[email.assigned_to];
      const assignedUser = isAssigned ? userStatsMap[email.assigned_to!] : null;

      // Determine who closed the email (with fallback to assignee)
      const closerId = email.status === 'closed'
        ? (closerMap.get(String(email.id)) || (email.assigned_to != null ? String(email.assigned_to) : null))
        : null;
      const closerUser = closerId && userStatsMap[closerId] ? userStatsMap[closerId] : null;

      // Track open/closed counts
      if (email.status === 'open') {
        if (assignedUser) {
          assignedUser.openCount++;
        } else {
          unassignedCount++;
        }
      } else if (email.status === 'closed') {
        if (closerUser) {
          closerUser.closedCount++;
        }
      }

      // Time to close calculation
      if (email.status === 'closed') {
        const closeDiff = new Date(email.updated_at).getTime() - new Date(email.created_at).getTime();
        if (closeDiff > 0) {
          globalTotalTimeToCloseMs += closeDiff;
          globalTimeToCloseCount++;
          if (closerUser) {
            closerUser.totalTimeToCloseMs += closeDiff;
            closerUser.timeToCloseCount++;
          }
        }
      }

      // First response calculation
      const commentTime = commentMap.get(email.id) || null;
      let outboundTime: number | null = null;
      if (email.from_email) {
        const fromEmailClean = email.from_email.toLowerCase().trim();
        const sentTimes = sentMap.get(fromEmailClean);
        if (sentTimes) {
          const emailCreatedTime = new Date(email.created_at).getTime();
          const firstSentAfter = sentTimes.find(t => t > emailCreatedTime);
          if (firstSentAfter) {
            outboundTime = firstSentAfter;
          }
        }
      }

      let firstResponseTime: number | null = null;
      if (commentTime && outboundTime) {
        firstResponseTime = Math.min(commentTime, outboundTime);
      } else if (commentTime) {
        firstResponseTime = commentTime;
      } else if (outboundTime) {
        firstResponseTime = outboundTime;
      }

      if (firstResponseTime) {
        const respDiff = firstResponseTime - new Date(email.created_at).getTime();
        if (respDiff > 0) {
          globalTotalResponseTimeMs += respDiff;
          globalResponseCount++;
          if (assignedUser) {
            assignedUser.totalResponseTimeMs += respDiff;
            assignedUser.responseCount++;
          }
        }
      }

      // SLA Breach calculation: Open inbox email older than 24h with no response yet
      if (email.status === 'open') {
        const ageMs = nowMs - new Date(email.created_at).getTime();
        if (ageMs > SLA_THRESHOLD_MS && !firstResponseTime) {
          if (assignedUser) {
            assignedUser.slaBreaches++;
          } else {
            unassignedSlaBreaches++;
          }
        }
      }
    }

    const avgFirstResponseHours = globalResponseCount > 0 ? (globalTotalResponseTimeMs / globalResponseCount) / (1000 * 60 * 60) : 0;
    const avgTimeToCloseHours = globalTimeToCloseCount > 0 ? (globalTotalTimeToCloseMs / globalTimeToCloseCount) / (1000 * 60 * 60) : 0;

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

    // Build backward-compatible emailsAssigned
    const emailsAssigned = Object.values(userStatsMap)
      .filter(u => u.openCount > 0)
      .map(u => ({
        user_id: u.user_id,
        first_name: u.first_name,
        last_name: u.last_name,
        count: u.openCount
      }));

    // Build backward-compatible emailsClosed
    const emailsClosed = Object.values(userStatsMap)
      .filter(u => u.closedCount > 0)
      .map(u => ({
        user_id: u.user_id,
        first_name: u.first_name,
        last_name: u.last_name,
        count: u.closedCount
      }));

    // Map user stats for representative stats table
    const userStats = Object.values(userStatsMap).map(u => {
      const totalHandled = u.openCount + u.closedCount;
      const resolutionRate = totalHandled > 0 ? Math.round((u.closedCount / totalHandled) * 100) : 0;
      const avgFirstResponse = u.responseCount > 0 ? (u.totalResponseTimeMs / u.responseCount) / (1000 * 60 * 60) : 0;
      const avgTimeToClose = u.timeToCloseCount > 0 ? (u.totalTimeToCloseMs / u.timeToCloseCount) / (1000 * 60 * 60) : 0;

      return {
        user_id: u.user_id,
        first_name: u.first_name,
        last_name: u.last_name,
        openCount: u.openCount,
        closedCount: u.closedCount,
        resolutionRate,
        avgFirstResponseHours: avgFirstResponse,
        avgTimeToCloseHours: avgTimeToClose,
        slaBreaches: u.slaBreaches,
      };
    });

    const totalOpenCount = unassignedCount + Object.values(userStatsMap).reduce((acc, cur) => acc + cur.openCount, 0);

    return {
      avgFirstResponseHours,
      avgTimeToCloseHours,
      emailsAssigned,
      emailsClosed,
      contactsGrowth,
      unassignedCount,
      totalOpenCount,
      userStats,
      unassignedSlaBreaches,
    };
  }
}
