// Génère les icônes PWA (192 et 512 px) à partir d'un SVG inline.
import sharp from 'sharp';

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#059669"/>
  <g transform="translate(128,128) scale(10.66)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 7 9 3 5 7l4 4"/>
    <path d="m17 11 4 4-4 4-4-4"/>
    <path d="m8 12 4 4 6-6-4-4Z"/>
    <path d="m16 8 3-3"/>
    <path d="M9 21a6 6 0 0 0-6-6"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('Icônes PWA générées : icon-512.png, icon-192.png, apple-touch-icon.png');
