import { env } from '../../../env';
import { InternalError } from '../../errors/app-errors';

export interface SendNewsletterOptions {
  fromName: string;
  fromEmail: string;
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
  sendgridApiKey?: string;
  subuserUsername?: string;
}

export class NewsletterEmailService {
  /**
   * Sends bulk newsletter emails using SendGrid's HTTP REST API.
   * Resolves to the number of successfully accepted deliveries.
   */
  public async sendNewsletter(options: SendNewsletterOptions): Promise<number> {
    const apiKey = options.sendgridApiKey || env.sendgridApiKey;

    if (!apiKey) {
      console.info(`[SENDGRID DEV MOCK] Newsletter Outbound:
        From: "${options.fromName}" <${options.fromEmail}>
        Recipients Count: ${options.recipients.length}
        Recipients: ${options.recipients.join(', ')}
        Subject: ${options.subject}
        HTML Length: ${options.html.length} chars
      `);
      return options.recipients.length;
    }

    if (options.recipients.length === 0) {
      return 0;
    }

    // SendGrid allows up to 1000 personalizations per API request
    const CHUNK_SIZE = 1000;
    let deliveredCount = 0;

    for (let i = 0; i < options.recipients.length; i += CHUNK_SIZE) {
      const chunk = options.recipients.slice(i, i + CHUNK_SIZE);
      const personalizations = chunk.map((email) => ({
        to: [{ email }],
      }));

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
          ...(options.text ? [{
            type: 'text/plain',
            value: options.text,
          }] : []),
        ],
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
