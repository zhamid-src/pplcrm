export const environment = {
  production: true,
  // The backend has its own origin because tRPC is mounted at the root path '/' and can't share a
  // host with the CRM's static SPA. The CRM SPA (app.pplcrm.com) reaches this cross-origin; CORS is
  // locked to APP_URL and the refresh cookie is same-site (both under pplcrm.com).
  apiUrl: 'https://api.pplcrm.com',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
  // The public submission surface (forms, events, volunteer signups, donations) lives on a dedicated
  // domain at '<org>.pplforms.com'; this is the base the tenant subdomain hangs off of.
  publicBaseDomain: 'pplforms.com',
  // The volunteer companion apps (canvass /t/:token, deliveries /r/:token) are served on their own
  // subdomain in production — they're a separate root-based SPA that can't share app.pplcrm.com's
  // root with the CRM. companionUrl() builds shareable volunteer links against this origin.
  companionOrigin: 'https://go.pplcrm.com',
};
