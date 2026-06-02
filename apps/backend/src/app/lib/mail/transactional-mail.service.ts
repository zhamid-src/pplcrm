import { Transaction, Kysely } from 'kysely';
import { env } from '../../../env';
import { InternalError } from '../../errors/app-errors';
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

  /**
   * Sends a transactional email using Postmark's HTTP REST API.
   * If POSTMARK_SERVER_TOKEN is missing, logs email details to the console (development fallback).
   */
  public async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.serverToken) {
      console.info(`[POSTMARK DEV MOCK] Transactional Email Outbound:
        From: ${this.fromEmail}
        To: ${options.to}
        Subject: ${options.subject}
        Text: ${options.text}
        HTML: ${options.html}
      `);
      return;
    }

    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.serverToken,
        },
        body: JSON.stringify({
          From: this.fromEmail,
          To: options.to,
          Subject: options.subject,
          TextBody: options.text,
          HtmlBody: options.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Postmark API responded with status ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      throw new InternalError('Failed to send transactional email', undefined, { cause: error });
    }
  }

  /**
   * Enqueues a transactional email to be processed in the background.
   */
  public async enqueueMail(options: SendMailOptions, trx?: Transaction<any> | Kysely<any>): Promise<void> {
    const dbClient = (trx || BaseRepository.dbInstance) as any;
    await dbClient
      .insertInto('background_jobs' as any)
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
