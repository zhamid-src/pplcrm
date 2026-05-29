import { FastifyPluginCallback } from 'fastify';
import { StorageService } from '../../../lib/storage.service';
import { BaseRepository } from '../../../lib/base.repo';
import { verifyAuthToken } from '../../../lib/auth-util';
import { env } from '../../../../env';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Client } from '@microsoft/microsoft-graph-client';
import { MsOAuthService } from '../../ms-sync/ms-oauth.service';
import { MsSyncService } from '../../ms-sync/ms-sync.service';
import { GoogleOAuthService } from '../../google-sync/google-oauth.service';
import { GoogleSyncService } from '../../google-sync/google-sync.service';

function buildRawMime(options: {
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}): Buffer {
  const boundary = `----=_Part_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;
  const headers: string[] = [];

  const safeFromName = options.fromName.replace(/"/g, '\\"');
  headers.push(`From: "${safeFromName}" <${options.fromEmail}>`);
  headers.push(`To: ${options.to.join(', ')}`);
  if (options.cc.length > 0) {
    headers.push(`Cc: ${options.cc.join(', ')}`);
  }
  if (options.bcc.length > 0) {
    headers.push(`Bcc: ${options.bcc.join(', ')}`);
  }
  
  const base64Subject = Buffer.from(options.subject).toString('base64');
  headers.push(`Subject: =?utf-8?B?${base64Subject}?=`);
  
  headers.push(`MIME-Version: 1.0`);
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  headers.push('');

  const bodyParts: string[] = [];

  bodyParts.push(`--${boundary}`);
  bodyParts.push(`Content-Type: text/html; charset="UTF-8"`);
  bodyParts.push(`Content-Transfer-Encoding: base64`);
  bodyParts.push('');
  bodyParts.push(Buffer.from(options.html).toString('base64'));
  bodyParts.push('');

  for (const att of options.attachments) {
    bodyParts.push(`--${boundary}`);
    bodyParts.push(`Content-Type: ${att.contentType}; name="${att.filename.replace(/"/g, '\\"')}"`);
    bodyParts.push(`Content-Disposition: attachment; filename="${att.filename.replace(/"/g, '\\"')}"`);
    bodyParts.push(`Content-Transfer-Encoding: base64`);
    bodyParts.push('');
    bodyParts.push(att.content.toString('base64'));
    bodyParts.push('');
  }

  bodyParts.push(`--${boundary}--`);

  const rawMimeString = headers.join('\r\n') + '\r\n' + bodyParts.join('\r\n');
  return Buffer.from(rawMimeString, 'utf-8');
}

const storageService = new StorageService();

let _oauthSvc: MsOAuthService | null = null;

function getOAuthService(db: any) {
  if (!_oauthSvc) {
    _oauthSvc = new MsOAuthService(db, {
      clientId: env.msClientId ?? '',
      clientSecret: env.msClientSecret ?? '',
      tenantId: env.msTenantId ?? 'common',
      redirectUri: env.msRedirectUri ?? `${env.apiUrl}/auth/ms/callback`,
    });
  }
  return _oauthSvc;
}

async function saveLocalEmail(
  db: any,
  tenantId: string,
  userId: string,
  fromEmail: string,
  fromName: string,
  toList: string[],
  ccList: string[],
  bccList: string[],
  subject: string,
  html: string,
  uploadedFiles: any[],
  previewKey: string,
) {
  return db.transaction().execute(async (trx: any) => {
    // Ensure Outbox folder exists in email_folders
    const existingOutbox = await trx
      .selectFrom('email_folders')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', '10')
      .executeTakeFirst();

    if (!existingOutbox) {
      await trx
        .insertInto('email_folders')
        .values({
          id: '10',
          tenant_id: tenantId,
          name: 'Outbox',
          createdby_id: userId,
          updatedby_id: userId,
          icon: 'clock',
          sort_order: 10,
          is_default: false,
        })
        .execute();
    }

    // 1. Insert into emails table (using Outbox folder: '10')
    const createdEmail = await trx
      .insertInto('emails')
      .values({
        tenant_id: tenantId,
        folder_id: '10', // Outbox folder is '10'
        from_email: fromEmail,
        to_email: toList.join(', '),
        subject: subject,
        preview: previewKey,
        assigned_to: userId,
        is_favourite: false,
        deleted_at: null,
        status: 'open',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const emailId = String(createdEmail.id);

    // 2. Insert html into email_bodies
    await trx
      .insertInto('email_bodies')
      .values({
        tenant_id: tenantId,
        email_id: emailId,
        body_html: html,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 3. Insert files and email_attachments metadata
    for (let i = 0; i < uploadedFiles.length; i++) {
      const uFile = uploadedFiles[i];
      let fileId: string;

      const existingFile = await trx
        .selectFrom('files')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('sha256_hex', '=', uFile.sha256_hex)
        .executeTakeFirst();

      if (existingFile) {
        fileId = String(existingFile.id);
      } else {
        const fileResult = await trx
          .insertInto('files')
          .values({
            tenant_id: tenantId,
            filename: uFile.filename,
            mime_type: uFile.content_type,
            size_bytes: uFile.size_bytes,
            storage_key: uFile.storage_key,
            sha256_hex: uFile.sha256_hex,
            uploaded_by: userId,
          })
          .returning('id')
          .executeTakeFirstOrThrow();

        fileId = String(fileResult.id);
      }

      await trx
        .insertInto('email_attachments')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          filename: uFile.filename,
          content_type: uFile.content_type,
          size_bytes: uFile.size_bytes,
          cid: uFile.cid,
          is_inline: uFile.is_inline,
          pos: i + 1,
          file_id: fileId,
        })
        .execute();
    }

    // 4. Insert headers
    const internetMessageId = `<${crypto.randomUUID()}@pplcrm.local>`;
    const rawHeaders = `Message-ID: ${internetMessageId}\r\nSubject: ${subject}\r\nFrom: "${fromName}" <${fromEmail}>\r\nTo: ${toList.join(', ')}\r\nDate: ${new Date().toUTCString()}\r\n`;

    await trx
      .insertInto('email_headers')
      .values({
        tenant_id: tenantId,
        email_id: emailId,
        headers_json: JSON.stringify({ internetMessageId }),
        raw_headers: rawHeaders,
        date_sent: new Date(),
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 5. Insert recipients
    const recipientRows: any[] = [];
    toList.forEach((emailAddr: string, idx: number) => {
      recipientRows.push({
        tenant_id: tenantId,
        email_id: emailId,
        kind: 'to',
        name: null,
        email: emailAddr,
        pos: idx,
      });
    });
    ccList.forEach((emailAddr: string, idx: number) => {
      recipientRows.push({
        tenant_id: tenantId,
        email_id: emailId,
        kind: 'cc',
        name: null,
        email: emailAddr,
        pos: idx,
      });
    });
    bccList.forEach((emailAddr: string, idx: number) => {
      recipientRows.push({
        tenant_id: tenantId,
        email_id: emailId,
        kind: 'bcc',
        name: null,
        email: emailAddr,
        pos: idx,
      });
    });

    if (recipientRows.length > 0) {
      await trx.insertInto('email_recipients').values(recipientRows).execute();
    }

    return createdEmail;
  });
}

const emailsApiRoute: FastifyPluginCallback = (fastify, _, done) => {
  // Send composed email
  fastify.post('/send', async (req: any, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Unauthorized: Missing Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token format' });
    }

    let payload: any = null;
    try {
      payload = await verifyAuthToken(token);
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
    }

    if (!payload?.tenant_id || !payload?.user_id) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token payload' });
    }

    const tenantId = payload.tenant_id;
    const userId = payload.user_id;
    const db = (BaseRepository as any)['_db'];

    // Retrieve sender user details
    const user = await db
      .selectFrom('authusers')
      .select(['email', 'first_name', 'last_name'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: User not found' });
    }

    const fromEmail = user.email;
    const fromName = `${user.first_name} ${user.last_name || ''}`.trim();

    // Parse multipart request parts
    const parts = req.parts();
    const fields: any = {};
    const files: any[] = [];

    for await (const part of parts) {
      if (part.file) {
        const buffer = await part.toBuffer();
        files.push({
          filename: part.filename,
          fieldname: part.fieldname,
          mimetype: part.mimetype,
          buffer,
        });
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    // Parse recipient lists and content fields
    const toList = fields.to ? JSON.parse(fields.to) : [];
    const ccList = fields.cc ? JSON.parse(fields.cc) : [];
    const bccList = fields.bcc ? JSON.parse(fields.bcc) : [];
    const subject = fields.subject || '';
    const html = fields.html || '';

    // Upload attachment files to storage outside transaction
    const uploadedFiles: Array<{
      filename: string;
      content_type: string;
      size_bytes: number;
      storage_key: string;
      sha256_hex: string;
      cid: string | null;
      is_inline: boolean;
    }> = [];

    for (const file of files) {
      const sha256_hex = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const fileUUID = crypto.randomUUID();
      const storage_key = `emails/attachments/${fileUUID}_${file.filename}`;

      await storageService.upload(storage_key, file.buffer, file.mimetype);

      uploadedFiles.push({
        filename: file.filename,
        content_type: file.mimetype,
        size_bytes: file.buffer.length,
        storage_key,
        sha256_hex,
        cid: null,
        is_inline: false,
      });
    }

    // Check if user has connected Microsoft and/or Google accounts
    const msToken = await db
      .selectFrom('ms_oauth_tokens')
      .select(['user_id', 'ms_email'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const googleToken = await db
      .selectFrom('google_oauth_tokens')
      .select(['user_id', 'google_email'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const hasMsConnected = !!msToken;
    const hasGoogleConnected = !!googleToken;

    // Load SMTP settings from database for this tenant
    const smtpRows = await db
      .selectFrom('settings')
      .select(['key', 'value'])
      .where('tenant_id', '=', tenantId)
      .where('key', 'like', 'communications.smtp_%')
      .execute();

    const smtpSettings: Record<string, any> = {};
    for (const row of smtpRows) {
      smtpSettings[row.key] = row.value;
    }

    const hasSmtpConfigured = !!smtpSettings['communications.smtp_host'];

    // Fail immediately if no send method is configured
    if (!hasMsConnected && !hasGoogleConnected && !hasSmtpConfigured) {
      return reply.status(400).send({
        status: 'error',
        message:
          'No email dispatch method configured. Please connect a Microsoft or Google account, or configure SMTP settings in Settings.',
      });
    }

    // Save outbound email to database under Outbox folder '10' initially
    const fallbackPreview =
      html
        .replace(/<[^>]*>/g, '')
        .substring(0, 100)
        .trim() || '';
    const emailRow = await saveLocalEmail(
      db,
      tenantId,
      userId,
      fromEmail,
      fromName,
      toList,
      ccList,
      bccList,
      subject,
      html,
      uploadedFiles,
      fallbackPreview,
    );

    // Determine send method prioritizing matching address
    let sendMethod: 'ms' | 'google' | 'smtp' = 'smtp';
    if (hasMsConnected && hasGoogleConnected) {
      if (googleToken?.google_email?.toLowerCase() === fromEmail.toLowerCase()) {
        sendMethod = 'google';
      } else {
        sendMethod = 'ms';
      }
    } else if (hasMsConnected) {
      sendMethod = 'ms';
    } else if (hasGoogleConnected) {
      sendMethod = 'google';
    } else if (hasSmtpConfigured) {
      sendMethod = 'smtp';
    }

    // Dispatch the email synchronously
    try {
      if (sendMethod === 'ms') {
        const oauthSvc = getOAuthService(db);
        let msDraftId: string | null = null;
        try {
          const accessToken = await oauthSvc.getValidToken(userId);
          const client = Client.init({
            authProvider: (done) => done(null, accessToken),
          });

          const msDraftMessage: any = {
            subject: subject,
            body: {
              contentType: 'html',
              content: html,
            },
            toRecipients: toList.map((emailAddr: string) => ({
              emailAddress: { address: emailAddr },
            })),
            ccRecipients: ccList.map((emailAddr: string) => ({
              emailAddress: { address: emailAddr },
            })),
            bccRecipients: bccList.map((emailAddr: string) => ({
              emailAddress: { address: emailAddr },
            })),
          };

          const createdDraft = await client.api('/me/messages').post(msDraftMessage);
          msDraftId = createdDraft.id;
          const graphInternetMessageId = createdDraft.internetMessageId;

          // Update local email preview/dedupe key to `ms:${msDraftId}`
          await db
            .updateTable('emails')
            .set({ preview: `ms:${msDraftId}`, updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .execute();

          if (graphInternetMessageId) {
            const rawHeaders = `Message-ID: ${graphInternetMessageId}\r\nSubject: ${subject}\r\nFrom: "${fromName}" <${fromEmail}>\r\nTo: ${toList.join(', ')}\r\nDate: ${new Date().toUTCString()}\r\n`;
            await db
              .updateTable('email_headers')
              .set({
                headers_json: JSON.stringify({ internetMessageId: graphInternetMessageId }),
                raw_headers: rawHeaders,
                updated_at: new Date(),
              })
              .where('tenant_id', '=', tenantId)
              .where('email_id', '=', String(emailRow.id))
              .execute();
          }

          // Upload attachments
          for (const file of files) {
            await client.api(`/me/messages/${msDraftId}/attachments`).post({
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: file.filename,
              contentType: file.mimetype,
              contentBytes: file.buffer.toString('base64'),
            });
          }

          // Send draft
          await client.api(`/me/messages/${msDraftId}/send`).post({});

          // Update local email folder to '3' (Sent) on success
          const finalEmail = await db
            .updateTable('emails')
            .set({ folder_id: '3', updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .returningAll()
            .executeTakeFirstOrThrow();

          // Trigger background sync to get folders/Sent items synchronized
          const syncSvc = new MsSyncService(db, oauthSvc);
          syncSvc.syncUser(userId, tenantId, userId).catch((err: any) => {
            fastify.log.error(err, `Failed to trigger background sync after sending email ${emailRow.id}`);
          });

          return reply.jsendSuccess(finalEmail);
        } catch (err: any) {
          fastify.log.error(err, `Failed to send email via Microsoft Graph for email ${emailRow.id}`);
          // Clean up local email
          await db
            .deleteFrom('emails')
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .execute();
          return reply.jsendError(err.message || 'Failed to send email via Microsoft Graph', 400);
        }
      } else if (sendMethod === 'google') {
        const oauthSvc = new GoogleOAuthService(db, {
          clientId: env.googleClientId ?? '',
          clientSecret: env.googleClientSecret ?? '',
          redirectUri: env.googleRedirectUri ?? `${env.apiUrl}/auth/google/callback`,
        });

        try {
          const accessToken = await oauthSvc.getValidToken(userId);

          const rawMessageBuffer = buildRawMime({
            fromName,
            fromEmail,
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            html,
            attachments: files.map((file) => ({
              filename: file.filename,
              content: file.buffer,
              contentType: file.mimetype,
            })),
          });

          const rawBase64Url = rawMessageBuffer
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

          const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              raw: rawBase64Url,
            }),
          });

          if (!gmailRes.ok) {
            const errText = await gmailRes.text();
            throw new Error(`Gmail API send failed: ${errText}`);
          }

          const gmailData: any = await gmailRes.json();
          const googleMsgId = gmailData.id;

          await db
            .updateTable('emails')
            .set({ preview: `google:${googleMsgId}`, updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .execute();

          const finalEmail = await db
            .updateTable('emails')
            .set({ folder_id: '3', updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .returningAll()
            .executeTakeFirstOrThrow();

          const googleSyncSvc = new GoogleSyncService(db, oauthSvc);
          googleSyncSvc.syncUser(userId, tenantId, userId).catch((err: any) => {
            fastify.log.error(err, `Failed to trigger background sync after sending Google email ${emailRow.id}`);
          });

          return reply.jsendSuccess(finalEmail);
        } catch (err: any) {
          fastify.log.error(err, `Failed to send email via Google for email ${emailRow.id}`);
          await db
            .deleteFrom('emails')
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .execute();
          return reply.jsendError(err.message || 'Failed to send email via Google', 400);
        }
      } else {
        // SMTP Flow
        const port = Number(smtpSettings['communications.smtp_port'] || 587);
        const transport = nodemailer.createTransport({
          host: smtpSettings['communications.smtp_host'],
          port: port,
          secure: port === 465,
          auth: {
            user: smtpSettings['communications.smtp_user'] || '',
            pass: smtpSettings['communications.smtp_pass'] || '',
          },
        });

        try {
          await transport.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject: subject,
            html: html,
            attachments: files.map((file) => ({
              filename: file.filename,
              content: file.buffer,
              contentType: file.mimetype,
            })),
          });

          // Update local email folder to '3' (Sent) on success
          const finalEmail = await db
            .updateTable('emails')
            .set({ folder_id: '3', updated_at: new Date() })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .returningAll()
            .executeTakeFirstOrThrow();

          return reply.jsendSuccess(finalEmail);
        } catch (err: any) {
          fastify.log.error(err, `Failed to dispatch SMTP email for email ${emailRow.id}`);
          // Clean up local email
          await db
            .deleteFrom('emails')
            .where('tenant_id', '=', tenantId)
            .where('id', '=', String(emailRow.id))
            .execute();
          return reply.jsendError(err.message || 'Failed to dispatch SMTP email', 400);
        }
      }
    } catch (err: any) {
      fastify.log.error(err, `Unexpected error in send task for email ${emailRow.id}`);
      // Clean up local email
      await db.deleteFrom('emails').where('tenant_id', '=', tenantId).where('id', '=', String(emailRow.id)).execute();
      return reply.jsendError(err.message || 'Unexpected error in send task', 500);
    }
  });

  // Download attachment by ID
  fastify.get('/:id/attachments/:attachmentId', async (req: any, reply) => {
    // Authenticate token via header or query string (for direct link downloading)
    let token = req.query.token;
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    let payload: any = null;
    try {
      payload = await verifyAuthToken(token);
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }

    const tenantId = payload.tenant_id;
    const { id, attachmentId } = req.params;
    const db = (BaseRepository as any)['_db'];

    const attachment = await db
      .selectFrom('email_attachments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', attachmentId)
      .where('email_id', '=', id)
      .executeTakeFirst();

    if (!attachment || !attachment.file_id) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    const file = await db.selectFrom('files').selectAll().where('tenant_id', '=', tenantId).where('id', '=', attachment.file_id).executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const buffer = await storageService.download(file.storage_key);
      reply.type(file.mime_type || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to download attachment' });
    }
  });

  // Serve inline attachment by CID
  fastify.get('/:id/attachments/cid/:cid', async (req: any, reply) => {
    // Authenticate token via header or query string (for direct link downloading)
    let token = req.query.token;
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    let payload: any = null;
    try {
      payload = await verifyAuthToken(token);
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }

    const tenantId = payload.tenant_id;
    const { id, cid } = req.params;
    const db = (BaseRepository as any)['_db'];

    const attachment = await db
      .selectFrom('email_attachments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email_id', '=', id)
      .where('cid', '=', cid)
      .where('is_inline', '=', true)
      .executeTakeFirst();

    if (!attachment || !attachment.file_id) {
      return reply.status(404).send({ error: 'Inline attachment not found' });
    }

    const file = await db.selectFrom('files').selectAll().where('tenant_id', '=', tenantId).where('id', '=', attachment.file_id).executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const buffer = await storageService.download(file.storage_key);
      reply.type(file.mime_type || 'application/octet-stream');
      reply.header('Cache-Control', 'public, max-age=31536000');
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to load inline image' });
    }
  });

  done();
};

export default emailsApiRoute;
