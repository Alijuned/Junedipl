import * as THREE from 'three';

/**
 * Draws the official Fluton geometric symbol (Reference Image 2):
 * - Upper inverted chevron (^) with rounded ends
 * - Lower left-pointing chevron (<) with rounded ends
 * - Split ring (o) nestled to the right of the lower chevron
 */
export function drawFlutonSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color = '#ffffff'
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 100;

  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Upper chevron (^)
  ctx.lineWidth = 14 * s;
  ctx.beginPath();
  ctx.moveTo(-34 * s, -2 * s);
  ctx.lineTo(0, -34 * s);
  ctx.lineTo(34 * s, -2 * s);
  ctx.stroke();

  // Lower left-pointing chevron (<)
  ctx.lineWidth = 13 * s;
  ctx.beginPath();
  ctx.moveTo(0, -8 * s);
  ctx.lineTo(-22 * s, 14 * s);
  ctx.lineTo(0, 36 * s);
  ctx.stroke();

  // Small split ring inside lower chevron
  ctx.lineWidth = 5.5 * s;
  ctx.beginPath();
  ctx.arc(10 * s, 14 * s, 9.5 * s, -0.6, Math.PI * 0.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(10 * s, 14 * s, 9.5 * s, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  ctx.restore();
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createFlutonTokenTexture(
  maxAnisotropy: number,
  size = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const k = size / 512;

  const drawFrameAndRim = () => {
    ctx.clearRect(0, 0, size, size);

    // Purple outer glow halo
    const grad = ctx.createRadialGradient(half, half, 170 * k, half, half, 252 * k);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.84, '#050408');
    grad.addColorStop(0.92, '#a855f7');
    grad.addColorStop(1, '#6b21a8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(half, half, 250 * k, 0, Math.PI * 2);
    ctx.fill();

    // Exact pure black circular interior background
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(half, half, 224 * k, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRimRing = () => {
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = Math.max(2, 8 * k);
    ctx.beginPath();
    ctx.arc(half, half, 224 * k, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawFrameAndRim();
  // Synchronous crisp vector fallback visible immediately on frame 0
  drawFlutonSymbol(ctx, half, 260 * k, 315 * k, '#ffffff');
  drawRimRing();

  const tex = finalizeColorTexture(canvas, maxAnisotropy);

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      drawFrameAndRim();
      ctx.save();
      ctx.beginPath();
      ctx.arc(half, half, 220 * k, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Scale slightly so JPEG outer white corners fall completely outside circular clip
      const drawW = 490 * k;
      const drawH = (img.naturalHeight / img.naturalWidth) * drawW;
      ctx.drawImage(img, half - drawW * 0.5, half - drawH * 0.5, drawW, drawH);
      ctx.restore();

      drawRimRing();
      tex.needsUpdate = true;
    };
    img.src = '/assets/aistudio/fluton_logo_b582d1e3.jpg';
  }

  return tex;
}

export function createForeheadLogoTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 192, 192);
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 12;
  drawFlutonSymbol(ctx, 96, 96, 138, '#ffffff');
  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createTrainSideTexture(
  maxAnisotropy: number,
  bodyHex: string,
  stripeHex: string,
  withGraffiti: boolean,
  graffitiVariant = 0,
  width = 768
): THREE.CanvasTexture {
  const height = Math.round((width * 384) / 1024);
  const k = width / 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.scale(k, k);

  // Metallic sleek train hull gradient
  const hullGrad = ctx.createLinearGradient(0, 0, 0, 384);
  hullGrad.addColorStop(0, bodyHex);
  hullGrad.addColorStop(0.55, bodyHex);
  hullGrad.addColorStop(1, '#12131c');
  ctx.fillStyle = hullGrad;
  ctx.fillRect(0, 0, 1024, 384);

  // Futuristic top & bottom glowing accent stripes
  ctx.fillStyle = stripeHex;
  ctx.fillRect(0, 22, 1024, 16);
  ctx.fillRect(0, 316, 1024, 24);

  // Subtle horizontal metallic sheen line
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, 38, 1024, 4);

  // Panel seams
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  for (let x = 128; x < 1024; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 384);
    ctx.stroke();
  }

  // Passenger windows & sliding doors
  for (let i = 0; i < 4; i++) {
    const base = i * 256;
    ctx.fillStyle = 'rgba(15, 16, 26, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(base + 22, 92, 68, 224, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.globalAlpha = 0.38;
    ctx.fillRect(base + 34, 112, 44, 90);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.roundRect(base + 108, 92, 128, 108, 14);
    ctx.fill();
    ctx.strokeStyle = stripeHex;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = 'rgba(192, 132, 252, 0.28)';
    ctx.beginPath();
    ctx.moveTo(base + 120, 100);
    ctx.lineTo(base + 165, 100);
    ctx.lineTo(base + 135, 190);
    ctx.lineTo(base + 114, 190);
    ctx.closePath();
    ctx.fill();
  }

  // Large readable "gFluton" graffiti / official branding on lower-mid side
  if (withGraffiti) {
    ctx.save();
    const splashX = 512;
    const splashY = 235;
    const splashGrad = ctx.createRadialGradient(splashX, splashY, 20, splashX, splashY, 320);
    splashGrad.addColorStop(
      0,
      graffitiVariant % 2 === 0 ? 'rgba(147, 51, 234, 0.88)' : 'rgba(192, 38, 211, 0.88)'
    );
    splashGrad.addColorStop(0.6, 'rgba(88, 28, 135, 0.45)');
    splashGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
    ctx.fillStyle = splashGrad;
    ctx.fillRect(140, 125, 744, 210);

    ctx.fillStyle = '#c084fc';
    for (let s = 0; s < 22; s++) {
      const sx = 190 + ((s * 97) % 640);
      const sy = 155 + ((s * 53) % 150);
      const sr = 3 + (s % 6);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#09080f';
    ctx.beginPath();
    ctx.arc(235, 235, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 6;
    ctx.stroke();
    drawFlutonSymbol(ctx, 235, 237, 82, '#ffffff');

    ctx.translate(565, 248);
    ctx.rotate(-0.035);
    ctx.font = 'italic 900 112px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 18;
    ctx.strokeStyle = '#09080f';
    ctx.strokeText('gFluton', 6, 8);

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#a855f7';
    ctx.strokeText('gFluton', 0, 0);

    const txtGrad = ctx.createLinearGradient(0, -55, 0, 55);
    txtGrad.addColorStop(0, '#ffffff');
    txtGrad.addColorStop(0.55, '#f3e8ff');
    txtGrad.addColorStop(1, '#c084fc');
    ctx.fillStyle = txtGrad;
    ctx.fillText('gFluton', 0, 0);

    ctx.fillStyle = '#c084fc';
    const drips = [-175, -80, 40, 145, 210];
    for (let d = 0; d < drips.length; d++) {
      const dx = drips[d];
      const dh = 18 + (d % 3) * 14;
      ctx.beginPath();
      ctx.roundRect(dx, 36, 7, dh, 3.5);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createTrackBedTexture(
  maxAnisotropy: number,
  size = 512
): THREE.CanvasTexture {
  const k = size / 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(k, k);

  // Rich crushed granite ballast base
  ctx.fillStyle = '#433f52';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const shade = 48 + (i % 46);
    ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade + 12})`;
    ctx.fillRect(x, y, 4, 4);
  }

  // Three lanes of track beds
  const laneCenters = [102, 256, 410];
  for (const lx of laneCenters) {
    ctx.fillStyle = 'rgba(18, 16, 28, 0.45)';
    ctx.fillRect(lx - 54, 0, 108, 512);

    // Concrete sleepers with beveled shadow
    for (let y = 16; y < 512; y += 64) {
      ctx.fillStyle = '#7c788e';
      ctx.fillRect(lx - 48, y, 96, 16);
      ctx.fillStyle = '#4e4a5e';
      ctx.fillRect(lx - 48, y + 16, 96, 4);
    }

    // Dual rail base shadows (3D steel rails sit directly above these!)
    for (const rx of [lx - 32, lx + 32]) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx - 5, 0, 10, 512);
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 2);
}

export function createPlatformTexture(
  maxAnisotropy: number,
  size = 512
): THREE.CanvasTexture {
  const k = size / 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(k, k);

  ctx.fillStyle = '#d4d0e0';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(71, 64, 96, 0.24)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 36, 512);
  ctx.fillStyle = '#7e22ce';
  ctx.fillRect(36, 0, 14, 512);

  return finalizeColorTexture(canvas, maxAnisotropy, 1, 2);
}

export function createBuildingFacadeTexture(
  maxAnisotropy: number,
  paletteIdx: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    { wall: '#312e4f', win: '#fef08a', accent: '#a855f7' },
    { wall: '#283655', win: '#bae6fd', accent: '#38bdf8' },
    { wall: '#3f2e4f', win: '#fde68a', accent: '#e879f9' },
    { wall: '#2e3f4f', win: '#e0f2fe', accent: '#c084fc' },
  ];
  const p = palettes[paletteIdx % palettes.length];

  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, 256, 512);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = 0; y < 512; y += 32) {
    ctx.fillRect(0, y, 256, 4);
  }

  for (let row = 0; row < 14; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = (row * 7 + col * 13 + paletteIdx) % 3 !== 0;
      ctx.fillStyle = lit ? p.win : '#181828';
      ctx.globalAlpha = lit ? 0.85 : 0.7;
      ctx.fillRect(18 + col * 46, 20 + row * 34, 30, 20);
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, 256, 12);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createHazardStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#181424';
  for (let x = -64; x < 320; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x - 16, 64);
    ctx.lineTo(x - 40, 64);
    ctx.closePath();
    ctx.fill();
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createBillboardTexture(
  maxAnisotropy: number,
  title: string,
  subtitle: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c0a16';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 176);

  drawFlutonSymbol(ctx, 76, 96, 90, '#ffffff');

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 54px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 140, 76);

  ctx.fillStyle = accentHex;
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 142, 132);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 6, 16, 0.72)');
  grad.addColorStop(0.55, 'rgba(8, 6, 16, 0.35)');
  grad.addColorStop(1, 'rgba(8, 6, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPowerUpLabelTexture(
  maxAnisotropy: number,
  title: string,
  subtitle: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 160);

  // Sleek dark obsidian pill backdrop with glowing violet border
  ctx.fillStyle = 'rgba(9, 8, 18, 0.92)';
  ctx.beginPath();
  ctx.roundRect(12, 14, 488, 132, 24);
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(12, 14, 500, 146);
  borderGrad.addColorStop(0, '#c084fc');
  borderGrad.addColorStop(0.5, '#ffffff');
  borderGrad.addColorStop(1, '#9333ea');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(12, 14, 488, 132, 24);
  ctx.stroke();

  // Top & bottom subtle accent bars
  ctx.fillStyle = '#9333ea';
  ctx.fillRect(48, 22, 416, 4);

  // Main power-up title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = title.length > 16 ? 34 : title.length > 10 ? 40 : 54;
  ctx.font = `700 ${fontSize}px "Chakra Petch", sans-serif`;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 256, 72);

  // Subtitle + +10 coins indicator
  ctx.shadowBlur = 0;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#d8b4fe';
  ctx.fillText(subtitle, 256, 118);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createEncryptionGlyphTexture(
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090714';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const glyphs = ['0xFHE', '10110', '<ENC>', 'ZK::01', '0x9A', 'Σ[x]', 'MEV=0', '01101'];
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = (row * 3 + col) % glyphs.length;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#c084fc' : '#ffffff';
      ctx.globalAlpha = 0.6 + ((row + col) % 3) * 0.14;
      ctx.fillText(glyphs[idx], 10 + col * 86, 16 + row * 32);
    }
  }
  ctx.globalAlpha = 1;

  return finalizeColorTexture(canvas, maxAnisotropy);
}
