import { BaseController } from '../../lib/base.controller';
import { FilesRepo } from './repositories/files.repo';
import { StorageService } from '../../lib/storage.service';
import type { IAuthKeyPayload } from '../../../../../../libs/common/src/lib/auth';

export class FilesController extends BaseController<'files', FilesRepo> {
  private storageService = new StorageService();

  constructor() {
    super(new FilesRepo());
  }

  public async getAllFiles(auth: IAuthKeyPayload, options?: any) {
    return this.getAllWithCounts(auth.tenant_id, options);
  }

  public async registerFile(
    input: {
      filename: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      storageKey: string;
      sha256Hex?: string | null;
    },
    auth: IAuthKeyPayload,
  ) {
    if (input.sha256Hex) {
      const existing = await this.getRepo()
        .db.selectFrom('files')
        .selectAll()
        .where('tenant_id', '=', auth.tenant_id)
        .where('sha256_hex', '=', input.sha256Hex)
        .executeTakeFirst();
      if (existing) {
        // Clean up the newly uploaded duplicate file from storage since we won't be using it
        try {
          await this.storageService.delete(input.storageKey);
        } catch (err) {
          console.error(`Failed to clean up duplicate file ${input.storageKey}`, err);
        }
        return existing;
      }
    }

    return this.add({
      tenant_id: auth.tenant_id,
      filename: input.filename,
      mime_type: input.mimeType || null,
      size_bytes: input.sizeBytes || null,
      storage_key: input.storageKey,
      sha256_hex: input.sha256Hex || null,
      uploaded_by: auth.user_id,
    });
  }

  public async generateUploadSasUrl(key: string, expiryMinutes = 15): Promise<string> {
    return this.storageService.generateWriteSasUrl(key, expiryMinutes);
  }

  public override async delete(tenant_id: string, id: string, userId?: string): Promise<boolean> {
    const file = (await this.getOneById({ tenant_id, id })) as any;
    if (!file) return false;

    // Delete from DB
    const deleted = await super.delete(tenant_id as any, id, userId);

    // Delete from Azure Storage
    if (deleted && file.storage_key) {
      try {
        await this.storageService.delete(file.storage_key);
      } catch (err) {
        console.error(`Failed to delete blob for storage key ${file.storage_key}`, err);
      }
    }
    return deleted;
  }

  public override async deleteMany(tenant_id: string, ids: string[], userId?: string): Promise<boolean> {
    let anyDeleted = false;
    for (const id of ids) {
      const ok = await this.delete(tenant_id, id, userId);
      if (ok) anyDeleted = true;
    }
    return anyDeleted;
  }
}
