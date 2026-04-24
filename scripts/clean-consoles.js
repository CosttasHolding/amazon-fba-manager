const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

const EXCLUDE_FILES = [
  'error.tsx',
  'error-boundary.tsx',
  'api-utils.ts',
];

function shouldExclude(filePath) {
  return EXCLUDE_FILES.some(ex => filePath.includes(ex));
}

function processFile(filePath) {
  if (shouldExclude(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remove lines with console.log, console.warn, console.error, console.info, console.debug
  // But be careful to not break code structure
  const lines = content.split('\n');
  const newLines = lines.filter(line => {
    const trimmed = line.trim();
    // Keep console.error in catch blocks that rethrow or handle errors meaningfully? 
    // For now, remove all console.* 
    if (trimmed.startsWith('console.')) return false;
    return true;
  });
  
  content = newLines.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned: ${filePath}`);
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
console.log('Done cleaning console statements');
