# Domain Migration & SEO Implementation Plan

The goal is to ensure a smooth transition from your current Cloudflare Workers URL to your new custom domain while maintaining SEO integrity.

## 1. Add Canonical Metadata
The most important missing piece in your current SEO setup is the **Canonical Tag**. This tells search engines (like Google) that your new domain is the "true" version of the site, even if it's accessible via multiple URLs (like the `.workers.dev` one).

- **Action**: Add `<link rel="canonical" href="https://canvas-portfolio.kostis-kounadis.workers.dev/">` to `index.html`.
- **Reason**: When you run the `update-url.command`, it will automatically update this tag to your new domain.

## 2. SEO Metadata to Maintain
The `admin/update-url.command` is designed to handle all critical hardcoded URLs. You should ensure it updates:
- `og:url` (Open Graph for social sharing)
- `twitter:url` (Twitter Cards)
- `url` inside the JSON-LD schema (Schema.org)
- `<loc>` inside `sitemap.xml`
- `Sitemap:` path inside `robots.txt`

## 3. Cloudflare Configuration
When you buy your domain and assign it to Cloudflare:
- **301 Permanent Redirect**: Ensure you set up a redirect from `canvas-portfolio.kostis-kounadis.workers.dev/*` to `https://yournewdomain.com/$1`. A 301 status code is vital for SEO as it transfers "link juice" (authority) to the new domain.
- **SSL/TLS**: Ensure "Full" or "Full (Strict)" mode is on so your site remains HTTPS.

## 4. Proposed Code Changes

### index.html
Add the canonical tag in the `<head>` section.

### update-url.command
The current script is already thorough, using `grep -rl` to find and replace the domain string everywhere except in `admin`, `.git`, and `node_modules`.

---
**Next Steps**:
1. I will apply the canonical tag to `index.html`.
2. You can then run the script whenever you are ready with your new domain.
