const { execSync } = require("child_process");
const fs = require("fs");

const SECRET_PATTERNS = [
  { name: "OpenAI", regex: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: "xAI / Grok", regex: /xai-[A-Za-z0-9_-]{20,}/ },
  { name: "AWS Access Key", regex: /(^|[^A-Z0-9])AKIA[0-9A-Z]{16}([^A-Z0-9]|$)/ },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Stripe", regex: /sk_(live|test)_[0-9a-zA-Z]{20,}/ },
  { name: "GitHub Token", regex: /ghp_[0-9A-Za-z]{36,}/ },
  { name: "Slack Token", regex: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: "npm Token", regex: /\/\/registry\.npmjs\.org\/:_authToken=[0-9a-zA-Z_-]{20,}/ },
  { name: "Private Key", regex: /-----BEGIN (RSA |EC |OPENSSH |PGP |DSA |ENCRYPTED )?PRIVATE KEY-----/ },
  { name: "Supabase/Google Service JWT", regex: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/ },
];

const BINARY_EXT = /\.(png|jpe?g|gif|webp|zip|ico|svg|woff2?|ttf|eot|pdf|docx?|xlsx?|pptx?|crx)$/i;

const stagedFiles = execSync("git diff --cached --name-only --diff-filter=ACM", {
  encoding: "utf8",
})
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !BINARY_EXT.test(f));

if (stagedFiles.length === 0) process.exit(0);

let blocked = false;

for (const file of stagedFiles) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const { name, regex } of SECRET_PATTERNS) {
    const match = content.match(regex);
    if (match) {
      const preview = match[0].slice(0, 18) + "...";
      console.error(`[SECRETO] ${file} -> patrón "${name}": ${preview}`);
      blocked = true;
    }
  }
}

if (blocked) {
  console.error("");
  console.error("Commit BLOQUEADO: se detectaron posibles credenciales/secretos.");
  console.error("Rotá la key comprometida y NO la commitees.");
  console.error("Las keys van solo en .env.local (gitignored).");
  process.exit(1);
}
