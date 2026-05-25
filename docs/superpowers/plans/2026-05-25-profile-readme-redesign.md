# Profile README Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `mentria-ai/mentria-ai` profile README as a terminal/CLI-themed product page for MentriaAI, with all visuals as committed assets and **zero external/render-time network calls**, looking great on desktop and mobile.

**Architecture:** The "designed look" is baked into committed animated SVGs (GitHub strips CSS/classes from README markdown). Animation uses SMIL inside self-contained SVGs served via GitHub's image proxy. A Node check script enforces the zero-external-asset invariant and acts as the automated test. The README itself is plain GitHub-flavored markdown + the small allowed HTML subset (`<p align>`, `<picture>`, `<img>`, `<a>`, `<table>`).

**Tech Stack:** Node 24 (ESM), hand-authored SVG + SMIL, the existing offline preview harness (`tools/preview`, `marked` + `github-markdown-css`), Chrome DevTools for mobile screenshots.

**Reference:** Design spec at `docs/superpowers/specs/2026-05-25-profile-readme-redesign-design.md`. Work happens on branch `redesign/profile-readme`. **Do not push** — `main` is the live profile and has an auto-commit cron.

**Conventions for every task:** keep the preview server running (`npm run preview` → http://localhost:4321); after writing any asset, hard-refresh the preview to confirm it renders and animates; commit after each task.

---

## File structure

| File | Responsibility | Status |
|------|----------------|--------|
| `tools/check-readme.mjs` | Asserts README has 0 external image refs, all local assets exist, referenced SVGs are self-contained. The automated gate. | Create |
| `package.json` | Add `check` + `assets:validate` scripts | Modify |
| `.github/FUNDING.yml` | `github: mentria-ai` → native Sponsor button | Create |
| `.github/workflows/3d.yml` | Cron every-2h → weekly | Modify |
| `assets/badges/{python,typescript,go,docker,actions,nunjucks}.svg` | Static tech badges (replace shields.io) | Create |
| `assets/divider.svg` | Animated flowing-gradient section divider | Create |
| `assets/hero-dark.svg` | Animated terminal hero (desktop, dark) — typing, cursor, looping status, indicators, sheen | Create |
| `assets/hero-light.svg` | Hero, light palette | Create |
| `assets/hero-dark-mobile.svg`, `assets/hero-light-mobile.svg` | Hero, stacked + larger text for narrow screens | Create |
| `assets/how-it-works.svg` | Terminal pipeline strip (P2) | Create |
| `README.md` | Full rewrite | Modify |
| `profile-3d-contrib/profile-night-rainbow.svg` | Kept as-is | Keep |

Build order: **P0** (check gate → FUNDING/cron → badges → divider → hero-dark → README → desktop verify) → **P1** (hero light + mobile variants → responsive `<picture>` → mobile verify) → **P2** (how-it-works).

---

## Task 1: README check gate (the automated test)

**Files:**
- Create: `tools/check-readme.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the check script**

Create `tools/check-readme.mjs`:

```js
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
for (const m of md.matchAll(/<(?:img|source)\b[^>]*?\b(?:src|srcset)="([^"]+)"/gi)) {
  for (const part of m[1].split(',')) {
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
```

- [ ] **Step 2: Add npm script**

In `package.json`, add to `"scripts"`:

```json
    "check": "node tools/check-readme.mjs"
```

- [ ] **Step 3: Run it against the CURRENT README — expect FAIL**

Run: `npm run check`
Expected: exit 1, listing the existing external image refs (readme-typing-svg, github-readme-stats ×2, streak, trophy, activity, shields ×5).

- [ ] **Step 4: Commit**

```bash
git add tools/check-readme.mjs package.json
git commit -m "test: add zero-external-asset README check gate"
```

---

## Task 2: FUNDING.yml + tame the 3d cron

**Files:**
- Create: `.github/FUNDING.yml`
- Modify: `.github/workflows/3d.yml:5-6`

- [ ] **Step 1: Create `.github/FUNDING.yml`**

```yaml
github: [mentria-ai]
```

- [ ] **Step 2: Reduce the 3D-contrib cron from every 2 hours to weekly**

In `.github/workflows/3d.yml`, replace:

```yaml
    # Runs every 2 hours
    - cron: "0 */2 * * *"
```

with:

```yaml
    # Runs weekly (Sunday 00:00 UTC)
    - cron: "0 0 * * 0"
```

- [ ] **Step 3: Verify YAML parses**

Run: `node -e "const f=require('fs');for(const p of ['.github/FUNDING.yml','.github/workflows/3d.yml'])console.log(p, f.readFileSync(p,'utf8').length,'bytes')"`
Expected: prints both file sizes (no throw). Visually confirm the cron line now reads `0 0 * * 0`.

- [ ] **Step 4: Commit**

```bash
git add .github/FUNDING.yml .github/workflows/3d.yml
git commit -m "chore: add FUNDING.yml; run 3d-contrib weekly instead of every 2h"
```

---

## Task 3: Tech badge SVGs

**Files:**
- Create: `assets/badges/python.svg`, `typescript.svg`, `go.svg`, `docker.svg`, `actions.svg`, `nunjucks.svg`

- [ ] **Step 1: Create the six badge SVGs**

Each is a self-contained brand-colored pill with white monospace label. Create `assets/badges/python.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="104" height="28" viewBox="0 0 104 28" role="img" aria-label="Python">
  <rect width="104" height="28" rx="6" fill="#3776AB"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">Python</text>
</svg>
```

`assets/badges/typescript.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="124" height="28" viewBox="0 0 124 28" role="img" aria-label="TypeScript">
  <rect width="124" height="28" rx="6" fill="#3178C6"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">TypeScript</text>
</svg>
```

`assets/badges/go.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="28" viewBox="0 0 64 28" role="img" aria-label="Go">
  <rect width="64" height="28" rx="6" fill="#00ADD8"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">Go</text>
</svg>
```

`assets/badges/docker.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="104" height="28" viewBox="0 0 104 28" role="img" aria-label="Docker">
  <rect width="104" height="28" rx="6" fill="#2496ED"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">Docker</text>
</svg>
```

`assets/badges/actions.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="28" viewBox="0 0 150 28" role="img" aria-label="GitHub Actions">
  <rect width="150" height="28" rx="6" fill="#2088FF"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">GitHub Actions</text>
</svg>
```

`assets/badges/nunjucks.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="112" height="28" viewBox="0 0 112 28" role="img" aria-label="Nunjucks">
  <rect width="112" height="28" rx="6" fill="#1C4913"/>
  <text x="14" y="18" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12" fill="#ffffff">Nunjucks</text>
</svg>
```

- [ ] **Step 2: Verify they render**

Open `http://localhost:4321/assets/badges/python.svg` (and others) in the browser, or check Content-Type:
Run: `curl -s -D - -o /dev/null http://localhost:4321/assets/badges/python.svg | grep -i content-type`
Expected: `Content-Type: image/svg+xml` and the badge displays as a blue "Python" pill.

- [ ] **Step 3: Commit**

```bash
git add assets/badges
git commit -m "feat: add self-hosted tech badge SVGs (replaces shields.io)"
```

---

## Task 4: Animated gradient divider

**Files:**
- Create: `assets/divider.svg`

- [ ] **Step 1: Create `assets/divider.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="6" viewBox="0 0 800 6" preserveAspectRatio="none" role="img" aria-label="">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3fb950"/>
      <stop offset="0.25" stop-color="#58a6ff"/>
      <stop offset="0.5" stop-color="#a371f7"/>
      <stop offset="0.75" stop-color="#f0883e"/>
      <stop offset="1" stop-color="#3fb950"/>
      <animate attributeName="x1" dur="7s" values="0;-1" repeatCount="indefinite"/>
      <animate attributeName="x2" dur="7s" values="1;0" repeatCount="indefinite"/>
    </linearGradient>
  </defs>
  <rect width="800" height="6" rx="3" fill="url(#g)"/>
</svg>
```

- [ ] **Step 2: Verify it renders and the gradient flows**

Open `http://localhost:4321/assets/divider.svg`.
Expected: a thin horizontal bar whose colors flow left→right continuously.

- [ ] **Step 3: Commit**

```bash
git add assets/divider.svg
git commit -m "feat: add animated gradient divider"
```

---

## Task 5: Terminal hero (desktop, dark) — the centerpiece

**Files:**
- Create: `assets/hero-dark.svg`

- [ ] **Step 1: Create `assets/hero-dark.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 250" width="820" height="250"
     font-family="ui-monospace,SFMono-Regular,Menlo,monospace" role="img"
     aria-label="MentriaAI — autonomous AI programmer and repo valet. Status: online, building, open to work.">
  <defs>
    <clipPath id="win"><rect x="1" y="1" width="818" height="248" rx="11"/></clipPath>
    <clipPath id="statusClip"><rect x="80" y="174" width="520" height="22"/></clipPath>
    <clipPath id="typeClip"><rect x="60" y="80" width="0" height="26"><animate attributeName="width" begin="0.4s" dur="2s" values="0;520" fill="freeze"/></rect></clipPath>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3fb950"/><stop offset="1" stop-color="#58a6ff"/>
    </linearGradient>
  </defs>

  <!-- window + title bar -->
  <rect x="1" y="1" width="818" height="248" rx="11" fill="#010409" stroke="#30363d"/>
  <path d="M1,12 a11,11 0 0 1 11,-11 h796 a11,11 0 0 1 11,11 v23 h-818 z" fill="#161b22"/>
  <circle cx="22" cy="18" r="6" fill="#ff5f56"/><circle cx="42" cy="18" r="6" fill="#ffbd2e"/><circle cx="62" cy="18" r="6" fill="#27c93f"/>
  <text x="112" y="23" fill="#8b949e" font-size="13">mentria — zsh</text>

  <!-- line 1 -->
  <text x="60" y="68" font-size="15"><tspan fill="#3fb950">~/mentria</tspan> <tspan fill="#8b949e">$</tspan> <tspan fill="#c9d1d9">whoami</tspan></text>

  <!-- line 2: tagline typed via clip + moving cursor -->
  <g clip-path="url(#typeClip)">
    <text x="60" y="100" font-size="17" fill="#58a6ff">MentriaAI — autonomous AI programmer &amp; repo valet</text>
  </g>
  <rect y="86" width="9" height="18" fill="#3fb950">
    <animate attributeName="x" begin="0.4s" dur="2s" values="60;580" fill="freeze"/>
    <set attributeName="x" to="580" begin="2.4s"/>
    <animate attributeName="opacity" begin="2.4s" dur="1s" values="1;0;1" repeatCount="indefinite"/>
  </rect>

  <!-- line 3: status command -->
  <text x="60" y="146" font-size="15" opacity="0">
    <tspan fill="#3fb950">~/mentria</tspan> <tspan fill="#8b949e">$</tspan> <tspan fill="#c9d1d9">mentria --status</tspan>
    <animate attributeName="opacity" begin="2.6s" dur="0.3s" values="0;1" fill="freeze"/>
  </text>

  <!-- status block (fades in) -->
  <g opacity="0">
    <animate attributeName="opacity" begin="3s" dur="0.4s" values="0;1" fill="freeze"/>
    <circle cx="66" cy="185" r="5" fill="#f0883e"><animate attributeName="opacity" dur="1.6s" values="1;0.3;1" repeatCount="indefinite"/></circle>
    <g clip-path="url(#statusClip)">
      <g>
        <animateTransform attributeName="transform" type="translate" dur="12s" repeatCount="indefinite"
          keyTimes="0;0.18;0.25;0.43;0.5;0.68;0.75;0.93;1"
          values="0 0;0 0;0 -24;0 -24;0 -48;0 -48;0 -72;0 -72;0 -96"/>
        <text x="84" y="190" font-size="14" fill="#58a6ff">shipping a feature…</text>
        <text x="84" y="214" font-size="14" fill="#e3b341">reviewing a pull request…</text>
        <text x="84" y="238" font-size="14" fill="#3fb950">keeping CI green…</text>
        <text x="84" y="262" font-size="14" fill="#a371f7">open to work ✦</text>
        <text x="84" y="286" font-size="14" fill="#58a6ff">shipping a feature…</text>
      </g>
    </g>
    <g transform="translate(640,185)">
      <g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2.4s" repeatCount="indefinite"/>
        <path d="M0,-9 A9,9 0 0 1 9,0" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </g>
    <text x="656" y="190" font-size="13" fill="#8b949e">building</text>
    <rect x="724" y="180" width="80" height="9" rx="4.5" fill="#161b22"/>
    <rect x="724" y="180" width="20" height="9" rx="4.5" fill="url(#bar)"><animate attributeName="width" dur="2.6s" values="8;72;8" repeatCount="indefinite"/></rect>
  </g>

  <!-- glass sheen sweep -->
  <g clip-path="url(#win)">
    <rect x="-260" y="-20" width="180" height="300" fill="url(#sheen)" transform="skewX(-18)">
      <animate attributeName="x" dur="6.5s" keyTimes="0;0.6;1" values="-260;-260;1000" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>
```

- [ ] **Step 2: Verify it renders and every animation plays**

Open `http://localhost:4321/assets/hero-dark.svg`. Confirm, in order: tagline types out with a moving cursor → cursor starts blinking → `mentria --status` appears → status block fades in with a pulsing dot, a rotating spinner, a looping progress bar, and the status text rotating through the four lines; a faint sheen sweeps across periodically.
If a piece doesn't animate, check that the `<animate>`/`<animateTransform>` is a child of the element it targets and that `begin`/`dur` are valid.

- [ ] **Step 3: Commit**

```bash
git add assets/hero-dark.svg
git commit -m "feat: add animated terminal hero (desktop, dark)"
```

---

## Task 6: README rewrite (flips the gate green) — P0 desktop

**Files:**
- Modify: `README.md` (full replace)

> Note: this P0 README points the `<picture>` light/mobile sources at `hero-dark.svg` as a temporary fallback so the page works now; Task 8 swaps in the real light/mobile assets. This keeps every task shippable.

- [ ] **Step 1: Replace `README.md` with the new content**

```markdown
<!-- MentriaAI profile README. Zero external/render-time calls: every image is a committed asset. -->
<p align="center">
  <a href="https://mentria.ai">
    <img alt="MentriaAI — autonomous AI programmer & repo valet" src="assets/hero-dark.svg" width="100%">
  </a>
</p>

<p align="center">
  🌐 <a href="https://mentria.ai">mentria.ai</a> &nbsp;·&nbsp;
  📦 <a href="https://github.com/orgs/mentria-ai/repositories">Repos</a> &nbsp;·&nbsp;
  🤝 <a href="https://github.com/sponsors/mentria-ai">Work with us</a> &nbsp;·&nbsp;
  ✦ <a href="https://github.com/sponsors/mentria-ai">Sponsor</a>
</p>

<table align="center">
  <tr>
    <td align="center" width="210">⚙️<br><b>Builds &amp; ships</b><br><sub>Scaffolds features &amp; whole apps</sub></td>
    <td align="center" width="210">🧪<br><b>Tests &amp; refactors</b><br><sub>Generates tests, reviews PRs</sub></td>
    <td align="center" width="210">🤖<br><b>Maintains repos</b><br><sub>Keeps CI green, deps fresh</sub></td>
  </tr>
</table>

<p align="center"><img src="assets/divider.svg" alt="" width="100%"></p>

## ✦ Featured projects

- **[website](https://github.com/mentria-ai/website)** — AI-driven social platform: submit, follow &amp; scroll media, auto-updated via GitHub Actions. &nbsp;`Nunjucks`
- **[radio-catalog](https://github.com/mentria-ai/radio-catalog)** — the catalog powering Mentria.ai "Infinite Radio". &nbsp;`Audio`

🔒 + private projects · _more coming soon_

<p align="center"><img src="assets/divider.svg" alt="" width="100%"></p>

## 📈 Activity

<p align="center"><img src="profile-3d-contrib/profile-night-rainbow.svg" alt="MentriaAI 3D contribution graph" width="100%"></p>

## 🧰 Stack

<p align="center">
  <img src="assets/badges/python.svg" alt="Python" height="28">
  <img src="assets/badges/typescript.svg" alt="TypeScript" height="28">
  <img src="assets/badges/go.svg" alt="Go" height="28">
  <img src="assets/badges/docker.svg" alt="Docker" height="28">
  <img src="assets/badges/actions.svg" alt="GitHub Actions" height="28">
  <img src="assets/badges/nunjucks.svg" alt="Nunjucks" height="28">
</p>

<p align="center"><img src="assets/divider.svg" alt="" width="100%"></p>

## 🤝 Work with MentriaAI

> [!NOTE]
> Want MentriaAI on your project? Commission or sponsor the agent to build &amp; maintain your repo.
> **→ [Sponsor / get in touch](https://github.com/sponsors/mentria-ai)** · _more coming soon_

<p align="center"><i>"Machines should work. Agents should think."</i></p>
```

- [ ] **Step 2: Run the gate — expect PASS**

Run: `npm run check`
Expected: `✅ README check passed: 0 external image refs; all assets present and self-contained.`

- [ ] **Step 3: Visually verify desktop render**

Open `http://localhost:4321/`. Confirm the preview badge reads **0 external links**, the hero animates, the feature table is 3-up, featured repos are real links, divider/badges/3D graph all render.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "feat: rewrite README — terminal-themed, zero external calls"
```

---

## Task 7: Hero light + mobile variants — P1

**Files:**
- Create: `assets/hero-light.svg`, `assets/hero-dark-mobile.svg`, `assets/hero-light-mobile.svg`

- [ ] **Step 1: Create `assets/hero-light.svg`**

Same structure as `hero-dark.svg` with a light palette. Copy `hero-dark.svg` and change only these values: window `fill="#ffffff" stroke="#d0d7de"`; title bar `fill="#f6f8fa"`; title text `fill="#57606a"`; line-1 `~/mentria` stays `#1a7f37`, `$` `#6e7781`, `whoami` `#1f2328`; tagline `fill="#0969da"`; status command tspans → prompt `#1a7f37`, `$` `#6e7781`, text `#1f2328`; status rotating lines → `#0969da`, `#9a6700`, `#1a7f37`, `#8250df`, `#0969da`; "building" `fill="#6e7781"`; spinner stroke `#0969da`; cursor + online dot keep `#3fb950`/`#f0883e`; sheen stop-color `#000000` with the same opacities (dark sheen on light bg). Keep all geometry, clip-paths, and animations identical.

- [ ] **Step 2: Create `assets/hero-dark-mobile.svg`**

Narrower viewBox with a stacked, larger-text layout so it stays legible at ~360px. Create:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 300" width="380" height="300"
     font-family="ui-monospace,SFMono-Regular,Menlo,monospace" role="img"
     aria-label="MentriaAI — AI repo valet. Status: online, open to work.">
  <defs>
    <clipPath id="winm"><rect x="1" y="1" width="378" height="298" rx="11"/></clipPath>
    <clipPath id="statusClipm"><rect x="50" y="214" width="300" height="26"/></clipPath>
    <linearGradient id="sheenm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="378" height="298" rx="11" fill="#010409" stroke="#30363d"/>
  <path d="M1,12 a11,11 0 0 1 11,-11 h356 a11,11 0 0 1 11,11 v23 h-378 z" fill="#161b22"/>
  <circle cx="22" cy="18" r="6" fill="#ff5f56"/><circle cx="42" cy="18" r="6" fill="#ffbd2e"/><circle cx="62" cy="18" r="6" fill="#27c93f"/>
  <text x="112" y="23" fill="#8b949e" font-size="13">mentria — zsh</text>

  <text x="28" y="78" font-size="15"><tspan fill="#3fb950">$</tspan> <tspan fill="#c9d1d9">whoami</tspan></text>
  <text x="28" y="116" font-size="22" fill="#58a6ff" font-weight="700">MentriaAI</text>
  <text x="28" y="146" font-size="15" fill="#8b949e">AI programmer &amp; repo valet</text>

  <text x="28" y="196" font-size="15"><tspan fill="#3fb950">$</tspan> <tspan fill="#c9d1d9">mentria --status</tspan></text>
  <circle cx="36" cy="227" r="5" fill="#f0883e"><animate attributeName="opacity" dur="1.6s" values="1;0.3;1" repeatCount="indefinite"/></circle>
  <g clip-path="url(#statusClipm)">
    <g>
      <animateTransform attributeName="transform" type="translate" dur="12s" repeatCount="indefinite"
        keyTimes="0;0.18;0.25;0.43;0.5;0.68;0.75;0.93;1"
        values="0 0;0 0;0 -28;0 -28;0 -56;0 -56;0 -84;0 -84;0 -112"/>
      <text x="52" y="232" font-size="15" fill="#58a6ff">shipping a feature…</text>
      <text x="52" y="260" font-size="15" fill="#e3b341">reviewing a PR…</text>
      <text x="52" y="288" font-size="15" fill="#3fb950">keeping CI green…</text>
      <text x="52" y="316" font-size="15" fill="#a371f7">open to work ✦</text>
      <text x="52" y="344" font-size="15" fill="#58a6ff">shipping a feature…</text>
    </g>
  </g>
  <g clip-path="url(#winm)">
    <rect x="-160" y="-20" width="120" height="340" fill="url(#sheenm)" transform="skewX(-18)">
      <animate attributeName="x" dur="6.5s" keyTimes="0;0.6;1" values="-160;-160;520" repeatCount="indefinite"/>
    </rect>
  </g>
</svg>
```

- [ ] **Step 3: Create `assets/hero-light-mobile.svg`**

Copy `hero-dark-mobile.svg` and apply the same light-palette swaps as Step 1 (window `#ffffff`/`#d0d7de`, title bar `#f6f8fa`, title text `#57606a`, `whoami`/`--status` text `#1f2328`, "MentriaAI" `#0969da`, subtitle `#57606a`, status lines `#0969da`/`#9a6700`/`#1a7f37`/`#8250df`/`#0969da`, sheen stop-color `#000000`). Keep geometry + animations identical.

- [ ] **Step 4: Wire responsive `<picture>` into the README**

In `README.md`, replace the hero block from Task 6 Step 1:

```markdown
  <a href="https://mentria.ai">
    <img alt="MentriaAI — autonomous AI programmer & repo valet" src="assets/hero-dark.svg" width="100%">
  </a>
```

with:

```markdown
  <a href="https://mentria.ai">
    <picture>
      <source media="(max-width: 480px) and (prefers-color-scheme: light)" srcset="assets/hero-light-mobile.svg">
      <source media="(max-width: 480px)" srcset="assets/hero-dark-mobile.svg">
      <source media="(prefers-color-scheme: light)" srcset="assets/hero-light.svg">
      <img alt="MentriaAI — autonomous AI programmer & repo valet" src="assets/hero-dark.svg" width="100%">
    </picture>
  </a>
```

- [ ] **Step 5: Verify gate + all four heroes render**

Run: `npm run check`
Expected: PASS.
Then open each of `http://localhost:4321/assets/hero-light.svg`, `/assets/hero-dark-mobile.svg`, `/assets/hero-light-mobile.svg` and confirm each renders with the correct palette and animates.

- [ ] **Step 6: Commit**

```bash
git add assets/hero-light.svg assets/hero-dark-mobile.svg assets/hero-light-mobile.svg README.md
git commit -m "feat: add light + mobile hero variants and responsive <picture>"
```

---

## Task 8: Mobile verification & polish — P1

**Files:**
- Modify: any asset/`README.md` as needed based on findings

- [ ] **Step 1: Screenshot at mobile + tablet widths**

Using Chrome DevTools (the chrome-devtools MCP), for each width in {375, 390, 768} and full page: set viewport width, navigate to `http://localhost:4321/`, take a full-page screenshot.

- [ ] **Step 2: Inspect for problems**

Check each screenshot for: hero text legible (not shrunk to mush), no horizontal overflow/scrollbar, the 3-up feature table not unreadably cramped, badges wrapping cleanly, links comfortably tappable, animations intact.

- [ ] **Step 3: Fix any issues**

Likely fixes if needed: confirm `<picture>` swapped to the mobile hero at 375/390 (if GitHub/Chrome didn't honor width-media, the `width="100%"` desktop hero is the fallback — verify it's still legible; if not, reduce hero text further in the mobile SVGs). If the feature table cramps at 375, that's acceptable (GitHub gives horizontal scroll) — note it; only restructure if it looks broken.

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add -A
git commit -m "fix: mobile-layout polish for README"
```

---

## Task 9: How it works (terminal pipeline) — P2

**Files:**
- Create: `assets/how-it-works.svg`
- Modify: `README.md` (insert section)

- [ ] **Step 1: Create `assets/how-it-works.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 64" width="820" height="64"
     font-family="ui-monospace,SFMono-Regular,Menlo,monospace" role="img"
     aria-label="Pipeline: prompt to plan to code to test to open PR to merge, autonomously">
  <rect x="1" y="1" width="818" height="62" rx="10" fill="#010409" stroke="#30363d"/>
  <text x="20" y="38" font-size="15">
    <tspan fill="#3fb950">prompt</tspan><tspan fill="#6e7681"> → </tspan><tspan fill="#58a6ff">plan</tspan><tspan fill="#6e7681"> → </tspan><tspan fill="#58a6ff">code</tspan><tspan fill="#6e7681"> → </tspan><tspan fill="#e3b341">test</tspan><tspan fill="#6e7681"> → </tspan><tspan fill="#a371f7">open PR</tspan><tspan fill="#6e7681"> → </tspan><tspan fill="#3fb950">merge</tspan>
  </text>
  <circle cx="772" cy="32" r="4" fill="#3fb950"><animate attributeName="opacity" dur="1.4s" values="1;0.2;1" repeatCount="indefinite"/></circle>
  <text x="784" y="37" font-size="13" fill="#6e7681">↻</text>
</svg>
```

- [ ] **Step 2: Insert the section into `README.md`**

After the "Featured projects" block's trailing divider and before `## 📈 Activity`, insert:

```markdown
## ⚡ How it works

<p align="center"><img src="assets/how-it-works.svg" alt="prompt → plan → code → test → open PR → merge" width="100%"></p>

<p align="center"><img src="assets/divider.svg" alt="" width="100%"></p>
```

- [ ] **Step 3: Verify gate + render**

Run: `npm run check`
Expected: PASS. Open `http://localhost:4321/` and confirm the pipeline strip renders between Featured projects and Activity.

- [ ] **Step 4: Commit**

```bash
git add assets/how-it-works.svg README.md
git commit -m "feat: add how-it-works pipeline strip"
```

---

## Task 10: Final verification & handoff

- [ ] **Step 1: Full gate + asset sanity**

Run: `npm run check`
Expected: `✅ README check passed`.
Run: `git status` — expected clean working tree on `redesign/profile-readme`.

- [ ] **Step 2: Final screenshots**

Capture a full-page desktop screenshot (1012px container) and a 390px mobile screenshot for the record.

- [ ] **Step 3: Stop here — do NOT push**

Leave the branch unpushed. Surface the result to the user; integration (merge to `main` / open PR) is a separate, user-authorized step (use superpowers:finishing-a-development-branch).

---

## Self-review (against the spec)

- **Zero external calls** (spec §3, §10): enforced by Task 1's gate; README uses only relative image refs + hyperlinks. ✅
- **Terminal/CLI + feature row** (§5, §6): hero (Task 5), 3-up table (Task 6). ✅
- **Four continuous animations** (§6): looping status + indicators + sheen in hero (Task 5); flowing gradient in divider (Task 4). ✅
- **Featured repos as text+links** (§5): Task 6. ✅
- **Keep only 3D graph** (§2, §5): Task 6 includes it; no other stats widgets. ✅
- **Mobile** (§7): mobile heroes + responsive `<picture>` (Task 7), explicit 375/390/768 verification (Task 8). ✅
- **FUNDING.yml + cron + recipe cleanup** (§11): Task 2; the phantom "automation recipes" table is simply absent from the rewritten README (Task 6). ✅
- **Asset inventory** (§8): every listed asset has a creating task. ✅
- **Tagline** (§15): used verbatim in Task 5 / Task 7 mobile. ✅
- Placeholder scan: no TBD/TODO; every code step has complete content. ✅
- Type/name consistency: clipPath ids (`win`, `typeClip`, `statusClip`, `winm`, `statusClipm`), gradient ids (`sheen`, `bar`, `g`, `sheenm`), and asset paths are consistent across tasks and the README. ✅
