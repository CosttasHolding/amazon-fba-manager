const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// One backslash in the source file => we need '\\' in JS string literal
const REPLACEMENTS = [
  [/\\u00E1/g, 'á'], [/\\u00E9/g, 'é'], [/\\u00ED/g, 'í'], [/\\u00F3/g, 'ó'], [/\\u00FA/g, 'ú'],
  [/\\u00C1/g, 'Á'], [/\\u00C9/g, 'É'], [/\\u00CD/g, 'Í'], [/\\u00D3/g, 'Ó'], [/\\u00DA/g, 'Ú'],
  [/\\u00F1/g, 'ñ'], [/\\u00D1/g, 'Ñ'],
  [/\\u00FC/g, 'ü'], [/\\u00DC/g, 'Ü'],
  [/\\u00BF/g, '¿'], [/\\u00A1/g, '¡'],
  [/\\u2014/g, '—'],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  for (const [regex, replacement] of REPLACEMENTS) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  }
}

walkDir(SRC_DIR);
console.log('Done fixing Unicode escapes');
