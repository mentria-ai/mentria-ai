// Fails (exit 1) if README references any EXTERNAL image, a missing local asset,
// or a referenced local SVG that isn't self-contained. Hyperlinks (href) are allowed.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = await readFile(path.join(repoRoot, 'README.md'), 'utf8');
const failures = [];

// Collect image sources only: <img>/<source> src|srcset, and markdown ![](...)
const imgSrcs = new Set();
for (const m of md.matchAll(/<(?:img|source)\b[^>]*?\b(src|srcset)="([^"]+)"/gi)) {
  // Only srcset is a comma-separated list; a plain src may itself contain commas.
  const parts = m[1].toLowerCase() === 'srcset' ? m[2].split(',') : [m[2]];
  for (const part of parts) {
    const u = part.trim().split(/\s+/)[0];
    if (u) imgSrcs.add(u);
  }
}
for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) imgSrcs.add(m[1].trim());

// 1) No external image refs
const external = [...imgSrcs].filter((u) => /^https?:/i.test(u));
if (external.length) failures.push(`External image refs (${external.length}):\n  - ${external.join('\n  - ')}`);

// 2) Local assets exist; 3) referenced SVGs are self-contained
for (const ref of imgSrcs) {
  if (/^https?:/i.test(ref)) continue;
  const p = path.join(repoRoot, ref);
  if (!existsSync(p)) { failures.push(`Missing local asset: ${ref}`); continue; }
  if (ref.endsWith('.svg')) {
    const svg = await readFile(p, 'utf8');
    const bad = [...svg.matchAll(/https?:\/\/[^\s"')>]+/gi)]
      .map((m) => m[0])
      .filter((u) => !/^https?:\/\/(www\.)?w3\.org/i.test(u)); // xmlns is not a network call
    if (bad.length) failures.push(`SVG ${ref} has external URLs: ${bad.join(', ')}`);
    if (/@import|<image\b[^>]*href="https?:/i.test(svg)) failures.push(`SVG ${ref} has remote import/image`);
  }
}

if (failures.length) {
  console.error('❌ README check FAILED:\n\n' + failures.join('\n\n'));
  process.exit(1);
}
console.log('✅ README check passed: 0 external image refs; all assets present and self-contained.');
