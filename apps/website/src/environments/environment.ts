export const environment = {
  production: false,
  /**
   * Where the CRM app itself lives — the "Log in" and "Start free" buttons on
   * the marketing site point here (`${appUrl}/signin`, `${appUrl}/signup`).
   * The marketing site and the app are deployed to separate hosts, so this is
   * an absolute URL. Change it in one place if the app ever moves.
   */
  appUrl: 'http://localhost:4200',
  /**
   * The marketing site's own public origin. Used to build absolute URLs for
   * SEO (canonical tags, sitemap) and the AI-agent surface (llms.txt). Dev
   * serves on port 4400 (see project.json).
   */
  siteUrl: 'http://localhost:4400',
};
