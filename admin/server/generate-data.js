const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const vm = require('vm');

const rootDir = path.join(__dirname, '../../template');
const imagesDir = path.join(rootDir, 'assets', 'images');
const dataFile = path.join(rootDir, 'data.js');

const imageExts = new Set(['.avif', '.webp', '.jpg', '.jpeg', '.png']);
const videoExts = new Set(['.mp4']);

// Display width used for CSS layout. This is intentionally NOT the real pixel
// width — CSS object-fit handles the actual rendering. Keeping this small and
// uniform prevents the scatter engine from placing items at absurd sizes.
const DISPLAY_WIDTH = 520;

async function main() {
  console.log('Generating data.js...');

  // 1. Read existing data.js to get comments
  let existingContent = '';
  if (fs.existsSync(dataFile)) {
    existingContent = fs.readFileSync(dataFile, 'utf8');
  }

  const commentMatch = existingContent.match(/^([\s\S]*?)window\.mediaItems\s*=\s*\[/);
  const comments = commentMatch ? commentMatch[1] : '';

  // 2. Scan directories
  if (!fs.existsSync(imagesDir)) {
    console.error(`Error: ${imagesDir} not found.`);
    return;
  }

  const groups = fs.readdirSync(imagesDir).filter(f => {
    try {
      return fs.statSync(path.join(imagesDir, f)).isDirectory() && !f.startsWith('.');
    } catch {
      return false;
    }
  });

  let newItems = [];

  for (const group of groups) {
    const groupDir = path.join(imagesDir, group);
    const files = fs.readdirSync(groupDir).filter(f => !f.startsWith('.'));

    const fileObjects = [];

    // First pass to find all files and determine types
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      const filePath = path.join(groupDir, file);
      
      if (imageExts.has(ext)) {
        fileObjects.push({ name: file, baseName, ext, type: 'image', path: filePath });
      } else if (videoExts.has(ext)) {
        fileObjects.push({ name: file, baseName, ext, type: 'video-local', path: filePath });
      }
    }

    // PERF-10: Process all files concurrently — sharp.metadata() is I/O-bound
    // so firing them in parallel (Promise.all) instead of sequentially cuts
    // build time by roughly N× for a group with N images.
    await Promise.all(fileObjects.map(async (fileObj) => {
      const src = `assets/images/${group}/${fileObj.name}`;
      let width = DISPLAY_WIDTH;
      let height = Math.round(DISPLAY_WIDTH * (340 / 520)); // fallback ~16:10

      if (fileObj.type === 'image') {
        try {
          const metadata = await sharp(fileObj.path).metadata();

          if (metadata.width && metadata.height) {
            const aspectRatio = metadata.width / metadata.height;
            width  = DISPLAY_WIDTH;
            height = Math.round(DISPLAY_WIDTH / aspectRatio);
          }
        } catch (err) {
          console.error(`Error processing image ${fileObj.name}:`, err);
        }
      } else if (fileObj.type === 'video-local') {
        width  = DISPLAY_WIDTH;
        height = Math.round(DISPLAY_WIDTH / (16 / 9));
      }

      const prefix = group.substring(0, 4);
      const safeName = fileObj.baseName.replace(/[^a-zA-Z0-9]/g, '-');
      const id = `${prefix}-${safeName}`;

      newItems.push({
        id: id,
        type: fileObj.type,
        src: src,
        width: width,
        height: height,
        group: group,
        _name: fileObj.name // for sorting
      });
    }));

    // Process videos.txt
    const videosTxtPath = path.join(groupDir, 'videos.txt');
    if (fs.existsSync(videosTxtPath)) {
      const content = fs.readFileSync(videosTxtPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const ytMatch = line.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^"&?\s]+)/);
        const vimeoMatch = line.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
        if (ytMatch) {
          const videoId = ytMatch[1];
          newItems.push({
            id: `video-yt-${videoId}`,
            type: 'video-embed',
            provider: 'youtube',
            videoId: videoId,
            width: DISPLAY_WIDTH,
            height: Math.round(DISPLAY_WIDTH / (16 / 9)),
            group: group,
            _name: `zzz-video-${videoId}`
          });
        } else if (vimeoMatch) {
          const videoId = vimeoMatch[1];
          newItems.push({
            id: `video-vm-${videoId}`,
            type: 'video-embed',
            provider: 'vimeo',
            videoId: videoId,
            width: DISPLAY_WIDTH,
            height: Math.round(DISPLAY_WIDTH / (16 / 9)),
            group: group,
            _name: `zzz-video-${videoId}`
          });
        }
      }
    }
  }
  newItems.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.type !== b.type) return a.type === 'image' ? -1 : 1;
    return a._name.localeCompare(b._name);
  });

  // remove _name before output
  newItems.forEach(item => delete item._name);

  // 4. Combine (no longer needed, newItems has everything)
  const finalItems = newItems;

  // 5. Write to data.js
  const output = `${comments}window.mediaItems = ${JSON.stringify(finalItems, null, 2)};\n`;
  fs.writeFileSync(dataFile, output, 'utf8');
  console.log(`Done. ${finalItems.length} items written to data.js.`);

  // 6. Phase 9: Update static SEO tags in index.html & update sitemap.xml
  console.log('Updating static SEO tags and sitemap...');
  try {
    const configPath = path.join(rootDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('Warning: config.json not found, skipping static SEO updates.');
      return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const indexHtmlPath = path.join(rootDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      console.warn('Warning: index.html not found, skipping static SEO updates.');
      return;
    }
    let html = fs.readFileSync(indexHtmlPath, 'utf8');

    const canonicalUrl = config.seo?.canonicalUrl || "https://example.com/";
    const siteTitle = config.site?.title || "My Portfolio";
    const metaDescription = config.seo?.metaDescription || "";
    const author = config.site?.author || "";
    const twitterHandle = config.seo?.twitterHandle || "";

    const keywordsArr = config.seo?.keywords || [];
    const keywords = Array.isArray(keywordsArr) ? keywordsArr.join(', ') : keywordsArr;

    let ogImage = config.seo?.ogImage || "og-image.jpg";
    if (ogImage && !/^https?:\/\//i.test(ogImage)) {
      const base = canonicalUrl.endsWith('/') ? canonicalUrl : canonicalUrl + '/';
      const relative = ogImage.startsWith('/') ? ogImage.slice(1) : ogImage;
      ogImage = base + relative;
    }

    // Replace standard tags
    html = html.replace(/<link[^>]*?rel="canonical"[^>]*?>/is, `<link rel="canonical" href="${canonicalUrl}" />`);
    html = html.replace(/<title>[\s\S]*?<\/title>/is, `<title>${siteTitle}</title>`);
    html = html.replace(/<meta[^>]*?name="description"[^>]*?>/is, `<meta name="description" content="${metaDescription}" />`);
    html = html.replace(/<meta[^>]*?name="keywords"[^>]*?>/is, `<meta name="keywords" content="${keywords}" />`);
    html = html.replace(/<meta[^>]*?name="author"[^>]*?>/is, `<meta name="author" content="${author}" />`);

    // Replace Open Graph tags
    html = html.replace(/<meta[^>]*?property="og:url"[^>]*?>/is, `<meta property="og:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta[^>]*?property="og:title"[^>]*?>/is, `<meta property="og:title" content="${siteTitle}" />`);
    html = html.replace(/<meta[^>]*?property="og:description"[^>]*?>/is, `<meta property="og:description" content="${metaDescription}" />`);
    html = html.replace(/<meta[^>]*?property="og:image"[^>]*?>/is, `<meta property="og:image" content="${ogImage}" />`);

    // Replace Twitter Card tags
    html = html.replace(/<meta[^>]*?name="twitter:url"[^>]*?>/is, `<meta name="twitter:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta[^>]*?name="twitter:title"[^>]*?>/is, `<meta name="twitter:title" content="${siteTitle}" />`);
    html = html.replace(/<meta[^>]*?name="twitter:description"[^>]*?>/is, `<meta name="twitter:description" content="${metaDescription}" />`);
    html = html.replace(/<meta[^>]*?name="twitter:image"[^>]*?>/is, `<meta name="twitter:image" content="${ogImage}" />`);
    html = html.replace(/<meta[^>]*?name="twitter:site"[^>]*?>/is, `<meta name="twitter:site" content="${twitterHandle}" />`);

    // Replace apple-mobile-web-app-title
    html = html.replace(/<meta[^>]*?name="apple-mobile-web-app-title"[^>]*?>/is, `<meta name="apple-mobile-web-app-title" content="${siteTitle}" />`);

    // Replace legacy nav-left in index.html statically for fast first-paint matching
    html = html.replace(/<div class="nav-left">[\s\S]*?<\/div>/is, `<div class="nav-left">${siteTitle}</div>`);

    // Replace Schema.org JSON-LD blocks
    const schemaType = config.seo?.schemaType || "Person";
    const sameAs = config.seo?.sameAs || [];
    
    const schemaObj = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": schemaType === "Person" ? (config.site?.author || "Your Name") : (config.site?.title || "My Portfolio"),
      "url": canonicalUrl
    };
    
    if (schemaType === "Person" && config.seo?.jobTitle) {
      schemaObj.jobTitle = config.seo.jobTitle;
    }
    
    if (Array.isArray(sameAs) && sameAs.length > 0) {
      schemaObj.sameAs = sameAs;
    }

    const jsonLdStr = JSON.stringify(schemaObj, null, 2);
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/is, 
      `<script type="application/ld+json">\n${jsonLdStr.split('\n').map(line => '      ' + line).join('\n').trim()}\n    </script>`);

    // Update cache-busters for data.js and main.js so the browser automatically fetches the new files
    const timestamp = Math.floor(Date.now() / 1000);
    html = html.replace(/<script src="\.\/data\.js\?[^"]*"><\/script>/, `<script src="./data.js?${timestamp}"></script>`);
    html = html.replace(/<script src="\.\/main\.js\?[^"]*"><\/script>/, `<script src="./main.js?${timestamp}"></script>`);

    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log(`Successfully updated index.html with static SEO tags and cache-busters (?${timestamp}).`);

    // 7. Phase 10: Update favicon/site.webmanifest from config.site.title
    const manifestPath = path.join(rootDir, 'favicon', 'site.webmanifest');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.name = siteTitle;
      manifest.short_name = siteTitle;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      console.log(`Successfully updated favicon/site.webmanifest with name/short_name: "${siteTitle}"`);
    } else {
      console.warn('Warning: favicon/site.webmanifest not found, skipping manifest update.');
    }

    // sitemap.xml update
    const today = new Date().toISOString().split('T')[0];
    const sitemapXmlPath = path.join(rootDir, 'sitemap.xml');
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${canonicalUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>\n`;
    fs.writeFileSync(sitemapXmlPath, sitemapContent, 'utf8');
    console.log(`Successfully updated sitemap.xml with canonical URL: ${canonicalUrl} and date: ${today}`);

    // robots.txt update
    const robotsTxtPath = path.join(rootDir, 'robots.txt');
    const robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /temp/

Sitemap: ${canonicalUrl.endsWith('/') ? canonicalUrl : canonicalUrl + '/'}sitemap.xml\n`;
    fs.writeFileSync(robotsTxtPath, robotsContent, 'utf8');
    console.log(`Successfully generated robots.txt pointing to ${canonicalUrl.endsWith('/') ? canonicalUrl : canonicalUrl + '/'}sitemap.xml`);


  } catch (err) {
    console.error('Error during static SEO or sitemap generation:', err);
  }
}

main().catch(console.error);
