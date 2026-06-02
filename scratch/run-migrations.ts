import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.development', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

async function run() {
  const { migrateToLatest } = await import('../apps/backend/src/app/kyselyinit');
  await migrateToLatest();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
