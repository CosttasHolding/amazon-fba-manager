import { mkdirSync, copyFileSync, readdirSync, existsSync, rmSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const EXTENSION_SRC = resolve(__dirname, "../chrome-extension");
const DIST = resolve(__dirname, "../../public/exteRB");

function buildTs(file: string, out: string) {
  execSync(`npx esbuild "${file}" --bundle --outfile="${out}" --minify --platform=browser --format=iife`, {
    stdio: "inherit",
  });
}

function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  });
}

async function build() {
  console.log("Building Chrome Extension...");

  if (existsSync(DIST)) rmSync(DIST, { recursive: true });
  mkdirSync(DIST, { recursive: true });
  mkdirSync(join(DIST, "popup"), { recursive: true });
  mkdirSync(join(DIST, "content"), { recursive: true });

  copyFileSync(join(EXTENSION_SRC, "manifest.json"), join(DIST, "manifest.json"));
  copyFileSync(join(EXTENSION_SRC, "popup", "popup.html"), join(DIST, "popup", "popup.html"));
  copyFileSync(join(EXTENSION_SRC, "popup", "popup.css"), join(DIST, "popup", "popup.css"));
  copyDir(join(EXTENSION_SRC, "icons"), join(DIST, "icons"));

  buildTs(join(EXTENSION_SRC, "popup", "popup.ts"), join(DIST, "popup", "popup.js"));
  buildTs(join(EXTENSION_SRC, "content", "content.ts"), join(DIST, "content", "content.js"));

  console.log(`Extension built: ${DIST} (Load unpacked → esta carpeta)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
