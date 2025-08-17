import {
  BlobServiceClient,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'uploads';

async function main() {
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  await serviceClient.setProperties({
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

  const credential = (serviceClient as any).credential as StorageSharedKeyCredential;

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      permissions: BlobSASPermissions.parse('cw'),
      expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000),
      protocol: SASProtocol.HttpsAndHttp,
    },
    credential,
  ).toString();

  console.log(`SAS URL for container '${containerName}':`);
  console.log(`${containerClient.url}?${sas}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
