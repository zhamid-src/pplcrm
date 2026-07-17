/**
 * Regenerate the marketing social/icon assets from the templates in this
 * folder, writing PNGs into `apps/website/src/assets/`:
 *
 *   - og-card.png          1200x630 Open Graph / Twitter share card
 *   - apple-touch-icon.png 180x180 opaque (white) app icon for iOS
 *
 * The other icon/favicon assets are the real brand files referenced directly
 * (logo-sq.svg, logo-sq-full.png) and are not generated here.
 *
 * Run:  node apps/website/tools/social/render.mjs
 * Requires Playwright's Chromium (already a dev dependency).
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const require = createRequire(join(repoRoot, 'package.json'));
const { chromium } = require('playwright');

// Embed as data URIs: page.setContent() runs on an about:blank origin that
// cannot load file:// sub-resources, so the font/logos must be inlined.
const dataUri = (path, mime) => `data:${mime};base64,${readFileSync(path).toString('base64')}`;
const fontUrl = dataUri(
  join(repoRoot, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  'font/woff2',
);
const logoUrl = dataUri(join(repoRoot, 'apps/frontend/src/assets/logo.png'), 'image/png');
const logoSqUrl = dataUri(join(repoRoot, 'apps/frontend/src/assets/logo-sq-full.png'), 'image/png');
const assetsDir = join(repoRoot, 'apps/website/src/assets');

function fill(templateFile, replacements) {
  let html = readFileSync(join(here, templateFile), 'utf8');
  for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(token, value);
  return html;
}

const browser = await chromium.launch();
try {
  // Share card — rendered at 1x so it is exactly 1200x630.
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.setContent(fill('og-card.html', { FONT_URL: fontUrl, LOGO_URL: logoUrl }), {
    waitUntil: 'networkidle',
  });
  await card.evaluate(() => document.fonts.ready);
  await (await card.$('.card')).screenshot({ path: join(assetsDir, 'og-card.png') });
  console.log('wrote og-card.png (1200x630)');

  // Apple touch icon — opaque white field behind the square logo.
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await icon.setContent(fill('apple-icon.html', { LOGO_SQ_URL: logoSqUrl }), { waitUntil: 'networkidle' });
  await (await icon.$('.tile')).screenshot({ path: join(assetsDir, 'apple-touch-icon.png') });
  console.log('wrote apple-touch-icon.png (180x180)');
} finally {
  await browser.close();
}
