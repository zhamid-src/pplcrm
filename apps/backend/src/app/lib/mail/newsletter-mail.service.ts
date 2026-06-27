import { env } from '../../../env';
import { InternalError } from '../../errors/app-errors';

export interface SendNewsletterOptions {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
  sendgridApiKey?: string;
  subuserUsername?: string;
  newsletterId?: string;
  tenantId?: string;
}

export class NewsletterEmailService {
  public async sendNewsletter(options: SendNewsletterOptions): Promise<number> {
    const apiKey = options.sendgridApiKey || env.sendgridApiKey;

    if (!apiKey) {
      console.info(`[SENDGRID DEV MOCK] Newsletter Outbound:
        From: "${options.fromName}" <${options.fromEmail}>
        Reply-To: ${options.replyTo || '(none)'}
        Recipients Count: ${options.recipients.length}
        Recipients: ${options.recipients.join(', ')}
        Subject: ${options.subject}
        HTML Length: ${options.html.length} chars
        HTML Tail: ${options.html.slice(-300)}
      `);
      return options.recipients.length;
    }

    const uniqueRecipients = [...new Set(options.recipients)];
    if (uniqueRecipients.length === 0) return 0;

    // SendGrid allows up to 1000 personalizations per API request
    const CHUNK_SIZE = 1000;
    let deliveredCount = 0;

    for (let i = 0; i < uniqueRecipients.length; i += CHUNK_SIZE) {
      const chunk = uniqueRecipients.slice(i, i + CHUNK_SIZE);
      const personalizations = chunk.map((email) => ({
        to: [{ email }],
      }));

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (options.subuserUsername) {
        headers['on-behalf-of'] = options.subuserUsername;
      }

      const body = {
        personalizations,
        from: {
          email: options.fromEmail,
          name: options.fromName,
        },
        ...(options.replyTo ? { reply_to: { email: options.replyTo } } : {}),
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
          ...(options.text
            ? [
                {
                  type: 'text/plain',
                  value: options.text,
                },
              ]
            : []),
        ],
        ...(options.newsletterId && options.tenantId
          ? {
              custom_args: {
                newsletter_id: options.newsletterId,
                tenant_id: options.tenantId,
              },
            }
          : {}),
        // Enable subscription tracking so SendGrid replaces the `<% unsubscribe %>` substitution tag in
        // the server-appended footer with a working, per-recipient unsubscribe URL.
        tracking_settings: {
          subscription_tracking: {
            enable: true,
            substitution_tag: '<% unsubscribe %>',
          },
        },
      };

      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SendGrid API responded with status ${response.status}: ${errorText}`);
        }

        deliveredCount += chunk.length;
      } catch (error: any) {
        throw new InternalError('Failed to send newsletter via SendGrid', undefined, { cause: error });
      }
    }

    return deliveredCount;
  }
}
