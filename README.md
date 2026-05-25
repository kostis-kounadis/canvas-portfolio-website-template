# Canvas Portfolio Website Template

A fully customisable, brutalist canvas portfolio template. An interactive, non-scrolling stage where your work is scattered, stacked, or arranged in rows — draggable, zoomable, and yours to shape.

---

## ▩ Template Philosophy

This is not a conventional portfolio. There is no scroll. There is no grid-of-thumbnails. There is a **canvas** — an infinitely draggable, zoomable surface where your media lives. Work is scattered deliberately, with controlled overlap. Clicking a layout button rearranges everything. Clicking a category name filters it.

The aesthetic is **brutalist-minimal**: monospace typography, mix-blend-mode contrast, raw bracket notation for UI controls. The design language should feel like a tool, not a showcase.

The template is intentionally opinionated about feel, but completely open about content, colour, typography, and layout behaviour — all configurable via the included **GUI setup tool**.

---

## ▤ Features

| Feature | Details |
|---|---|
| **3 Layout Modes** | Random scatter, Rows, Stacks — switch live |
| **Category Filtering** | Per-folder filtering with hide or focus behaviour |
| **8-Zone UI Positioning** | Place each UI module in any of 8 screen zones |
| **Theme System** | Colours, backgrounds (solid / gradient / animated / blob), noise/grain, image shadows |
| **Typography** | Any Google Font via embed code, configurable size |
| **Image Effects** | Desaturated, duotone, hover-reveal, gallery/spotlight click modes |
| **Lightbox + Canvas Expand** | Optional per-click image modes |
| **INFO Overlay** | Full-viewport about panel with configurable backdrop |
| **SEO** | Static tags written by build script — no JS required for crawlers |
| **GUI Setup Tool** | Local Node.js server, dark-themed UI, live preview iframe |
| **Static Output** | Pure HTML/CSS/JS — deploy free on Cloudflare Pages or Netlify |

---

## ▧ Quick-Start Outline

1. **Install Node.js** — see [README-SETUP.md](README-SETUP.md) for platform instructions
2. **Add your media** — drop images/videos into `assets/images/<category>/`
3. **Launch the GUI** — double-click `start-setup.command` (macOS) or run `node admin/setup-server.js`
4. **Configure** — set your name, colours, fonts, module positions, etc. via the GUI
5. **Build** — click "Rebuild Site" in the GUI to regenerate `data.js` and SEO tags
6. **Deploy** — push the repo to Cloudflare Pages or Netlify (free tier)

---

## ▨ Made With This Template

| Site | Author | Notes |
|---|---|---|
| [kostiskounadis.xyz](https://kostiskounadis.xyz/) | Kostis Kounadis | Original — the reference implementation |

*Using this template for your portfolio? Open a PR to add it here.*

---

## ▦ Deployment

Both platforms are free for static sites and support automatic deploys from GitHub.

**Cloudflare Pages**
1. Push repo to GitHub
2. Go to Cloudflare Pages → New project → Connect GitHub
3. Build command: *(leave empty — no build step needed)*
4. Output directory: `/` (root)

**Netlify**
1. Push repo to GitHub
2. Go to Netlify → New site from Git
3. Build command: *(leave empty)*
4. Publish directory: `.`

---

## ▥ License & Attribution

This template is provided for personal and commercial use. Attribution appreciated but not required.
If you distribute a modified version, please retain this README section.
