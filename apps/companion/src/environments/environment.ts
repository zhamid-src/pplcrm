export const environment = {
  production: false,
  /**
   * The companion app always calls the backend with relative `/api` paths:
   * the dev server proxies them to :3000 (proxy.conf.json), and production
   * serves the app path-routed on the same domain as the API.
   */
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
};
