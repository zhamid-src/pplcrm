import { BaseController } from '../../lib/base.controller';
import { FilesRepo } from './repositories/files.repo';
import { StorageService } from '../../lib/storage.service';
import type { IAuthKeyPayload } from 'common/src/lib/auth';

export class FilesController extends BaseController<'files', FilesRepo> {
  private storageService = new StorageService();

  constructor() {
    super(new FilesRepo());
  }

  public async getAllFiles(auth: IAuthKeyPayload, options?: any) {
    return this.getAll(auth.tenant_id, options);
  }

  public override async delete(tenant_id: string, id: string, userId?: string): Promise<boolean> {
    const file = await this.getOneById({ tenant_id, id }) as any;
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
