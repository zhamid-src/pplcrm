export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
  // Base domain tenant subdomains hang off of, for building public page URLs (`<slug>.<baseDomain>`):
  // forms, event RSVPs, volunteer signups, donations.
  publicBaseDomain: 'localhost',
};
