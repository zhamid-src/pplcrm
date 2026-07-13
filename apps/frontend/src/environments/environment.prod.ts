export const environment = {
  production: true,
  apiUrl: 'https://pplcrm.example.com',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
  // Set to your real base domain in production, e.g. 'mydomain.com' → public pages (forms, events,
  // volunteer signups, donations) at '<tenant>.mydomain.com'.
  publicBaseDomain: 'example.com',
  // Empty ⇒ same-origin: the companion apps are path-routed on the CRM's own domain in production,
  // so companion links use window.location.origin. Only dev overrides this (separate port).
  companionOrigin: '',
};
