import fs from 'fs';
import path from 'path';

const files = [
  'apps/frontend-e2e/src/email-client.spec.ts',
  'apps/frontend-e2e/src/persons-grid.spec.ts',
  'apps/frontend-e2e/src/signin.spec.ts',
  'apps/frontend-e2e/src/volunteer-events.spec.ts',
  'apps/frontend-e2e/src/web-forms.spec.ts'
];

for (const file of files) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Convert array-wrapped data formats:
  // JSON.stringify([{ result: { data: <content> } }])
  // to:
  // JSON.stringify({ result: { data: { json: <content> } } })
  const newContent = content.replace(
    /JSON\.stringify\(\[\{\s*result:\s*\{\s*data:\s*([\s\S]*?)\s*\}\s*\}\]\)/g,
    (match, p1) => {
      // Indent each line in p1 by 2 spaces to maintain neat formatting
      const lines = p1.split('\n');
      const indentedLines = lines.map((line, idx) => {
        if (idx === 0) return line;
        return '  ' + line;
      });
      const p1Indented = indentedLines.join('\n');
      return `JSON.stringify({ result: { data: { json: ${p1Indented} } } })`;
    }
  );

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Converted ${file}`);
}
