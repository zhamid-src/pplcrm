import { TransactionalEmailService } from './transactional-mail.service';
import { logger } from '../../logger';

export async function processMentions(
  db: any,
  tenantId: string,
  commentText: string,
  commentLink: string,
  authorId: string,
): Promise<void> {
  if (!commentText || !commentText.trim()) return;

  // Find matches for @username (characters, numbers, dots, dashes, underscores)
  const matches = [...commentText.matchAll(/\B@([a-zA-Z0-9._-]+)/g)].flatMap((m) => (m[1] ? [m[1].toLowerCase()] : []));
  if (matches.length === 0) return;

  try {
    // Retrieve all users in the tenant
    const users = await db
      .selectFrom('authusers')
      .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
      .select(['authusers.id', 'authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
      .where('authusers.tenant_id', '=', tenantId)
      .execute();

    const mailService = new TransactionalEmailService();

    // Map over matching users and send them notifications
    for (const user of users) {
      const userIdStr = String(user.id);
      if (userIdStr === String(authorId)) continue; // Don't notify the author

      const emailPrefix = user.email.split('@')[0]?.toLowerCase() || '';
      const firstNameLower = user.first_name?.toLowerCase() || '';

      // Match either @first_name or the email username prefix (e.g. @john)
      const isMentioned = matches.includes(firstNameLower) || matches.includes(emailPrefix);

      if (isMentioned && user.email) {
        let optedIn = true;
        const profileJson = user.profile_json;
        if (profileJson) {
          try {
            const json = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
            if (json?.notifications?.mention_in_comment === false) {
              optedIn = false;
            }
          } catch (e) {
            logger.error({ err: e }, 'Failed to parse profile json in processMentions');
          }
        }

        if (optedIn) {
          await mailService.sendMail({
            to: user.email,
            subject: 'You were mentioned in CampaignRaven',
            text: `Hi ${user.first_name || 'there'},\n\nYou were mentioned in a comment:\n\n"${commentText}"\n\nView comment: ${commentLink}`,
            html: `<p>Hi ${user.first_name || 'there'},</p><p>You were mentioned in a comment:</p><blockquote>"${commentText}"</blockquote><p><a href="${commentLink}">View Comment</a></p>`,
          });
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to process comment mentions');
  }
}
