import { z } from 'zod';

export const EmailCommentObj = z.object({
  id: z.string(),
  email_id: z.string(),
  author_id: z.string(),
  comment: z.string(),
  created_at: z.date(),
});

export const EmailDraftObj = z.object({
  id: z.string(),
  to_list: z.array(z.string()),
  cc_list: z.array(z.string()),
  bcc_list: z.array(z.string()),
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body_delta: z.any().optional(),
  updated_at: z.date(),
});

export const EmailFolderObj = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  sort_order: z.number(),
  is_default: z.boolean(),
  is_virtual: z.boolean(),
});

export const EmailObj = z.object({
  id: z.string(),
  folder_id: z.string(),
  from_email: z.string().optional(),
  from_name: z.string().optional(),
  to_email: z.string().optional(),
  subject: z.string().optional(),
  preview: z.string().optional(),
  assigned_to: z.string().optional(),
  updated_at: z.date(),
  is_favourite: z.boolean(),
  attachment_count: z.number(),
  has_attachment: z.boolean(),
  status: z.enum(['open', 'closed']).nullable().default('open'),
});
