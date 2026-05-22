export const environment = {
  production: true,
  apiUrl: 'https://pplcrm.example.com',
  googleMapsApiKey: import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
};
