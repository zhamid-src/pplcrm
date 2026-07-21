using './monitoring.bicep'

// Region 1 monitoring. Deployed by CI (.github/workflows/deploy-infra.yml) on changes under
// infra/azure/ — no secrets required; containerAppResourceId is looked up by the workflow.
param location = 'canadacentral'
param regionCode = 'cad'
// The region-1 server was hand-built as `pplcrm-pg` (see canadacentral.bicepparam).
param pgServerName = 'pplcrm-pg'

// Ops alerting (email + Azure mobile-app push both go here; push requires this Azure account to
// be signed into the Azure mobile app).
param opsAlertEmail = 'hello@pplcrm.com'

// One real tenant forms host to probe. Leave '' to skip the forms availability test.
param formsProbeUrl = ''

// Flip to true (and merge) only after the backend ships GET /healthz/worker AND its
// ops_heartbeats migration has run in prod — probing it earlier would 404-alert forever.
param enableWorkerProbe = false
