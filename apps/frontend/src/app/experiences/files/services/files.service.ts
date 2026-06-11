import { Service } from '@angular/core';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ExportCsvInputType, ExportCsvResponseType, getAllOptionsType } from '@common';

@Service()
export class FilesService extends AbstractAPIService<'files', any> {
  protected override readonly endpointName = 'files';

  public add(_row: any) {
    return Promise.resolve({});
  }

  public addMany(rows: any[]) {
    return Promise.resolve(rows);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return Promise.resolve(0);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(true);
  }

  public async getAll(options?: getAllOptionsType) {
    return this.api.files.getAll.query(options, {
      signal: this.ac.signal,
    });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(_id: string) {
    return Promise.resolve(undefined);
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public async update(_id: string, _data: any) {
    return Promise.resolve({});
  }

  public async getUploadUrl(
    filename: string,
    mimeType?: string | null,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    return (await this.api.files.getUploadUrl.query({ filename, mimeType })) as {
      uploadUrl: string;
      storageKey: string;
    };
  }

  public async registerFile(data: {
    filename: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    storageKey: string;
    sha256Hex?: string | null;
  }): Promise<any> {
    return await this.api.files.registerFile.mutate(data);
  }

  private async computeSha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  public async uploadFileDirectly(file: File): Promise<any> {
    const { uploadUrl, storageKey } = await this.getUploadUrl(file.name, file.type);

    const sha256Hex = await this.computeSha256(file);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!res.ok) {
      throw new Error(`Upload to storage failed with status ${res.status}`);
    }

    return await this.registerFile({
      filename: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
      storageKey,
      sha256Hex,
    });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.resolve({ csv: '', columns: [], fileName: '', rowCount: 0 });
  }
}
