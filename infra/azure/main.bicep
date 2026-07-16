// pplCRM per-region Azure infrastructure.
//
// Captures one region's data + compute plane so additional regions (US, EU) are a param change,
// not a manual re-walk of deploy/PROD-CHECKLIST.md. Deploy into a per-region resource group:
//
//   az group create -n pplcrm-cad-prod -l canadacentral
//   az deployment group create -g pplcrm-cad-prod -f infra/azure/main.bicep \
//     -p @infra/azure/canadacentral.bicepparam
//
// WIP: currently provisions Postgres (server + pplcrm db + extension allow-list + firewall).
// Blob storage and the pplcrm-api Container App are appended as the checklist reaches them.
//
// NOTE: region 1 (Canada Central) was first stood up by hand with server name `pplcrm-pg`. This
// template names servers `pplcrm-pg-<regionCode>` by default; pass `pgServerName: 'pplcrm-pg'` in the
// Canada params to match the existing server, or accept the suffixed name for a fresh build.

@description('Azure region, e.g. canadacentral, eastus, westeurope.')
param location string

@description('Short region code used in resource names, e.g. cad, use, euw.')
param regionCode string

@description('PostgreSQL administrator username (not a true superuser on Flexible Server).')
param pgAdminUser string

@description('PostgreSQL administrator password.')
@secure()
param pgAdminPassword string

@description('Override the server name. Defaults to pplcrm-pg-<regionCode>.')
param pgServerName string = 'pplcrm-pg-${regionCode}'

@description('PostgreSQL compute tier.')
param pgTier string = 'Burstable'

@description('PostgreSQL SKU.')
param pgSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage size (GB).')
param pgStorageGb int = 32

@description('PostgreSQL major version.')
param pgVersion string = '16'

@description('Optional admin client IP allowed through the firewall (for manual migrations). Empty = skip.')
param adminClientIp string = ''

@description('Storage account name (globally unique, 3-24 lowercase alphanumeric). Defaults to pplcrm<regionCode>storage.')
param storageAccountName string = 'pplcrm${regionCode}storage'

resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: pgServerName
  location: location
  sku: {
    name: pgSkuName
    tier: pgTier
  }
  properties: {
    version: pgVersion
    administratorLogin: pgAdminUser
    administratorLoginPassword: pgAdminPassword
    storage: {
      storageSizeGB: pgStorageGb
    }
    highAvailability: {
      mode: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Allow-list the trusted extensions the schema baseline creates (pg_trgm, pgcrypto). Azure blocks
// CREATE EXTENSION until they appear here.
resource pgExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: pg
  name: 'azure.extensions'
  properties: {
    value: 'PG_TRGM,PGCRYPTO'
    source: 'user-override'
  }
}

resource pgDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: pg
  name: 'pplcrm'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// 0.0.0.0-0.0.0.0 is Azure's sentinel for "allow other Azure services" (e.g. the Container App).
resource fwAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: pg
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource fwAdminClient 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = if (!empty(adminClientIp)) {
  parent: pg
  name: 'AllowAdminClient'
  properties: {
    startIpAddress: adminClientIp
    endIpAddress: adminClientIp
  }
}

// --- Blob storage (private 'uploads' container; backend hands out SAS URLs) ---
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'uploads'
  properties: {
    publicAccess: 'None'
  }
}

output pgServerNameOut string = pg.name
output pgFqdn string = pg.properties.fullyQualifiedDomainName
output storageAccountNameOut string = storage.name
