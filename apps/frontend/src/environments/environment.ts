export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  googleMapsApiKey: process.env['NX_GOOGLE_MAPS_API_KEY'] ?? '',
};
