export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  // Base domain tenant subdomains hang off of, for building public page URLs (`<slug>.<baseDomain>`):
  // forms, event RSVPs, volunteer signups, donations.
  publicBaseDomain: 'localhost',
  // The volunteer companion apps (canvass /t/:token, deliveries /r/:token) run on their own dev
  // server (port 4300). In production they are path-routed on the CRM's own domain, so this is ''
  // there and copied links use window.location.origin instead. See shared/public-pages.companionUrl.
  companionOrigin: 'http://localhost:4300',
};
