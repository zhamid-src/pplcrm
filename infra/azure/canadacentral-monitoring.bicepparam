using './monitoring.bicep'

// Region 1 monitoring. Deployed by CI (.github/workflows/deploy-infra.yml) on changes under
// infra/azure/ — no secrets required; containerAppResourceId is looked up by the workflow.
param location = 'canadacentral'
param regionCode = 'cad'
// The region-1 server was hand-built as `pplcrm-pg` (see canadacentral.bicepparam).
param pgServerName = 'pplcrm-pg'

// Ops alerting. Email digests/alerts go to opsAlertEmail; mobile push must target the AZURE
// account signed into the Azure mobile app on your phone (they differ here).
param opsAlertEmail = 'hello@pplcrm.com'
param azurePushEmail = 'hello@pplcrm.com'

// One real tenant forms host to probe. Leave '' to skip the forms availability test.
param formsProbeUrl = ''

// Flip to true (and merge) only after the backend ships GET /healthz/worker AND its
// ops_heartbeats migration has run in prod — probing it earlier would 404-alert forever.
param enableWorkerProbe = false
