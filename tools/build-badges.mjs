// Generates self-contained tech-badge SVGs with embedded Simple Icons logos.
// Icons are fetched at BUILD time from jsDelivr and baked into each committed
// badge, so the README renders them with ZERO external/render-time calls.
//
//   node tools/build-badges.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets/badges');

// file -> { simple-icons slug, label, brand color }
const BADGES = [
  { file: 'python', slug: 'python', label: 'Python', color: '#3776AB' },
  { file: 'typescript', slug: 'typescript', label: 'TypeScript', color: '#3178C6' },
  { file: 'go', slug: 'go', label: 'Go', color: '#00ADD8' },
  { file: 'docker', slug: 'docker', label: 'Docker', color: '#2496ED' },
  { file: 'actions', slug: 'githubactions', label: 'GitHub Actions', color: '#2088FF' },
  { file: 'nunjucks', slug: 'nunjucks', label: 'Nunjucks', color: '#1C4913' },
];

async function iconPath(slug) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons/icons/${slug}.svg`);
  if (!res.ok) return null;
  const m = (await res.text()).match(/<path\s+d="([^"]+)"/);
  return m ? m[1] : null;
}

await mkdir(outDir, { recursive: true });
for (const b of BADGES) {
  const d = await iconPath(b.slug);
  const padL = 12;
  const textX = padL + (d ? 16 + 8 : 0);
  const W = textX + Math.ceil(b.label.length * 7.3) + 12;
  const icon = d ? `\n  <g transform="translate(${padL},6)"><path transform="scale(0.6667)" d="${d}" fill="#ffffff"/></g>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="28" viewBox="0 0 ${W} 28" role="img" aria-label="${b.label}">
  <rect width="${W}" height="28" rx="6" fill="${b.color}"/>${icon}
  <text x="${textX}" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">${b.label}</text>
</svg>
`;
  await writeFile(path.join(outDir, `${b.file}.svg`), svg);
  console.log(`${d ? '●' : '○'} ${b.file}.svg (${W}px)${d ? '' : '  [no icon in simple-icons — text only]'}`);
}
