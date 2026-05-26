import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory is apps/frontend/src/app
const targetDir = path.resolve(__dirname, '../apps/frontend/src/app');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, callback);
    } else if (stat.isFile() && filePath.endsWith('.ts') && !filePath.endsWith('.spec.ts')) {
      callback(filePath);
    }
  }
}

let modifiedCount = 0;

console.log(`Starting cleanup in: ${targetDir}`);

walk(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Check if the component has ChangeDetectionStrategy.OnPush
  if (content.includes('ChangeDetectionStrategy.OnPush')) {
    // Remove the changeDetection metadata line
    // Matches e.g.: changeDetection: ChangeDetectionStrategy.OnPush, (and optional newlines/spaces)
    content = content.replace(/changeDetection\s*:\s*ChangeDetectionStrategy\s*\.\s*OnPush\s*,?\r?\n?\s*/g, '');
    modified = true;

    // 2. Clean up the import statement from @angular/core
    // Matches: import { ... } from '@angular/core';
    content = content.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@angular\/core['"]\s*;?/g, (match, importBody) => {
      // Split individual imports, filter out ChangeDetectionStrategy
      const imports = importBody
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i && i !== 'ChangeDetectionStrategy');

      if (imports.length === 0) {
        return ''; // remove the entire import statement
      }

      // Reconstruct clean import
      return `import { ${imports.join(', ')} } from '@angular/core';`;
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${path.relative(targetDir, filePath)}`);
  }
});

console.log(`\nDone! Modified ${modifiedCount} files.`);
