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

// SMS is the primary wake-you-up channel — app push is unreliable for this subscription's
// guest (#EXT#) identity.
param opsAlertSmsNumber = '4168236993'

// One real tenant forms host to probe. Leave '' to skip the forms availability test.
param formsProbeUrl = ''

// Enabled 2026-07-21: /healthz/worker is live in prod (backend deployed + ops_heartbeats
// migration applied + first watchdog beat verified). Was false until then — probing the
// endpoint before it exists 404-alerts forever.
param enableWorkerProbe = true
