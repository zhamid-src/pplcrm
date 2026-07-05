export const environment = {
  production: true,
  apiUrl: 'https://pplcrm.example.com',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
  // Set to your real base domain in production, e.g. 'mydomain.com' → forms at '<tenant>.mydomain.com'.
  publicFormsBaseDomain: 'example.com',
};
