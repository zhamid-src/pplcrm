import type { Kysely, Transaction } from 'kysely';
import { env } from '../../../env';
import { InternalError } from '../../errors/app-errors';
import { logger } from '../../logger';
import { BaseRepository } from '../base.repo';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  tenant_id?: string | null;
}

export class TransactionalEmailService {
  private serverToken = env.postmarkServerToken;
  private fromEmail = env.postmarkFromEmail;

  private wrapInTemplate(title: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
      font-size: 16px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 24px;
      color: #475569;
    }
    .btn-container {
      margin: 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
    }
    .otp-container {
      margin: 32px auto;
      text-align: center;
    }
    .otp-code {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #4f46e5;
      background-color: #f1f5f9;
      padding: 12px 24px;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #64748b;
    }
    .footer p {
      margin: 8px 0;
      color: #64748b;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
    }
    .warning {
      font-size: 14px;
      color: #64748b;
      background-color: #f8fafc;
      border-left: 4px solid #cbd5e1;
      padding: 12px 16px;
      margin-top: 24px;
      border-radius: 0 4px 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>PplCRM</h1>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>This is a transactional message related to your account security. Unlike marketing messages, you cannot unsubscribe from these alerts.</p>
        <p>&copy; ${new Date().getFullYear()} PplCRM. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  public async sendMail(options: SendMailOptions): Promise<void> {
    const wrappedHtml = this.wrapInTemplate(options.subject, options.html);

    if (!this.serverToken) {
      logger.info(
        { from: this.fromEmail, to: options.to, subject: options.subject },
        '[POSTMARK DEV MOCK] Transactional Email Outbound',
      );
      return;
    }

    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.serverToken,
        },
        body: JSON.stringify({
          From: this.fromEmail,
          To: options.to,
          Subject: options.subject,
          TextBody: options.text,
          HtmlBody: wrappedHtml,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Postmark API responded with status ${response.status}: ${errorText}`);
      }
    } catch (error) {
      throw new InternalError('Failed to send transactional email', undefined, { cause: error });
    }
  }

  public async enqueueMail(options: SendMailOptions, trx?: Transaction<any> | Kysely<any>): Promise<void> {
    const dbClient = (trx || BaseRepository.dbInstance) as any;
    await dbClient
      .insertInto('background_jobs')
      .values({
        tenant_id: options.tenant_id ? BigInt(options.tenant_id) : null,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          type: 'send-transactional-email',
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
        run_at: new Date(),
        max_attempts: 5,
      })
      .execute();
  }
}
