# ⚙️ Admin & Setup Guide

This guide explains how to manage and customize your portfolio. All administrative tools and dependencies are kept in this folder to keep your root directory clean for deployment.

---

## 🛠️ The Internal Files
- `ADMIN-GUIDE.md`: This document.
- `update-url.command`: Double-click to update your domain globally (for SEO/Social sharing).
- `build-website.command`: Double-click to scan images and update your site data.
- `generate-data.js`: The engine that powers the build process.
- `package.json`: Dependency list for the build system.

---

## 🆔 Customizing Your Identity (`setup.md`)

To change your site's content and appearance, edit the `setup.md` file in the **root folder**.

### Configuration Keys (Top Section)
- **`name`**: Your display name.
- **`email`**: Your contact address.
- **`text_colour`** & **`background_colour`**: Site theme.
- **`blend_mode`**: `true` for Brutalist/Difference mode, `false` for standard.
- **`ui_text_size`**: Base font size (e.g., `18px`).
- **`logo_file`**: Filename of your logo in the assets folder.
- **`mobile_mode`**: Choose between `canvas` (draggable) or `slideshow`.

### Visibility Toggles
You can show/hide UI elements by setting these to `true` or `false`:
`show_title`, `show_categories`, `show_layout`, `show_info`, `show_email`, `show_zoom`.

### The [INFO] Content (Bottom Section)
Everything below the `---` line in `setup.md` is your "About" text. You can use standard Markdown for links.

---

## 🌐 Updating Your Domain (URL)

Whenever you move your site to a new domain (e.g., from Netlify to a custom domain like `kostis.art`), you should update the URL metadata for SEO and social media sharing.

1.  Open the `admin/` folder.
2.  **Double-click** `update-url.command`.
3.  Type in your new domain when prompted and press **Enter**.

### Why this matters:
It ensures that sitemaps and social media preview cards (Open Graph) point to the correct "official" address of your site.

---

## 🖼️ Adding New Media

1.  Create a subfolder in `assets/images/` for your category (e.g., `design`).
2.  Drop your images or videos into that folder.
3.  Open the `admin/` folder and **double-click** `build-website.command`.
4.  Your site will automatically update with the new content.
