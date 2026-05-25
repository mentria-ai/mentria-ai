// Embeds JetBrains Mono (mentria.ai's --font-mono) into the hero SVGs as a base64
// @font-face so the terminal text matches the website with ZERO external calls.
// Idempotent + reproducible: re-run after editing a hero SVG or updating the font.
//
//   node tools/embed-hero-font.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontPath = path.join(root, 'assets/fonts/jbm-latin.woff2');
const heroes = ['hero-dark', 'hero-light', 'hero-dark-mobile', 'hero-light-mobile']
  .map((n) => path.join(root, 'assets', `${n}.svg`));

const b64 = (await readFile(fontPath)).toString('base64');
const STYLE = `<style>@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:100 800;src:url(data:font/woff2;base64,${b64}) format('woff2')}</style>`;
const FAMILY = "'JetBrains Mono','ui-monospace',SFMono-Regular,Menlo,monospace";

for (const f of heroes) {
  let svg = await readFile(f, 'utf8');
  svg = svg.replace(/\s*<style>@font-face[\s\S]*?<\/style>/, ''); // drop any prior embed (idempotent)
  svg = svg.replace(/font-family="[^"]*"/, `font-family="${FAMILY}"`); // root font stack
  if (svg.includes('<defs>')) {
    svg = svg.replace('<defs>', `<defs>\n    ${STYLE}`);
  } else {
    svg = svg.replace(/(<svg\b[^>]*>)/, `$1\n  ${STYLE}`);
  }
  await writeFile(f, svg);
  console.log('embedded font →', path.relative(root, f));
}
