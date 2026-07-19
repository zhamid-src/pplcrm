import { z } from 'zod';

import { nameSchema } from './core.schema';

/** Generous ceiling for a compiled email document (the presets are ~15 KB). */
const MAX_TEMPLATE_HTML_LENGTH = 500_000;
const MAX_TEMPLATE_TEXT_LENGTH = 200_000;

/**
 * Create payload for a user-saved newsletter template.
 *
 * html_content is deliberately NOT trimmed or transformed: the wizard stores the
 * compiled document verbatim so the PPLCRM_VISUAL_BLOCKS_DATA comment survives
 * the round-trip back into the visual editor. Emptiness is checked on the
 * trimmed view only.
 */
export const AddNewsletterTemplateObj = z.object({
  name: nameSchema('Name', 120),
  html_content: z
    .string()
    .max(MAX_TEMPLATE_HTML_LENGTH)
    .refine((value) => value.trim().length > 0, 'Template content is required'),
  plain_text_content: z.string().max(MAX_TEMPLATE_TEXT_LENGTH).optional(),
});

/** Rename-only edit payload; the content of a saved template is immutable. */
export const UpdateNewsletterTemplateObj = z.object({
  name: nameSchema('Name', 120),
});

/** Read shape returned by newsletters.templates.getAll. */
export const NewsletterTemplateObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  html_content: z.string(),
  plain_text_content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
});

export type AddNewsletterTemplateType = z.infer<typeof AddNewsletterTemplateObj>;
export type UpdateNewsletterTemplateType = z.infer<typeof UpdateNewsletterTemplateObj>;
export type NewsletterTemplateType = z.infer<typeof NewsletterTemplateObj>;
