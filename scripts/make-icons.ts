// Génère les icônes PWA (192 et 512 px) à partir du logo OreTracking-Link.
import sharp from 'sharp';

const source = 'public/logo.png';

await sharp(source).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile('public/icon-512.png');
await sharp(source).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile('public/icon-192.png');
await sharp(source).resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile('public/apple-touch-icon.png');
console.log('Icônes PWA générées : icon-512.png, icon-192.png, apple-touch-icon.png');
