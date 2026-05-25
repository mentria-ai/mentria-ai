# MentriaAI Profile README — Redesign Design

**Status:** Proposed — awaiting approval
**Date:** 2026-05-25
**Repo:** `mentria-ai/mentria-ai` (the special profile README that renders on the org's GitHub landing page)

---

## 1. Context & problem

The current README is a "live" profile page whose visuals are rendered on-demand by **six third-party services** (`readme-typing-svg.demolab.com`, `github-readme-stats.vercel.app`, `github-readme-streak-stats.herokuapp.com`, `github-profile-trophy.vercel.app`, `github-readme-activity-graph.vercel.app`, `img.shields.io`). Baseline observations:

- On a normal load, the two `github-readme-stats` cards render **broken** (public-instance rate-limiting), and the typing banner is mis-rendered (a `%C2%A2`/`&center` URL corruption).
- The framing is a **personal-stats dashboard** (streaks, trophies, contribution counts) — wrong for what this actually is.
- The README advertises workflows (`metrics.yml`, `update-readme.yaml`) that **don't exist**, and has empty placeholder sections (Wakatime, blog feed).
- The only self-hosted asset — the committed 3D contribution SVG — is also the best-looking element on the page.

## 2. What this page is (locked decisions)

- **A product/brand page for MentriaAI**, an autonomous AI programmer / "repo valet" that builds and maintains software (e.g. the `website` social platform, `radio-catalog` for "Infinite Radio").
- **Primary goal:** showcase featured repos to drive **stars**; tee up the future **"work with MentriaAI"** direction (commission / sponsor / donate).
- **Audience:** GitHub visitors (mostly developers), plus potential sponsors.

## 3. Goals & non-goals

**Goals**
1. Zero external / render-time network calls — every visual is a file committed to the repo.
2. Terminal / CLI-native aesthetic (Direction A) with a clean 3-up feature row (from Direction B).
3. Tasteful **continuous animation**, all baked into committed SVGs.
4. Excellent experience on **mobile** as well as desktop (explicit requirement).
5. Showcase featured repos with real links; clear path to stars and to sponsorship.

**Non-goals (explicitly dropped)**
- Live GitHub stats widgets: streak, trophies, top-languages, activity graph.
- Wakatime "weekly coding time" and the blog-post feed (no generators exist).
- Live star counts on repo cards (all repos are at 0★ today, and live counts require an external service).

## 4. Hard platform constraints (the rules everything obeys)

GitHub renders README markdown through a sanitizer + the `camo` image proxy, with **no JavaScript**:

- The sanitizer **strips** `<style>` blocks, `class`, `id`, inline `style`, `<script>`, and all event handlers from the README markdown. **You cannot style the README** — the designed look must live inside committed image assets.
- Layout uses only allowed HTML: `<p align="center">`, `<img>` (`src`,`alt`,`width`,`height`,`align`), `<a href>`, `<picture>`/`<source>` (`srcset`,`media`), `<table>`, `<details>`/`<summary>`, `<sub>`, `<kbd>`, headings, lists, blockquotes.
- **Committed SVGs animate**: SMIL (`<animate>`, `<animateTransform>`) and CSS `@keyframes` inside the SVG's own `<style>` both play when served via camo in an `<img>`. **JS inside an SVG does not run.** SVGs must be **self-contained** (no remote fonts or `<image href>`).
- Centering is only via `<p align="center">`. Multi-column layout is only via `<table>`.
- Native, zero-asset dynamic features available: **Mermaid** code blocks and **GitHub alerts** (`> [!NOTE]`).

**Compliance check:** no `img.shields.io`, `*.vercel.app`, `*.demolab.com`, `*.herokuapp.com`, `lottie.host`, or any third-party host anywhere in the final README. The preview harness's external-link badge must read **0**.

## 5. Information architecture (top → bottom)

1. **Hero** — animated terminal-window SVG. Lines: `~/mentria $ whoami` → typed tagline + blinking cursor → `mentria --status` → a **looping status line** with a **pulsing online dot, rotating build spinner, and looping deploy bar**, plus a subtle periodic **glass sheen** sweep across the window. Adaptive light/dark + responsive (see §7).
2. **Nav links** — one centered markdown line of real links: `🌐 mentria.ai · 📦 Repos · 🤝 Work with us · ✦ Sponsor`.
3. **Features (3-up)** — a 3-cell markdown table: ⚙️ **Builds & ships** · 🧪 **Tests & refactors** · 🤖 **Maintains repos** (kept as real text for accessibility + reflow on mobile).
4. **Animated gradient divider** (committed SVG, reused between sections).
5. **Featured repos** — `website` and `radio-catalog` as **real text + links** (selectable, accessible, reflow on mobile): the repo name is an `<a>` link to the repo, followed by a one-line description and language. Below: a `🔒 + private projects · more coming soon` text line.
6. **How it works** — a compact terminal-styled pipeline `prompt → plan → code → test → open PR → merge` (committed SVG). *Alternative considered:* a native Mermaid diagram (lower maintenance, but cannot be terminal-themed). Decision: committed SVG for aesthetic consistency; P2 priority.
7. **Activity** — the existing committed 3D contribution graph (`profile-3d-contrib/profile-night-rainbow.svg`), kept as-is.
8. **Tech stack** — a centered row of **small committed badge SVGs** (Python, TypeScript, Go, Docker, GitHub Actions, Nunjucks). Small individual images wrap naturally on mobile.
9. **Work with MentriaAI** — a `$ mentria hire` callout linking to the **sponsors page** (`github.com/sponsors/mentria-ai`, confirmed live) and mentria.ai; framed "coming soon — commission / sponsor / donate".
10. **Footer** — the quote *"Machines should work. Agents should think."*

## 6. Visual system

- **Base:** GitHub dark surfaces `#0d1117` / `#010409`, border `#30363d`. **Accents:** green `#3fb950`, blue `#58a6ff`, purple `#a371f7`, orange `#f0883e`, yellow `#e3b341`. Monospace type (system stack: `ui-monospace, SFMono-Regular, Menlo, monospace`).
- **Continuous animations (all four selected), each baked into a committed SVG:**
  1. **Looping status line** — rotate through "shipping a feature… / reviewing a PR… / keeping CI green… / open to work ✦" (SMIL translate/opacity through stacked `<text>`). *(in hero SVG)*
  2. **Live indicators** — pulsing online dot (opacity), rotating spinner (`animateTransform`), looping deploy bar (width). *(in hero SVG)*
  3. **Flowing gradient** — slow color flow on the section divider and the wordmark (animated gradient stops). *(in divider SVG / hero)*
  4. **Hero glass sheen** — a subtle periodic light/scanline sweep across the hero terminal window. The sheen lives on the hero SVG rather than the repo cards, so the cards stay accessible text + links. *(in hero SVG)*
- Plus the hero's initial **type-on** + **blinking cursor**.
- **Restraint:** animations are slow and ambient; nothing flashes or competes for attention.

## 7. Responsive / mobile (explicit requirement)

GitHub renders READMEs in a narrow column on mobile web/app. Approach:

- **All images use `width="100%"`** (capped by a centered container where needed) so they scale to the mobile column instead of overflowing.
- **Hero is responsive via `<picture>`**: width-based `media` sources serve a **mobile hero SVG** (stacked, larger text, shorter lines) below ~480px and a wide hero on desktop; each also has dark/light variants. Hero text is kept short so it stays legible when scaled. *Fallback if `<picture>` width media proves unreliable on GitHub:* a single hero SVG authored at a moderate aspect ratio that reads well at both widths.
- **Featured repos** are plain text + links, so they reflow naturally and stay fully legible/tappable on mobile (no image-scaling concerns).
- **Feature row** stays a real text table (reflows / GitHub gives horizontal scroll if cramped); short emoji + labels keep it readable. If mobile testing shows it cramps badly, fall back to a `<picture>` stacked-vs-row SVG.
- **Tech badges** are small individual images in a centered `<p>` so they wrap to multiple rows on mobile.
- **Tappable links:** prefer line-height/padding that yields comfortable tap targets; keep nav links on their own line.

## 8. Asset inventory (to build & commit)

| Path | What | Animated | Priority |
|------|------|:--:|:--:|
| `assets/hero-dark.svg`, `assets/hero-light.svg` | Terminal hero (desktop) | ✅ (1,2,3,4 + type/cursor) | P0 |
| `assets/hero-dark-mobile.svg`, `assets/hero-light-mobile.svg` | Terminal hero (mobile, stacked) | ✅ | P1 |
| `assets/divider.svg` | Flowing-gradient section divider (reused) | ✅ (3) | P1 |
| `assets/badges/{python,typescript,go,docker,actions,nunjucks}.svg` | Tech badges | ❌ | P1 |
| `assets/how-it-works.svg` | Terminal pipeline strip | optional | P2 |
| `profile-3d-contrib/profile-night-rainbow.svg` | Existing 3D graph | ✅ (existing) | keep |
| `.github/FUNDING.yml` | `github: mentria-ai` → native Sponsor button | — | P0 |
| `README.md` | Rewritten | — | P0 |

Self-contained rule for every SVG: no remote fonts/images; embed or use system monospace.

## 9. Link targets (resolved)

- Repo names (text links) → `https://github.com/mentria-ai/website`, `https://github.com/mentria-ai/radio-catalog`.
- `🌐 mentria.ai` → `https://mentria.ai` (live, 200).
- `📦 Repos` → `https://github.com/orgs/mentria-ai/repositories`.
- `✦ Sponsor` and `$ mentria hire` → `https://github.com/sponsors/mentria-ai` (live, 200).
- `🤝 Work with us` → sponsors page (until a dedicated contact/landing exists).
- Note: GitHub has **no URL that one-click-stars** a repo; "star it" is a deep link to the repo where the visitor clicks Star. The separate "★ Star" pill is **dropped**; the repo card itself is the link.

## 10. External-call removal (old → new)

| Old external source | New |
|---|---|
| `readme-typing-svg.demolab.com` (banner) | `assets/hero-*.svg` (committed, animated) |
| `github-readme-stats` (stats + top-langs) | removed |
| `github-readme-streak-stats` (streak) | removed |
| `github-profile-trophy` (trophies) | removed |
| `github-readme-activity-graph` (activity) | removed |
| `img.shields.io` (tech badges) | `assets/badges/*.svg` (committed) |
| `profile-3d-contrib/*.svg` (local) | kept |

Outcome: **0 external references** in the README.

## 11. Workflow / repo cleanup (in-scope, since we're editing this area)

- **Remove or correct** the "Automation recipes" table (it references non-existent `metrics.yml` / `update-readme.yaml`).
- **Reduce `3d.yml` cron** from every 2 hours (`0 */2 * * *`) to **weekly** (`0 0 * * 0`) — matches the README's own description and stops the stream of "generated" commits.
- **Add `.github/FUNDING.yml`** (`github: mentria-ai`).
- **Keep the preview harness** (`package.json`, `tools/preview/`, `.gitignore`) committed; `node_modules/` and `.superpowers/` stay gitignored so the `3d.yml` `git add -A .` step never sweeps them in.

## 12. Build & verification plan

- **Local preview:** `npm run preview` (http://localhost:4321) renders the README with committed assets exactly as GitHub will; the external-link badge must reach **0**.
- **Animation:** confirm SMIL / CSS-in-SVG plays in the harness (Chrome, representative of GitHub's img+camo rendering).
- **Mobile:** emulate widths **375px (iPhone SE), 390px (iPhone 14), 768px (tablet)** via Chrome DevTools; screenshot each; verify no overflow, legible text, comfortable tap targets, animations intact.
- **Accessibility:** every SVG has descriptive `alt`; sufficient contrast; meaning never conveyed by color alone.
- **Post-push:** spot-check on github.com desktop + mobile web (camo may delay first asset render).

## 13. Risks / things to validate during build

- `<picture>` **width-based** `media` switching on GitHub — verify it actually swaps the mobile hero; if not, use the single-responsive-SVG fallback (§7).
- **Animated SVG file size** — keep the hero lean (it now also carries the sheen sweep).

## 14. Decision log

- Brand/product page (not personal stats, not pure showpiece).
- Primary CTA: feature repos → stars; future "work with MentriaAI" (sponsor/donate).
- Keep only the 3D contribution graph; drop all other stats widgets.
- Direction **A** (terminal/CLI) + Direction **B**'s 3-up feature row.
- Continuous animations: **1 + 2 + 3 + 4** (looping status, live indicators, flowing gradient, hero glass sheen — sheen moved off the repo cards to keep them accessible text + links).
- Drop the "★ Star" pill; the repo name (text) is the link.
- Zero external calls; mobile is a first-class requirement.

## 15. Confirmed content

- **Hero tagline (confirmed):** `whoami` → **"MentriaAI — autonomous AI programmer & repo valet"** (desktop) / **"MentriaAI — AI repo valet"** (mobile).
