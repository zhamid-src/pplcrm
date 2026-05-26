import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

let cleanedCount = 0;

walk(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if Injectable is imported from @angular/core
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@angular\/core['"]\s*;?/g;
  const match = importRegex.exec(content);
  if (!match) return;

  const importBody = match[1];
  const imports = importBody.split(',').map((i) => i.trim());

  if (imports.includes('Injectable')) {
    // Check if "Injectable" appears elsewhere in the file
    // Remove the import statement itself and any comments to check true usage
    const withoutImports = content
      .replace(importRegex, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');

    // Check if Injectable is used (e.g. word boundary to avoid matching "InjectableType" or other symbols)
    const hasUsage = /\bInjectable\b/.test(withoutImports);

    if (!hasUsage) {
      // Remove Injectable from imports
      const filteredImports = imports.filter((i) => i !== 'Injectable');
      const newImportStatement = `import { ${filteredImports.join(', ')} } from '@angular/core';`;
      
      const newContent = content.replace(importRegex, newImportStatement);
      fs.writeFileSync(filePath, newContent, 'utf8');
      cleanedCount++;
      console.log(`Cleaned unused Injectable import in: ${path.relative(targetDir, filePath)}`);
    }
  }
});

console.log(`\nCleanup complete! Removed unused Injectable imports from ${cleanedCount} files.`);
