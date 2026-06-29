import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { env } from '../../env';
import type { Readable } from 'stream';
import { logger } from '../logger';

export class StorageService {
  private serviceClient: BlobServiceClient;
  private containerClient;

  constructor() {
    const connectionString = env.azureStorageConnectionString || 'UseDevelopmentStorage=true';
    const containerName = env.azureStorageContainer || 'uploads';
    this.serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.serviceClient.getContainerClient(containerName);
  }

  public async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.containerClient.createIfNotExists();
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  public async uploadStream(key: string, stream: Readable, contentType: string): Promise<void> {
    await this.containerClient.createIfNotExists();
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.uploadStream(stream, undefined, undefined, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  public async generateWriteSasUrl(key: string, expiryMinutes = 15): Promise<string> {
    await this.containerClient.createIfNotExists();

    try {
      await this.serviceClient.setProperties({
        cors: [
          {
            allowedOrigins: '*',
            allowedMethods: 'GET,HEAD,POST,PUT,DELETE,OPTIONS',
            allowedHeaders: '*',
            exposedHeaders: '*',
            maxAgeInSeconds: 3600,
          },
        ],
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to set storage service CORS properties');
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    const permissions = BlobSASPermissions.parse('w');
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);
    return await blockBlobClient.generateSasUrl({
      permissions,
      expiresOn,
    });
  }

  public async download(key: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    const downloadBlockBlobResponse = await blockBlobClient.download(0);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = downloadBlockBlobResponse.readableStreamBody;
      if (!stream) {
        reject(new Error('No readable stream body in blob response'));
        return;
      }
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
  }

  public async delete(key: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
  }
}
