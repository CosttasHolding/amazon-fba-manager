const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/sp-api/page.tsx', 'utf8');
const lines = content.split('\n');
const line = lines[307];
console.log('Line 308:', JSON.stringify(line));
// Find all non-ASCII characters
for (let i = 0; i < line.length; i++) {
  const code = line.charCodeAt(i);
  if (code > 127) {
    console.log(`  Pos ${i}: U+${code.toString(16).toUpperCase().padStart(4, '0')} = "${line[i]}"`);
  }
}
