import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '../../env';

export class StorageService {
  private containerClient;

  constructor() {
    const connectionString = env.azureStorageConnectionString || 'UseDevelopmentStorage=true';
    const containerName = env.azureStorageContainer || 'uploads';
    const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = serviceClient.getContainerClient(containerName);
  }

  public async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.containerClient.createIfNotExists();
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: contentType },
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
}
