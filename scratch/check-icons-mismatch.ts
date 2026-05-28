import * as fs from 'fs';
import * as path from 'path';

// Read all files in assets/icons
const iconsDir = '/Users/dev/Coding/pplcrm/apps/frontend/src/assets/icons';
const svgFiles = fs.readdirSync(iconsDir)
  .filter(file => file.endsWith('.svg'))
  .map(file => file.slice(0, -4)); // remove .svg

// Load icons.index.ts and extract names mapped in the icons object
const indexFile = '/Users/dev/Coding/pplcrm/apps/frontend/src/app/uxcommon/components/icons/icons.index.ts';
const indexContent = fs.readFileSync(indexFile, 'utf8');

// Match lines like: name: 'assets/icons/file.svg' or 'name': 'assets/icons/file.svg'
const matches = indexContent.matchAll(/^\s+['"]?([a-zA-Z0-9-]+)['"]?:\s+['"]([^'"]+)['"]/gm);
const mappedIcons = new Map<string, string>();
for (const match of matches) {
  mappedIcons.set(match[1], match[2]);
}

console.log('--- SVGs in assets/icons but NOT mapped in icons.index.ts ---');
const unmapped = svgFiles.filter(svg => !mappedIcons.has(svg));
console.log(unmapped);

console.log('\n--- Mapped icons pointing to non-existent SVG files ---');
const brokenMaps: string[] = [];
for (const [key, value] of mappedIcons.entries()) {
  if (value === 'none') continue;
  const fullPath = path.resolve('/Users/dev/Coding/pplcrm/apps/frontend/src', value);
  if (!fs.existsSync(fullPath)) {
    brokenMaps.push(`${key} -> ${value}`);
  }
}
console.log(brokenMaps);
