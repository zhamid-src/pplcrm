using './main.bicep'

// Region 1. The server was first hand-built as `pplcrm-pg`, so we pin the name here to keep this
// template idempotent against the existing server.
param location = 'canadacentral'
param regionCode = 'cad'
param pgServerName = 'pplcrm-pg'
param pgAdminUser = 'pplcrmadmin'

// pgAdminPassword is a secret — do NOT commit it. Pass it at deploy time:
//   az deployment group create -g pplcrm-cad-prod -f infra/azure/main.bicep \
//     -p infra/azure/canadacentral.bicepparam -p pgAdminPassword='<the admin password>'
// (optionally add -p adminClientIp="$(curl -s https://api.ipify.org)" for manual-migration access)
