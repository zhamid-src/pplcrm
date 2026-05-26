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

walk(targetDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('@Injectable')) {
    // Check constructor
    // Simple regex to find constructor parameters
    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/);
    const hasParams = constructorMatch && constructorMatch[1].trim().length > 0;
    const paramsText = constructorMatch ? constructorMatch[1].trim() : 'No Constructor';
    console.log(`${path.relative(targetDir, filePath)}: has constructor params = ${hasParams} (${paramsText})`);
  }
});
