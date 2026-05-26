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

let modifiedCount = 0;

walk(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip files that don't have Injectable
  if (!content.includes('@Injectable')) {
    return;
  }

  // Strip comments to analyze constructors accurately
  const cleanContent = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const constructorMatch = cleanContent.match(/constructor\s*\(([^)]*)\)/);
  const hasParams = constructorMatch && constructorMatch[1].trim().length > 0;

  // We should NOT convert datagrid controllers/services that are provided at component-level
  // E.g., if they are in the datagrid folder, they might have constructor injection or be scoped.
  const isDatagridComponentScoped = filePath.includes('uxcommon/components/datagrid');

  if (hasParams || isDatagridComponentScoped) {
    return; // not eligible
  }

  // Replace @Injectable(...) decorator (supporting trailing commas)
  const updatedContent = content.replace(/@Injectable\s*\(\s*(\{\s*providedIn\s*:\s*['"]root['"]\s*,?\s*\})?\s*\)/g, '@Service()');

  if (updatedContent !== content) {
    let finalContent = updatedContent;

    // Adjust imports
    finalContent = finalContent.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@angular\/core['"]\s*;?/g, (match, importBody) => {
      const imports = importBody.split(',').map((i) => i.trim());
      
      // Add Service
      if (!imports.includes('Service')) {
        imports.push('Service');
      }

      // Check if Injectable is used anywhere else in the file
      // Remove @Injectable decorator and check if "Injectable" remains
      const testContent = finalContent.replace(/@Service\(\)/g, '');
      
      // Strip comments from testContent to avoid matching comments
      const testCleanContent = testContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      // Check for word boundary to avoid matching things like InjectableType
      const hasInjectableRemaining = /\bInjectable\b/.test(testCleanContent);

      let filteredImports = imports;
      if (!hasInjectableRemaining) {
        filteredImports = imports.filter((i) => i !== 'Injectable');
      }

      return `import { filteredImports } from '@angular/core';`.replace('filteredImports', filteredImports.join(', '));
    });

    fs.writeFileSync(filePath, finalContent, 'utf8');
    modifiedCount++;
    console.log(`Refactored: ${path.relative(targetDir, filePath)}`);
  }
});

console.log(`\nRefactoring complete! Modified ${modifiedCount} files.`);
