export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
};
