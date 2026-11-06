// utils/generate-pwa-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgLogo = (size, padding = 0.15) => {
  const pad = size * padding;
  const innerSize = size - pad * 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="50%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#0d9488" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#0d9488" stop-opacity="0" />
      </linearGradient>
    </defs>
    <!-- Background rounded squircle -->
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bgGrad)" />
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="none" stroke="#1e293b" stroke-width="${Math.max(1, size * 0.015)}" />
    
    <!-- Ambient glow circle -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="url(#glowGrad)" />

    <!-- Modern Accelvia 'A' geometric emblem -->
    <g transform="translate(${pad}, ${pad})">
      <!-- Left diagonal beam -->
      <path d="M ${innerSize * 0.5} ${innerSize * 0.15} L ${innerSize * 0.65} ${innerSize * 0.15} L ${innerSize * 0.9} ${innerSize * 0.85} L ${innerSize * 0.72} ${innerSize * 0.85} L ${innerSize * 0.57} ${innerSize * 0.45} L ${innerSize * 0.43} ${innerSize * 0.45} L ${innerSize * 0.28} ${innerSize * 0.85} L ${innerSize * 0.1} ${innerSize * 0.85} Z" fill="url(#brandGrad)" />
      <!-- High-tech cross connector -->
      <path d="M ${innerSize * 0.34} ${innerSize * 0.58} L ${innerSize * 0.66} ${innerSize * 0.58} L ${innerSize * 0.61} ${innerSize * 0.68} L ${innerSize * 0.39} ${innerSize * 0.68} Z" fill="#6ee7b7" />
      <!-- Center pulse jewel -->
      <circle cx="${innerSize * 0.5}" cy="${innerSize * 0.36}" r="${innerSize * 0.06}" fill="#ffffff" />
    </g>
  </svg>`;
};

async function run() {
  const srcDir = path.resolve(__dirname, '../src');
  
  // 1. Vector SVG
  fs.writeFileSync(path.join(srcDir, 'favicon.svg'), svgLogo(128, 0.1));
  
  // 2. High-res PNGs
  await sharp(Buffer.from(svgLogo(192, 0.12))).png().toFile(path.join(srcDir, 'icon-192.png'));
  await sharp(Buffer.from(svgLogo(512, 0.12))).png().toFile(path.join(srcDir, 'icon-512.png'));
  await sharp(Buffer.from(svgLogo(512, 0.22))).png().toFile(path.join(srcDir, 'icon-maskable-512.png'));
  await sharp(Buffer.from(svgLogo(180, 0.12))).png().toFile(path.join(srcDir, 'apple-touch-icon.png'));
  
  console.log('✅ PWA Icons generated successfully in src/ folder!');
}

run().catch(console.error);
