import type { Kysely, Transaction } from 'kysely';

import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { normalizeE164 } from '../sms/phone';
import { SmsService } from '../sms/sms.service';
import { TransactionalEmailService } from './transactional-mail.service';

export interface VolunteerLinkSendResult {
  email: boolean;
  sms: boolean;
}

interface NotifyVolunteerOfLinkInput {
  tenant_id: string;
  person: { first_name: string | null; email: string | null; mobile: string | null };
  orgName: string;
  /** What the link opens, in the volunteer's words — e.g. 'delivery route' or 'canvassing turf'. */
  kindLabel: string;
  /** Route/turf display name, shown in the email. */
  itemName: string;
  url: string;
}

/**
 * Send a volunteer their personal companion link by email and/or SMS — whichever
 * contacts are on file — through the transactional outbox, inside the caller's
 * transaction (so an assignment that rolls back sends nothing). Returns which
 * channels were enqueued; both false means staff must share the link manually.
 *
 * The link is personal: the companion gate verifies the holder against these same
 * contacts (see pplcrm-companion-access), which is why the message tells them
 * they'll confirm a code on first open.
 */
export async function notifyVolunteerOfLink(
  input: NotifyVolunteerOfLinkInput,
  trx: Transaction<Models> | Kysely<Models>,
): Promise<VolunteerLinkSendResult> {
  const firstName = input.person.first_name?.trim() || 'there';
  const email = input.person.email?.trim() || null;
  const sms = normalizeE164(input.person.mobile);

  if (email) {
    await new TransactionalEmailService().enqueueMail(
      {
        to: email,
        subject: `Your ${input.kindLabel} from ${input.orgName}`,
        text: `Hi ${firstName},\n\n${input.orgName} assigned you a ${input.kindLabel}: "${input.itemName}".\n\nOpen your personal link to get started: ${input.url}\n\nThe first time you open it, you'll confirm a one-time code sent to this contact — that keeps the link yours alone.`,
        html: `<h2>You have a ${input.kindLabel}</h2>
<p>Hi ${firstName},</p>
<p>${input.orgName} assigned you a ${input.kindLabel}: <strong>"${input.itemName}"</strong>.</p>
<div class="btn-container"><a href="${input.url}" class="btn">Open my ${input.kindLabel}</a></div>
<p>The first time you open it, you'll confirm a one-time code sent to this contact — that keeps the link yours alone.</p>`,
        tenant_id: input.tenant_id,
      },
      trx,
    );
  }

  if (sms) {
    await new SmsService().enqueueSms(
      {
        to: sms,
        body: `${input.orgName}: your ${input.kindLabel} is ready. Open your personal link: ${input.url}`,
        tenant_id: input.tenant_id,
      },
      trx,
    );
  }

  return { email: email != null, sms: sms != null };
}
