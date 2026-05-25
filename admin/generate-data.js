const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const vm = require('vm');

const rootDir = path.join(__dirname, '..');
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

    // Process files
    for (const fileObj of fileObjects) {
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
    }

    // Process videos.txt
    const videosTxtPath = path.join(groupDir, 'videos.txt');
    if (fs.existsSync(videosTxtPath)) {
      const content = fs.readFileSync(videosTxtPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^"&?\s]+)/);
        if (match) {
          const videoId = match[1];
          newItems.push({
            id: `video-yt-${videoId}`,
            type: 'video-embed',
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
}

main().catch(console.error);
