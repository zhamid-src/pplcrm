import type {
  AddNewsletterTemplateType,
  IAuthKeyPayload,
  UpdateNewsletterTemplateType,
} from '../../../../../../libs/common/src';
import type { OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';

import { BaseController } from '../../lib/base.controller';
import { BadRequestError, NotFoundError } from '../../errors/app-errors';
import { NewsletterTemplatesRepo } from './repositories/newsletter-templates.repo';

/** Per-tenant ceiling on saved templates; the error message names the number. */
export const MAX_SAVED_TEMPLATES_PER_TENANT = 50;

/**
 * User-saved newsletter templates (wizard "Save as template" + "Your templates").
 * Templates are tenant-wide shared assets — every member of the workspace sees
 * and can manage the same library, so there is no per-user ownership check here;
 * tenant scoping is the boundary (a foreign tenant's template is a NotFound).
 */
export class NewsletterTemplatesController extends BaseController<'newsletter_templates', NewsletterTemplatesRepo> {
  constructor() {
    super(new NewsletterTemplatesRepo());
  }

  public listTemplates(tenant_id: string) {
    return this.getRepo().getAllByName(tenant_id);
  }

  public async addTemplate(auth: IAuthKeyPayload, input: AddNewsletterTemplateType) {
    // Zod already rejects whitespace-only html; this re-check keeps the guard
    // with the write in case another caller ever bypasses the router schema.
    if (!input.html_content.trim()) {
      throw new BadRequestError('Template content is empty. Design the newsletter first, then save it.');
    }
    const existing = await this.getRepo().count(auth.tenant_id);
    if (existing >= MAX_SAVED_TEMPLATES_PER_TENANT) {
      throw new BadRequestError(
        `You have reached the limit of ${MAX_SAVED_TEMPLATES_PER_TENANT} saved templates. Delete one you no longer use, then save again.`,
      );
    }
    const row = {
      tenant_id: auth.tenant_id,
      name: input.name,
      html_content: input.html_content,
      plain_text_content: input.plain_text_content ?? '',
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'newsletter_templates', 'insert'>;
    return this.add(row);
  }

  public async renameTemplate(auth: IAuthKeyPayload, id: string, data: UpdateNewsletterTemplateType) {
    await this.mustGetTemplate(auth.tenant_id, id);
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row: { name: data.name, updatedby_id: auth.user_id } as OperationDataType<'newsletter_templates', 'update'>,
    });
  }

  public async deleteTemplate(auth: IAuthKeyPayload, id: string) {
    await this.mustGetTemplate(auth.tenant_id, id);
    return this.delete(auth.tenant_id, id, auth.user_id);
  }

  private async mustGetTemplate(tenant_id: string, id: string) {
    const template = await this.getRepo().getOneById({ tenant_id, id });
    if (!template) throw new NotFoundError('Template not found');
    return template;
  }
}
