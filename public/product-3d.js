/**
 * Luxury & Elegant — Interactive 3D Product Atelier Experience
 * Built with Three.js (WebGL), procedural PBR materials, and GSAP ScrollTrigger.
 * Features 3 hyper-detailed procedural luxury product showcases:
 *   1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch)
 *      - Stitched Italian calfskin leather straps with gold tang buckle & keeper loops
 *      - 316L Champagne Gold case with stepped coin-fluted bezel & downward-curved lugs
 *      - Applied 3D metallic gold baton hour markers, date aperture at 3 o'clock
 *      - Faceted Dauphine hands with blued steel second hand
 *      - Sapphire crystal dome with antireflective optical transmission
 *      - Rear exhibition calibre movement with ruby jewels & Côtes de Genève oscillating rotor
 *   2. Premium Headphones (ID: 4 — Aura Pro Studio Wireless Headphones)
 *      - Spring-steel headband with segmented leather comfort cushion
 *      - Brushed aluminum telescoping slider arms & pivot gimbals
 *      - Matte obsidian acoustic shells with diamond-cut gold chamfers & tactile dials
 *      - Memory foam ear cushions with inner fabric dust scrim (L/R indicators)
 *      - 40mm titanium transducer drivers
 *   3. Luxury Radiance Elixir Bottle (ID: 8 — Lumière 20% Vitamin C Radiance Serum)
 *      - Thick-walled amber flint crystal glass bottle with heavy crystal base
 *      - Glowing golden serum liquid core with internal caustic lighting
 *      - High-resolution gold foil apothecary label
 *      - Threaded knurled gold collar with silicone dropper bulb & glass pipette
 */

(function (window) {
  'use strict';

  // State & Three.js Singletons
  let scene, camera, renderer, animationFrameId;
  let canvasContainer, canvasElement;
  let studioEnvMap;
  let activeModelKey = 'watch'; // 'watch' | 'headphones' | 'perfume'
  let isExploded = false;
  let explodeProgress = 0; // 0 (assembled) -> 1 (exploded)
  let scrollTimeline = null;
  let isInteracting = false;
  let previousPointer = { x: 0, y: 0 };
  let modelRotation = { x: 0.12, y: 0.2 };
  let targetRotation = { x: 0.18, y: -0.22 };
  let cameraDistance = 8.2;
  let targetCameraDistance = 8.2;
  let isVisible = true;
  let scrollRotationDelta = 0;

  // Model References & Dynamic Groups
  const models = {
    watch: null,
    headphones: null,
    perfume: null
  };

  // Animated sub-components
  let watchParts = {};
  let headphonesParts = {};
  let perfumeParts = {};

  // Cinematic Lights
  let keyLight, fillLight, goldRimLight, bottleLight;

  // Real Database Product Metadata for the 3 Showcases (Strictly matching SQLite DB)
  const SHOWCASE_PRODUCTS = {
    watch: {
      id: 3,
      category: 'Fashion & Horology',
      badge: '✦ Swiss Quartz Precision Movement',
      title: 'Geneva Gold Minimalist Watch',
      tagline: 'Ultra-slim surgical-grade champagne gold casing with scratch-resistant sapphire crystal and Italian top-grain calfskin leather strap.',
      price: 3600,
      regularPrice: 4500,
      onSale: true,
      stock: 23,
      specs: [
        { label: 'Casing', val: '316L Surgical Champagne Gold' },
        { label: 'Crystal', val: 'Scratch-Resistant Sapphire Glass' },
        { label: 'Strap', val: 'Stitched Italian Calfskin Leather' },
        { label: 'Movement', val: 'Swiss Quartz Precision Movement' }
      ],
      components: [
        'Curved Calfskin Strap',
        'Sapphire Crystal Lens',
        'Coin-Fluted Bezel',
        'Faceted Dauphine Hands',
        'Emerald Sunburst Dial',
        'Applied 3D Batons',
        'Exhibition Calibre',
        'Geneva Oscillating Rotor'
      ]
    },
    headphones: {
      id: 4,
      category: 'High-Fidelity Acoustics',
      badge: '✦ 40mm Titanium Acoustic Transducer',
      title: 'Aura Pro Studio Wireless Headphones',
      tagline: 'Precision 40mm titanium acoustic drivers, hybrid active noise cancellation, brushed aluminum hardware, and 45-hour ultra-long battery life with spatial audio.',
      price: 6990,
      regularPrice: 8900,
      onSale: true,
      stock: 30,
      specs: [
        { label: 'Transducers', val: '40mm Custom Titanium Drivers' },
        { label: 'Noise Control', val: 'Hybrid Active Noise Cancellation' },
        { label: 'Hardware', val: 'Brushed Aluminum & Memory Foam' },
        { label: 'Endurance', val: '45-Hour Ultra-Long Playback' }
      ],
      components: [
        'Steel Headband Arch',
        'Cushioned Leather Crown',
        'Anodized Aluminum Yokes',
        'Obsidian Acoustic Shells',
        'Titanium Transducers',
        'Memory Foam Protein Cushions'
      ]
    },
    perfume: {
      id: 8,
      category: 'Artisanal Beauty & Elixir',
      badge: '✦ 20% Stabilized L-Ascorbic Acid',
      title: 'Lumière 20% Vitamin C Radiance Serum',
      tagline: 'Advanced antioxidant brightening elixir formulated with 20% stabilized L-Ascorbic Acid, pure hyaluronic acid, and botanical ferulic acid for a luminous, firm complexion.',
      price: 1850,
      regularPrice: 1850,
      onSale: false,
      stock: 45,
      specs: [
        { label: 'Active Complex', val: '20% Stabilized L-Ascorbic Acid' },
        { label: 'Hydration', val: 'Pure Botanical Hyaluronic Acid' },
        { label: 'Synergy', val: 'Ferulic Acid Protective Complex' },
        { label: 'Packaging', val: 'Apothecary Amber Flint Glass' }
      ],
      components: [
        'Flint Amber Glass Flacon',
        'Heavy Solid Crystal Base',
        'Radiant Serum Liquid Core',
        'Gold Foil Embossed Label',
        'Threaded Knurled Collar',
        'Borosilicate Glass Pipette'
      ]
    }
  };

  // Check WebGL availability
  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  // Generate procedural high-contrast studio environment reflection map
  function createStudioEnvironment(targetRenderer) {
    const pmremGenerator = new THREE.PMREMGenerator(targetRenderer);
    pmremGenerator.compileEquirectangularShader();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Studio dark emerald to obsidian vignette background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a1a12');
    grad.addColorStop(0.5, '#040d08');
    grad.addColorStop(1, '#020604');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Primary Overhead Diffused Softbox (bright core with warm falloff)
    const softbox1 = ctx.createRadialGradient(512, 110, 10, 512, 110, 380);
    softbox1.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    softbox1.addColorStop(0.3, 'rgba(255, 248, 230, 0.85)');
    softbox1.addColorStop(0.7, 'rgba(235, 205, 140, 0.25)');
    softbox1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = softbox1;
    ctx.fillRect(100, 10, 824, 220);

    // Left Studio Strip Light (creates elegant vertical specular reflections on metal flanks)
    const stripLeft = ctx.createLinearGradient(60, 0, 180, 0);
    stripLeft.addColorStop(0, 'rgba(0, 0, 0, 0)');
    stripLeft.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    stripLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = stripLeft;
    ctx.fillRect(60, 100, 120, 320);

    // Right Warm Gold Rim Strip Light
    const stripRight = ctx.createLinearGradient(840, 0, 960, 0);
    stripRight.addColorStop(0, 'rgba(0, 0, 0, 0)');
    stripRight.addColorStop(0.5, 'rgba(240, 205, 120, 0.9)');
    stripRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = stripRight;
    ctx.fillRect(840, 80, 120, 340);

    // Subtle Cool Fill Light (bottom horizon)
    const coolFill = ctx.createRadialGradient(250, 420, 20, 250, 420, 200);
    coolFill.addColorStop(0, 'rgba(180, 215, 255, 0.45)');
    coolFill.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coolFill;
    ctx.fillRect(100, 300, 300, 200);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    return envMap;
  }

  // -------------------------------------------------------------
  // PROCEDURAL TEXTURE GENERATORS
  // -------------------------------------------------------------

  // 1. Italian Calfskin Stitched Leather Strap Texture
  function createLeatherStrapTexture(isTop) {
    const width = 512;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Rich cognac / deep saddle leather gradient
    const baseGrad = ctx.createLinearGradient(0, 0, width, 0);
    baseGrad.addColorStop(0, '#1c100a');
    baseGrad.addColorStop(0.15, '#2e1b12');
    baseGrad.addColorStop(0.5, '#3b2318');
    baseGrad.addColorStop(0.85, '#2e1b12');
    baseGrad.addColorStop(1, '#1c100a');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // Micro leather grain stippling
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle creases along strap length
    ctx.strokeStyle = 'rgba(15, 8, 4, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 30; y < height - 30; y += 45) {
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.quadraticCurveTo(width / 2, y + (Math.random() - 0.5) * 12, width - 35, y);
      ctx.stroke();
    }

    // Authentic Ivory/Ecru Perimeter Edge Stitching
    const stitchMargin = 38;
    const stitchLength = 22;
    const stitchGap = 14;

    function drawStitchLine(x) {
      ctx.save();
      ctx.lineCap = 'round';
      const startY = 30;
      const endY = height - 40;

      for (let y = startY; y < endY; y += stitchLength + stitchGap) {
        // Stitch drop shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 2);
        ctx.lineTo(x + 1, y + stitchLength + 2);
        ctx.stroke();

        // Realistic thread highlights (twisted ecru thread)
        ctx.strokeStyle = '#f4ede0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + stitchLength);
        ctx.stroke();

        ctx.strokeStyle = '#e6dcce';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 0.5, y + 2);
        ctx.lineTo(x - 0.5, y + stitchLength - 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawStitchLine(stitchMargin);
    drawStitchLine(width - stitchMargin);

    // If bottom strap: Draw 6 punched pin adjustment holes along center
    if (!isTop) {
      const holeX = width / 2;
      const holeStartY = 280;
      const holeSpacing = 110;

      for (let h = 0; h < 6; h++) {
        const hy = holeStartY + h * holeSpacing;
        // Pressed leather indentation
        ctx.fillStyle = 'rgba(15, 8, 4, 0.45)';
        ctx.beginPath();
        ctx.arc(holeX, hy, 16, 0, Math.PI * 2);
        ctx.fill();

        // Deep hole core
        ctx.fillStyle = '#0a0503';
        ctx.beginPath();
        ctx.arc(holeX, hy, 11, 0, Math.PI * 2);
        ctx.fill();

        // Subtle lower rim highlight
        ctx.strokeStyle = 'rgba(255, 235, 200, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(holeX, hy, 12, 0, Math.PI);
        ctx.stroke();
      }
    } else {
      // Top strap embossed brand stamp
      ctx.save();
      ctx.translate(width / 2, height * 0.42);
      ctx.textAlign = 'center';
      ctx.font = '600 20px "Playfair Display", Georgia, serif';
      ctx.fillStyle = 'rgba(215, 180, 110, 0.65)';
      ctx.fillText('GENEVE CRAFTED', 0, 0);
      ctx.font = '500 13px "Inter", sans-serif';
      ctx.fillStyle = 'rgba(215, 180, 110, 0.45)';
      ctx.fillText('VÉRITABLE CUIR · HANDMADE', 0, 24);
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // 2. Sunburst Dark Emerald Watch Dial
  // 2. Ultra-High Resolution Swiss Sunburst Emerald Watch Dial (2048x2048)
  // 2. Ultra-High Resolution Swiss Sunburst Emerald Watch Dial (2048x2048)
  // 2. Ultra-High Resolution Swiss Sunburst Emerald Watch Dial (2048x2048)
  // 2. Ultra-High Resolution Swiss Sunburst Emerald Watch Dial (2048x2048)
  // 2. Ultra-High Resolution Swiss Sunburst Emerald Watch Dial (2048x2048)
  function createDialTexture() {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.495; // Fills the dial face circle completely

    // Deep Luxury Emerald Base
    ctx.fillStyle = '#011209';
    ctx.fillRect(0, 0, size, size);

    // Deep Regal Rolex-Grade Emerald Sunburst Gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
    bgGrad.addColorStop(0, '#0e4f37');    // Rich saturated jewel emerald
    bgGrad.addColorStop(0.35, '#073625'); // Deep forest emerald
    bgGrad.addColorStop(0.70, '#042217'); // Regal shadowy emerald
    bgGrad.addColorStop(0.92, '#02130d'); // Dark velvet rim
    bgGrad.addColorStop(1, '#010a06');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 720 Micro-Groove Sunray Brushed Lines (Shimmering Light Catchers)
    ctx.save();
    ctx.translate(cx, cy);
    for (let a = 0; a < 720; a += 1) {
      const rad = (a * Math.PI) / 360;
      const alpha = 0.035 + Math.sin(rad * 8) * 0.025;
      ctx.strokeStyle = "rgba(165, 245, 210, " + alpha.toFixed(3) + ")";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rad) * radius, Math.sin(rad) * radius);
      ctx.stroke();
    }
    ctx.restore();

    // Concentric Circular Guilloché Tracks
    [0.72, 0.73, 0.74, 0.88, 0.89].forEach((frac) => {
      ctx.strokeStyle = 'rgba(245, 215, 127, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * frac, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Railway Minute Track (Outer Chapter Ring)
    ctx.strokeStyle = 'rgba(245, 215, 127, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.87, 0, Math.PI * 2);
    ctx.stroke();

    // 60 Minute Track Marks & 3D Luminous Pearls
    for (let m = 0; m < 60; m++) {
      const angle = (m * Math.PI) / 30 - Math.PI / 2;
      const isFiveMin = m % 5 === 0;
      const outer = radius * 0.94;
      const inner = isFiveMin ? radius * 0.87 : radius * 0.905;

      ctx.strokeStyle = isFiveMin ? '#fceda8' : 'rgba(235, 205, 125, 0.55)';
      ctx.lineWidth = isFiveMin ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();

      // Luminous Pearl with Gold Bezel at every 5-minute marker
      if (isFiveMin) {
        const pearlDist = radius * 0.835;
        const px = cx + Math.cos(angle) * pearlDist;
        const py = cy + Math.sin(angle) * pearlDist;

        // Gold Bezel
        ctx.fillStyle = '#d4a340';
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Luminous Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 12 Applied 3D Faceted Gold Roman Numerals
    const romanNumerals = [
      { text: 'XII', angle: -Math.PI / 2, size: 74 },
      { text: 'I', angle: -Math.PI / 3, size: 66 },
      { text: 'II', angle: -Math.PI / 6, size: 66 },
      { text: '', angle: 0, size: 0 }, // 3 o'clock is Date Window
      { text: 'IIII', angle: Math.PI / 6, size: 60 },
      { text: 'V', angle: Math.PI / 3, size: 66 },
      { text: 'VI', angle: Math.PI / 2, size: 74 },
      { text: 'VII', angle: (2 * Math.PI) / 3, size: 66 },
      { text: 'VIII', angle: (5 * Math.PI) / 6, size: 60 },
      { text: 'IX', angle: Math.PI, size: 66 },
      { text: 'X', angle: (7 * Math.PI) / 6, size: 66 },
      { text: 'XI', angle: (4 * Math.PI) / 3, size: 66 },
    ];

    const numeralRadius = radius * 0.73;
    romanNumerals.forEach((item) => {
      if (!item.text) return;
      const nx = cx + Math.cos(item.angle) * numeralRadius;
      const ny = cy + Math.sin(item.angle) * numeralRadius;

      ctx.save();
      ctx.translate(nx, ny);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + item.size + 'px "Playfair Display", Georgia, serif';

      // 3D Soft Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText(item.text, 3, 4);

      // Gold Gradient Foil Face
      const numGrad = ctx.createLinearGradient(0, -item.size / 2, 0, item.size / 2);
      numGrad.addColorStop(0, '#fff6d6');
      numGrad.addColorStop(0.3, '#f5d77f');
      numGrad.addColorStop(0.7, '#d4a340');
      numGrad.addColorStop(1, '#a67c1e');
      ctx.fillStyle = numGrad;
      ctx.fillText(item.text, 0, 0);

      // Bright Top Chamfer Stroke
      ctx.strokeStyle = 'rgba(255, 245, 215, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.strokeText(item.text, 0, 0);

      ctx.restore();
    });

    // 18K Gold Coronet / Luxury Emblem at 12 o'clock
    ctx.save();
    ctx.translate(cx, cy - radius * 0.58);
    ctx.fillStyle = '#fce29e';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 14);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    // 5 Crown Points
    [-18, -9, 0, 9, 18].forEach((px, i) => {
      const py = Math.abs(i - 2) * 5;
      ctx.beginPath();
      ctx.arc(px, -22 + py, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // High Horology Typographic Imprint
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "LUXURY & ELEGANT"
    ctx.font = '700 48px "Playfair Display", Georgia, serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText('LUXURY & ELEGANT', cx + 1, cy - radius * 0.38 + 2);
    ctx.fillStyle = '#fff4cc';
    ctx.fillText('LUXURY & ELEGANT', cx, cy - radius * 0.38);

    // "GENÈVE"
    ctx.font = '600 24px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(245, 215, 127, 0.9)';
    ctx.fillText('GENÈVE', cx, cy - radius * 0.28);

    // "AUTOMATIC CHRONOMETER"
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillStyle = '#fce29e';
    ctx.fillText('AUTOMATIC CHRONOMETER', cx, cy + radius * 0.38);

    // "OFFICIALLY CERTIFIED · 100M"
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('OFFICIALLY CERTIFIED · 100M', cx, cy + radius * 0.48);

    // "SWISS MADE" at 6 o'clock
    ctx.font = '700 16px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(245, 215, 127, 0.8)';
    ctx.fillText('✦  SWISS MADE  ✦', cx, cy + radius * 0.79);

    // Date Window at 3 o'clock (Framed in 18K Beveled Gold)
    const dateX = cx + numeralRadius;
    const dateY = cy;
    const dw = 72;
    const dh = 52;

    // Outer Gold Frame
    ctx.fillStyle = '#caa140';
    ctx.fillRect(dateX - dw / 2 - 4, dateY - dh / 2 - 4, dw + 8, dh + 8);

    // Inner Polished Chamfer
    ctx.fillStyle = '#fce29e';
    ctx.fillRect(dateX - dw / 2 - 2, dateY - dh / 2 - 2, dw + 4, dh + 4);

    // White Date Disc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dateX - dw / 2, dateY - dh / 2, dw, dh);

    // Date Number "26"
    ctx.font = '700 32px "Inter", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('26', dateX, dateY + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.center.set(0.5, 0.5);
    texture.rotation = 0;
    texture.anisotropy = 16;
    return texture;
  }

  // 3. Côtes de Genève (Geneva Stripes) for movement rotor
  function createGenevaStripesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#c8a24a');
    grad.addColorStop(0.5, '#e8cf88');
    grad.addColorStop(1, '#c8a24a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, 0, 8, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  // 4. Acoustic Transducer Micro-Perforated Grille Texture
  function createSpeakerGrilleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const cx = 256;
    const cy = 256;

    ctx.fillStyle = '#111417';
    ctx.fillRect(0, 0, 512, 512);

    // Concentric micro-perforations
    ctx.fillStyle = '#262c33';
    for (let r = 20; r < 230; r += 14) {
      const count = Math.floor((r * 2 * Math.PI) / 10);
      for (let i = 0; i < count; i++) {
        const a = (i * 2 * Math.PI) / count;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Concentric gold dampener rings
    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.stroke();

    const domeGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45);
    domeGrad.addColorStop(0, '#f0d283');
    domeGrad.addColorStop(0.7, '#c8a24a');
    domeGrad.addColorStop(1, '#826524');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  // 5. Luxury Headphone Dust Scrim Fabric (L/R Indicator)
  function createScrimTexture(letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#181c20';
    ctx.fillRect(0, 0, 512, 512);

    // Fine acoustic mesh weave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Elegant serif letter
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 160px "Playfair Display", Georgia, serif';
    ctx.fillStyle = 'rgba(215, 185, 110, 0.55)';
    ctx.fillText(letter, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  // 6. Luxury Perfume / Radiance Elixir Front Gold Foil Label
  function createBottleLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Soft parchment backing with double gold border
    ctx.fillStyle = 'rgba(255, 252, 246, 0.96)';
    ctx.fillRect(20, 20, 472, 472);

    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 452, 452);

    ctx.strokeStyle = '#dfbf68';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 432, 432);

    // Label Typography
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f3d2e';
    ctx.font = '700 28px "Playfair Display", Georgia, serif';
    ctx.fillText('✦ LUMIÈRE ✦', 256, 120);

    ctx.fillStyle = '#8f6e25';
    ctx.font = '600 16px "Inter", sans-serif';
    ctx.fillText('20% STABILIZED VITAMIN C', 256, 160);

    ctx.fillStyle = '#1c1917';
    ctx.font = '500 20px "Playfair Display", Georgia, serif';
    ctx.fillText('Radiance Antioxidant Elixir', 256, 210);

    ctx.fillStyle = '#6b7280';
    ctx.font = '400 13px "Inter", sans-serif';
    ctx.fillText('Pure Hyaluronic Acid · Ferulic Complex', 256, 250);

    ctx.fillStyle = '#c8a24a';
    ctx.fillRect(180, 290, 152, 2);

    ctx.fillStyle = '#0f3d2e';
    ctx.font = '600 14px "Inter", sans-serif';
    ctx.fillText('30 ML / 1.0 FL. OZ.', 256, 340);

    ctx.fillStyle = '#8f6e25';
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillText('HAUTE APOTHECARY · PARIS / DHAKA', 256, 380);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  // -------------------------------------------------------------
  // HELPER GEOMETRIES: Curved Strap with Real Depth
  // -------------------------------------------------------------

  function createCurvedStrapBoxGeometry(width, length, thickness, isTop) {
    const segmentsY = 24;
    const geo = new THREE.BoxGeometry(width, length, thickness, 4, segmentsY, 1);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Normalized factor 0 at watch head to 1 at strap tip
      const t = isTop ? (y + length / 2) / length : (-y + length / 2) / length;
      // Gentle natural curvature backwards around the wrist
      const curveZ = -Math.pow(Math.max(0, t), 1.65) * 1.35;
      // Subtle width taper near the tongue
      const taper = t > 0.72 ? 1 - (t - 0.72) * 0.35 : 1;

      pos.setXYZ(i, x * taper, y, z + curveZ);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // -------------------------------------------------------------
  // MODEL BUILDERS (Procedural Three.js Geometries & PBR Materials)
  // -------------------------------------------------------------

  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch)
  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch Masterpiece)
  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch Masterpiece)
  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch Masterpiece)
  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch Masterpiece)
  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch Masterpiece)
  function buildWatchModel(envMap) {
    const master = new THREE.Group();
    master.name = 'watch_master';

    // Materials — Pure 18K Swiss Champagne Gold & Optical Sapphire
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5d77f,
      metalness: 0.98,
      roughness: 0.10,
      envMap: envMap,
      envMapIntensity: 2.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xeec96a,
      metalness: 0.92,
      roughness: 0.26,
      envMap: envMap,
      envMapIntensity: 1.6
    });

    const flutedGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfceda8,
      metalness: 0.98,
      roughness: 0.12,
      flatShading: true,
      envMap: envMap,
      envMapIntensity: 2.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03
    });

    // Optical Grade Sapphire Crystal (Crystal-clear, zero occlusion of dial)
    const sapphireGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      roughness: 0.0,
      metalness: 0.08,
      envMap: envMap,
      envMapIntensity: 3.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      depthWrite: false
    });

    const steelMat = new THREE.MeshPhysicalMaterial({
      color: 0xf3f4f6,
      metalness: 0.95,
      roughness: 0.14,
      envMap: envMap,
      envMapIntensity: 1.5
    });

    const bluedSteelMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      metalness: 0.96,
      roughness: 0.12,
      envMap: envMap,
      envMapIntensity: 2.2,
      clearcoat: 1.0
    });

    const rubyJewelMat = new THREE.MeshPhysicalMaterial({
      color: 0xd91438,
      transmission: 0.8,
      roughness: 0.08,
      ior: 1.76,
      emissive: 0x5a0010,
      emissiveIntensity: 0.5
    });

    const topStrapMat = new THREE.MeshStandardMaterial({
      map: createLeatherStrapTexture(true),
      roughness: 0.58,
      metalness: 0.10,
      envMap: envMap,
      envMapIntensity: 0.5
    });

    const bottomStrapMat = new THREE.MeshStandardMaterial({
      map: createLeatherStrapTexture(false),
      roughness: 0.58,
      metalness: 0.10,
      envMap: envMap,
      envMapIntensity: 0.5
    });

    // 1.1 Sapphire Crystal Dome (+Z front, seated FLUSH in the bezel)
    const crystalGroup = new THREE.Group();
    const crystalGeo = new THREE.CircleGeometry(2.05, 64);
    const crystalMesh = new THREE.Mesh(crystalGeo, sapphireGlassMat);
    crystalMesh.castShadow = false;
    crystalMesh.renderOrder = 10;
    crystalGroup.add(crystalMesh);
    crystalGroup.position.z = 0.16; // Tightly seated
    master.add(crystalGroup);

    // 1.2 Bezel Architecture: Coin-Fluted Bezel (90 sparkling micro-flutes) + Inner Polished Rim
    const bezelGroup = new THREE.Group();

    // 90 Flutes sparkling with flat shading (HOLLOW RING, openEnded = true!)
    const flutingGeo = new THREE.CylinderGeometry(2.08, 2.16, 0.08, 90, 1, true);
    const flutingMesh = new THREE.Mesh(flutingGeo, flutedGoldMat);
    flutingMesh.rotation.x = -Math.PI / 2;
    bezelGroup.add(flutingMesh);

    // Inner Polished Mirror Rim
    const innerRimGeo = new THREE.TorusGeometry(2.06, 0.045, 16, 64);
    const innerRim = new THREE.Mesh(innerRimGeo, goldMat);
    bezelGroup.add(innerRim);

    bezelGroup.position.z = 0.14; // Tightly seated on case
    master.add(bezelGroup);

    // 1.3 Faceted 3D Dauphine Hands with Central Spine Ridge & Blued Steel Needle Second Hand
    const handsGroup = new THREE.Group();

    function create3DDauphineHand(length, baseWidth, thickness) {
      const g = new THREE.Group();
      // Left facet (Polished Champagne Gold, bright face)
      const leftShape = new THREE.Shape();
      leftShape.moveTo(0, -baseWidth * 0.35);
      leftShape.lineTo(-baseWidth / 2, 0);
      leftShape.lineTo(0, length);
      leftShape.closePath();
      const leftGeo = new THREE.ExtrudeGeometry(leftShape, { depth: thickness, bevelEnabled: false });
      const leftMesh = new THREE.Mesh(leftGeo, goldMat);
      
      // Right facet (Brushed Gold, shaded facet for iconic Dauphine 3D central ridge)
      const rightShape = new THREE.Shape();
      rightShape.moveTo(0, -baseWidth * 0.35);
      rightShape.lineTo(baseWidth / 2, 0);
      rightShape.lineTo(0, length);
      rightShape.closePath();
      const rightGeo = new THREE.ExtrudeGeometry(rightShape, { depth: thickness, bevelEnabled: false });
      const rightMesh = new THREE.Mesh(rightGeo, brushedGoldMat);
      
      // Central spine ridge highlight
      const ridgeGeo = new THREE.BoxGeometry(0.015, length + baseWidth * 0.35, thickness * 1.2);
      const ridgeMesh = new THREE.Mesh(ridgeGeo, goldMat);
      ridgeMesh.position.set(0, (length - baseWidth * 0.35) / 2, thickness / 2);

      g.add(leftMesh, rightMesh, ridgeMesh);
      return g;
    }

    // Hour Hand (Pointing to 10:10 pose: ~10:08)
    const hourHand = create3DDauphineHand(1.18, 0.22, 0.035);
    hourHand.position.set(0, 0, 0.015);
    hourHand.rotation.z = Math.PI * 0.62;

    // Minute Hand (Pointing to 10:10 pose: ~02:08)
    const minuteHand = create3DDauphineHand(1.68, 0.18, 0.035);
    minuteHand.position.set(0, 0, 0.035);
    minuteHand.rotation.z = -Math.PI * 0.28;

    // Blued Steel Sweep Second Hand
    const secondHandGroup = new THREE.Group();
    const secondHandGeo = new THREE.BoxGeometry(0.024, 1.95, 0.025);
    const secondHand = new THREE.Mesh(secondHandGeo, bluedSteelMat);
    secondHand.position.set(0, 0.58, 0);

    const counterweightGeo = new THREE.TorusGeometry(0.09, 0.022, 12, 24);
    const counterweight = new THREE.Mesh(counterweightGeo, bluedSteelMat);
    counterweight.position.set(0, -0.32, 0);
    secondHandGroup.add(secondHand, counterweight);
    secondHandGroup.position.set(0, 0, 0.055);

    // Domed Pinion Center Cap
    const centerCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 32);
    const centerCap = new THREE.Mesh(centerCapGeo, goldMat);
    centerCap.rotation.x = -Math.PI / 2;
    centerCap.position.z = 0.065;

    handsGroup.add(hourHand, minuteHand, secondHandGroup, centerCap);
    handsGroup.position.z = 0.09; // Just above dial
    master.add(handsGroup);

    // 1.4 Sunburst Emerald Dial Plate (Fills the face with zero gaps)
    const dialGroup = new THREE.Group();

    // Sunburst Emerald Texture Face (High Horology Clearcoat Lacquer)
    const dialFaceGeo = new THREE.CircleGeometry(2.04, 96);
    const dialMat = new THREE.MeshPhysicalMaterial({
      map: createDialTexture(),
      roughness: 0.26,
      metalness: 0.10,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMap: envMap,
      envMapIntensity: 0.65
    });
    const dialFaceMesh = new THREE.Mesh(dialFaceGeo, dialMat);
    dialFaceMesh.position.z = 0.02;
    dialGroup.add(dialFaceMesh);

    // Rear disc for dial backplate
    const dialBackGeo = new THREE.CircleGeometry(2.04, 64);
    const dialBackMat = new THREE.MeshStandardMaterial({ color: 0x01140a, roughness: 0.4 });
    const dialBackMesh = new THREE.Mesh(dialBackGeo, dialBackMat);
    dialBackMesh.rotation.y = Math.PI;
    dialBackMesh.position.z = -0.01;
    dialGroup.add(dialBackMesh);

    dialGroup.position.z = 0.05; // Seated inside case
    master.add(dialGroup);

    // 1.5 Calibre Mechanical Movement (Rear -Z)
    const movementGroup = new THREE.Group();
    const plateGeo = new THREE.CylinderGeometry(1.96, 1.96, 0.08, 48);
    const plateMesh = new THREE.Mesh(plateGeo, steelMat);
    plateMesh.rotation.x = -Math.PI / 2;
    movementGroup.add(plateMesh);

    // Brass Balance Wheel & Escapement
    const balanceWheelGeo = new THREE.TorusGeometry(0.48, 0.035, 16, 40);
    const balanceWheel = new THREE.Mesh(balanceWheelGeo, goldMat);
    balanceWheel.position.set(-0.65, 0.45, -0.05);
    movementGroup.add(balanceWheel);

    // Brass Gears
    const gear1Geo = new THREE.CylinderGeometry(0.38, 0.38, 0.035, 28);
    const gear1 = new THREE.Mesh(gear1Geo, brushedGoldMat);
    gear1.rotation.x = -Math.PI / 2;
    gear1.position.set(0.4, 0.3, -0.05);
    movementGroup.add(gear1);

    // Ruby Bearing Jewels
    for (let j = 0; j < 5; j++) {
      const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), rubyJewelMat);
      jewel.rotation.x = -Math.PI / 2;
      jewel.position.set(Math.cos(j * 1.25) * 0.85, Math.sin(j * 1.25) * 0.85, -0.06);
      movementGroup.add(jewel);
    }
    movementGroup.position.z = -0.06;
    master.add(movementGroup);

    // 1.6 Oscillating Geneva Rotor (Rear Side)
    const rotorGroup = new THREE.Group();
    const rotorShape = new THREE.Shape();
    rotorShape.absarc(0, 0, 1.84, 0, Math.PI, false);
    rotorShape.lineTo(0, 0);
    const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02
    });
    const rotorMat = new THREE.MeshStandardMaterial({
      map: createGenevaStripesTexture(),
      roughness: 0.25,
      metalness: 0.90,
      envMap: envMap
    });
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    rotorGroup.add(rotorMesh);
    rotorGroup.position.z = -0.10;
    master.add(rotorGroup);

    // 1.7 Solid Champagne Gold Case, Sculpted Downward Lugs, Winding Crown
    const caseGroup = new THREE.Group();

    // Solid case body ring (openEnded = true so top lid does not occlude dial)
    const caseGeo = new THREE.CylinderGeometry(2.20, 2.20, 0.32, 64, 1, true);
    const caseMesh = new THREE.Mesh(caseGeo, goldMat);
    caseMesh.rotation.x = -Math.PI / 2;
    caseGroup.add(caseMesh);

    // Rear exhibition rim
    const backplateGeo = new THREE.CircleGeometry(2.18, 64);
    const backplateMesh = new THREE.Mesh(backplateGeo, brushedGoldMat);
    backplateMesh.rotation.y = Math.PI;
    backplateMesh.position.z = -0.16;
    caseGroup.add(backplateMesh);

    // 4 Sculpted Downward-Curved Lugs with Polished Chamfers
    function createSculptedLug(xSign, ySign) {
      const lugG = new THREE.Group();
      const lugGeo = new THREE.BoxGeometry(0.24, 0.88, 0.28);
      const lug = new THREE.Mesh(lugGeo, goldMat);
      lug.position.set(xSign * 1.05, ySign * 2.12, -0.06);
      lug.rotation.x = -ySign * 0.28;
      lugG.add(lug);
      return lugG;
    }

    caseGroup.add(createSculptedLug(1, 1));
    caseGroup.add(createSculptedLug(-1, 1));
    caseGroup.add(createSculptedLug(1, -1));
    caseGroup.add(createSculptedLug(-1, -1));

    // Spring Bars
    const springBarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.86, 16), steelMat);
    springBarTop.rotation.z = Math.PI / 2;
    springBarTop.position.set(0, 1.95, -0.05);

    const springBarBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.86, 16), steelMat);
    springBarBottom.rotation.z = Math.PI / 2;
    springBarBottom.position.set(0, -1.95, -0.05);
    caseGroup.add(springBarTop, springBarBottom);

    // Knurled Winding Crown at 3 o'clock with Polished Emerald Cabochon
    const crownGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.35, 32);
    const crownMesh = new THREE.Mesh(crownGeo, brushedGoldMat);
    crownMesh.rotation.z = Math.PI / 2;
    crownMesh.position.set(2.36, 0, 0);

    const cabochon = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x073b2c, roughness: 0.05, clearcoat: 1.0, envMap: envMap })
    );
    cabochon.position.set(2.54, 0, 0);
    caseGroup.add(crownMesh, cabochon);
    caseGroup.position.z = 0;
    master.add(caseGroup);

    // 1.8 Caseback Ring
    const casebackGroup = new THREE.Group();
    const casebackGeo = new THREE.TorusGeometry(2.10, 0.10, 20, 64);
    const casebackMesh = new THREE.Mesh(casebackGeo, goldMat);
    casebackGroup.add(casebackMesh);
    casebackGroup.position.z = -0.16;
    master.add(casebackGroup);

    // 1.9 Curved Stitched Italian Leather Straps & Tang Buckle
    const strapTopGroup = new THREE.Group();
    const strapTopGeo = createCurvedStrapBoxGeometry(1.74, 3.2, 0.12, true);
    const strapTop = new THREE.Mesh(strapTopGeo, topStrapMat);
    strapTop.position.set(0, 3.3, 0);
    strapTopGroup.add(strapTop);
    master.add(strapTopGroup);

    const strapBottomGroup = new THREE.Group();
    const strapBottomGeo = createCurvedStrapBoxGeometry(1.74, 3.5, 0.12, false);
    const strapBottom = new THREE.Mesh(strapBottomGeo, bottomStrapMat);
    strapBottom.position.set(0, -3.5, 0);
    strapBottomGroup.add(strapBottom);

    // Fitted Leather Keeper Loops
    const keeperGeo = new THREE.TorusGeometry(0.92, 0.055, 12, 32);
    const keeper1 = new THREE.Mesh(keeperGeo, bottomStrapMat);
    keeper1.scale.set(1.0, 0.25, 1.0);
    keeper1.position.set(0, -2.5, -0.12);

    const keeper2 = new THREE.Mesh(keeperGeo, bottomStrapMat);
    keeper2.scale.set(1.0, 0.25, 1.0);
    keeper2.position.set(0, -3.0, -0.28);
    strapBottomGroup.add(keeper1, keeper2);

    // Polished Champagne Gold Tang Buckle
    const buckleFrameGeo = new THREE.TorusGeometry(0.96, 0.08, 16, 32);
    const buckleFrame = new THREE.Mesh(buckleFrameGeo, goldMat);
    buckleFrame.scale.set(1.05, 0.35, 1.0);
    buckleFrame.position.set(0, -5.1, -1.1);

    const bucklePinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 16);
    const bucklePin = new THREE.Mesh(bucklePinGeo, goldMat);
    bucklePin.position.set(0, -5.1, -1.08);
    strapBottomGroup.add(buckleFrame, bucklePin);
    master.add(strapBottomGroup);

    watchParts = {
      crystalGroup,
      bezelGroup,
      handsGroup,
      dialGroup,
      movementGroup,
      rotorGroup,
      caseGroup,
      casebackGroup,
      strapTopGroup,
      strapBottomGroup,
      secondHand: secondHandGroup,
      balanceWheel,
      rotorMesh
    };

    master.scale.set(0.66, 0.66, 0.66);
    return master;
  }

  // 2. Premium Headphones (ID: 4 — Aura Pro Studio Wireless Headphones)
  function buildHeadphonesModel(envMap) {
    const master = new THREE.Group();
    master.name = 'headphones_master';

    // Materials
    const matteObsidianMat = new THREE.MeshPhysicalMaterial({
      color: 0x14181a,
      metalness: 0.40,
      roughness: 0.25,
      envMap: envMap,
      envMapIntensity: 1.2,
      clearcoat: 0.5
    });

    const champagneGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfbf68,
      metalness: 0.95,
      roughness: 0.16,
      envMap: envMap,
      envMapIntensity: 1.6,
      clearcoat: 0.7
    });

    const brushedPlatinumMat = new THREE.MeshStandardMaterial({
      color: 0xd6dbe1,
      metalness: 0.92,
      roughness: 0.22,
      envMap: envMap
    });

    const cushionLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x181c20,
      roughness: 0.68,
      metalness: 0.08
    });

    const driverMeshMat = new THREE.MeshStandardMaterial({
      map: createSpeakerGrilleTexture(),
      roughness: 0.28,
      metalness: 0.85,
      envMap: envMap
    });

    // 2.1 Arched Spring-Steel Headband with Ribbed Leather Underside
    const headbandGroup = new THREE.Group();
    const bandCurveGeo = new THREE.TorusGeometry(2.35, 0.16, 24, 60, Math.PI);
    const bandMesh = new THREE.Mesh(bandCurveGeo, brushedPlatinumMat);
    headbandGroup.add(bandMesh);

    // Segmented ergonomic leather underside cushion
    const cushionCurveGeo = new THREE.TorusGeometry(2.22, 0.15, 18, 50, Math.PI * 0.75);
    const cushionMesh = new THREE.Mesh(cushionCurveGeo, cushionLeatherMat);
    cushionMesh.rotation.z = Math.PI * 0.125;
    headbandGroup.add(cushionMesh);
    master.add(headbandGroup);

    // 2.2 Telescoping Slider Yokes with Measurement Notches
    const leftYokeGroup = new THREE.Group();
    const rightYokeGroup = new THREE.Group();

    function createYoke() {
      const yokeG = new THREE.Group();
      // Telescoping extension arm connecting headband to fork
      const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.12);
      const armMesh = new THREE.Mesh(armGeo, champagneGoldMat);
      armMesh.position.y = -0.2;

      // Downward U-fork cradling the acoustic cup in the YZ plane
      const forkCurve = new THREE.TorusGeometry(1.22, 0.07, 16, 36, Math.PI);
      const forkMesh = new THREE.Mesh(forkCurve, champagneGoldMat);
      forkMesh.rotation.set(0, Math.PI / 2, 0);
      forkMesh.position.set(0, -1.10, 0);

      // Pivot pins on front and rear prongs entering the acoustic shell
      const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16);
      const pinFront = new THREE.Mesh(pinGeo, brushedPlatinumMat);
      pinFront.rotation.x = Math.PI / 2;
      pinFront.position.set(0, -1.10, 1.22);

      const pinRear = new THREE.Mesh(pinGeo, brushedPlatinumMat);
      pinRear.rotation.x = Math.PI / 2;
      pinRear.position.set(0, -1.10, -1.22);

      yokeG.add(armMesh, forkMesh, pinFront, pinRear);
      return yokeG;
    }

    const leftYoke = createYoke();
    leftYoke.position.set(0, 0, 0);
    leftYokeGroup.position.set(-2.35, 0, 0);
    leftYokeGroup.add(leftYoke);

    const rightYoke = createYoke();
    rightYoke.position.set(0, 0, 0);
    rightYokeGroup.position.set(2.35, 0, 0);
    rightYokeGroup.add(rightYoke);

    master.add(leftYokeGroup, rightYokeGroup);

    // 2.3 Ergonomic Outer Acoustic Ear Cups (Left & Right)
    const leftShellGroup = new THREE.Group();
    const rightShellGroup = new THREE.Group();

    function createAcousticCup(isRight) {
      const cupG = new THREE.Group();
      // Outer acoustic chamber
      const domeGeo = new THREE.CylinderGeometry(1.14, 1.20, 0.48, 48);
      const dome = new THREE.Mesh(domeGeo, matteObsidianMat);
      dome.rotation.z = Math.PI / 2;

      // Diamond-cut champagne gold chamfer ring
      const rimGeo = new THREE.TorusGeometry(1.20, 0.06, 16, 48);
      const rim = new THREE.Mesh(rimGeo, champagneGoldMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = -0.16;

      // Concentric spun-aluminum medallion
      const logoGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.06, 32);
      const logo = new THREE.Mesh(logoGeo, champagneGoldMat);
      logo.rotation.z = Math.PI / 2;
      logo.position.x = -0.26;

      // Physical controls on the right ear cup
      if (isRight) {
        // Rotary volume dial
        const dialGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20);
        const dial = new THREE.Mesh(dialGeo, champagneGoldMat);
        dial.position.set(-0.10, -1.05, 0.45);
        dial.rotation.x = Math.PI / 4;

        // USB-C fast charging port
        const portGeo = new THREE.BoxGeometry(0.08, 0.06, 0.18);
        const port = new THREE.Mesh(portGeo, brushedPlatinumMat);
        port.position.set(0, -1.15, 0);
        cupG.add(dial, port);
      }

      cupG.add(dome, rim, logo);
      return cupG;
    }

    const leftShell = createAcousticCup(false);
    leftShellGroup.position.set(-2.45, -1.1, 0);
    leftShellGroup.add(leftShell);

    const rightShell = createAcousticCup(true);
    rightShell.rotation.y = Math.PI;
    rightShellGroup.position.set(2.45, -1.1, 0);
    rightShellGroup.add(rightShell);

    master.add(leftShellGroup, rightShellGroup);

    // 2.4 Titanium Acoustic Drivers (Left & Right)
    const leftDriverGroup = new THREE.Group();
    const rightDriverGroup = new THREE.Group();

    function createDriver() {
      const driverG = new THREE.Group();
      const discGeo = new THREE.CylinderGeometry(1.06, 1.06, 0.05, 48);
      const disc = new THREE.Mesh(discGeo, driverMeshMat);
      disc.rotation.z = Math.PI / 2;

      const magnetGeo = new THREE.CylinderGeometry(0.50, 0.50, 0.12, 32);
      const magnet = new THREE.Mesh(magnetGeo, champagneGoldMat);
      magnet.rotation.z = Math.PI / 2;

      driverG.add(disc, magnet);
      return driverG;
    }

    const leftDriver = createDriver();
    leftDriverGroup.position.set(-2.15, -1.1, 0);
    leftDriverGroup.add(leftDriver);

    const rightDriver = createDriver();
    rightDriver.rotation.y = Math.PI;
    rightDriverGroup.position.set(2.15, -1.1, 0);
    rightDriverGroup.add(rightDriver);

    master.add(leftDriverGroup, rightDriverGroup);

    // 2.5 Memory Foam Ear Cushions with Fabric Dust Scrim (L/R)
    const leftCushionGroup = new THREE.Group();
    const rightCushionGroup = new THREE.Group();

    function createCushion(letter) {
      const cushionG = new THREE.Group();
      // Plump memory foam ring
      const cushionGeo = new THREE.TorusGeometry(1.10, 0.34, 24, 48);
      const cushion = new THREE.Mesh(cushionGeo, cushionLeatherMat);
      cushion.rotation.y = Math.PI / 2;

      // Inner fabric dust scrim with L/R indicator
      const scrimGeo = new THREE.CircleGeometry(0.85, 32);
      const scrimMat = new THREE.MeshStandardMaterial({
        map: createScrimTexture(letter),
        roughness: 0.85,
        metalness: 0.05
      });
      const scrim = new THREE.Mesh(scrimGeo, scrimMat);
      scrim.rotation.y = Math.PI / 2;
      scrim.position.x = -0.05;

      cushionG.add(cushion, scrim);
      return cushionG;
    }

    const leftCushion = createCushion('L');
    leftCushionGroup.position.set(-1.85, -1.1, 0);
    leftCushionGroup.add(leftCushion);

    const rightCushion = createCushion('R');
    rightCushion.rotation.y = Math.PI;
    rightCushionGroup.position.set(1.85, -1.1, 0);
    rightCushionGroup.add(rightCushion);

    master.add(leftCushionGroup, rightCushionGroup);

    headphonesParts = {
      headbandGroup,
      leftYokeGroup,
      rightYokeGroup,
      leftShellGroup,
      rightShellGroup,
      leftDriverGroup,
      rightDriverGroup,
      leftCushionGroup,
      rightCushionGroup
    };

    master.scale.set(0.74, 0.74, 0.74);
    master.position.y = 0.4;
    return master;
  }

  // 3. Luxury Perfume / Radiance Elixir Bottle (ID: 8 — Lumière 20% Vitamin C Radiance Serum)
  function buildPerfumeModel(envMap) {
    const master = new THREE.Group();
    master.name = 'perfume_master';

    // Materials
    const heavyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xb45309, // Rich warm amber apothecary glass
      transmission: 0.65,
      opacity: 0.95,
      transparent: true,
      roughness: 0.04,
      ior: 1.54,
      envMap: envMap,
      envMapIntensity: 2.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04
    });

    const solidBaseGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x92400e, // Heavy amber crystal base
      transmission: 0.70,
      opacity: 0.95,
      transparent: true,
      roughness: 0.03,
      ior: 1.56,
      envMap: envMap,
      envMapIntensity: 2.4,
      clearcoat: 1.0
    });

    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b, // Luminous golden Vitamin C Serum
      transmission: 0.50,
      opacity: 0.95,
      transparent: true,
      roughness: 0.08,
      ior: 1.38,
      emissive: 0x78350f,
      emissiveIntensity: 0.5,
      envMap: envMap,
      envMapIntensity: 1.5
    });

    const champagneGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfbf68,
      metalness: 0.96,
      roughness: 0.14,
      envMap: envMap,
      envMapIntensity: 1.8,
      clearcoat: 0.8
    });

    const siliconeBulbMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.75,
      metalness: 0.05
    });

    const pipetteGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.98,
      transparent: true,
      roughness: 0.02,
      ior: 1.48,
      envMap: envMap
    });

    // 3.1 Heavy Glass Bottle Body
    const bottleBodyGroup = new THREE.Group();

    // Cylindrical heavy-walled vessel with beveled shoulder
    const bodyGeo = new THREE.CylinderGeometry(1.45, 1.45, 3.2, 48);
    const bodyMesh = new THREE.Mesh(bodyGeo, heavyGlassMat);
    bottleBodyGroup.add(bodyMesh);

    // Beveled curved shoulder
    const shoulderGeo = new THREE.CylinderGeometry(0.75, 1.45, 0.6, 48);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, heavyGlassMat);
    shoulderMesh.position.y = 1.9;
    bottleBodyGroup.add(shoulderMesh);

    // Glass Neck
    const neckGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.7, 36);
    const neckMesh = new THREE.Mesh(neckGeo, heavyGlassMat);
    neckMesh.position.y = 2.5;
    bottleBodyGroup.add(neckMesh);

    // Extra-Thick Solid Crystal Glass Base (Distinctive sign of luxury apothecary flacons)
    const baseGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.65, 48);
    const baseMesh = new THREE.Mesh(baseGeo, solidBaseGlassMat);
    baseMesh.position.y = -1.65;
    bottleBodyGroup.add(baseMesh);

    // 3.2 Internal Radiant Liquid Fluid Core
    const liquidGeo = new THREE.CylinderGeometry(1.22, 1.22, 2.5, 36);
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = -0.1;
    bottleBodyGroup.add(liquidMesh);

    // 3.3 Gold Foil Parchment Front Label (Centered facing forward +Z)
    const labelGeo = new THREE.CylinderGeometry(1.465, 1.465, 1.8, 48, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
    const labelMat = new THREE.MeshStandardMaterial({
      map: createBottleLabelTexture(),
      roughness: 0.35,
      metalness: 0.45,
      envMap: envMap,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = -0.15;
    labelMesh.rotation.y = 0;
    bottleBodyGroup.add(labelMesh);

    bottleBodyGroup.position.y = -0.2;
    master.add(bottleBodyGroup);

    // 3.4 Threaded Knurled Gold Collar Ring
    const collarGroup = new THREE.Group();
    const collarGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.65, 36);
    const collarMesh = new THREE.Mesh(collarGeo, champagneGoldMat);
    collarMesh.position.y = 0;

    // Precision knurled grip rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.04, 16, 36), champagneGoldMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.18;

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.04, 16, 36), champagneGoldMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -0.18;

    collarGroup.add(collarMesh, ring1, ring2);
    collarGroup.position.y = 2.65;
    master.add(collarGroup);

    // 3.5 Dispenser Dropper: Glass Pipette & Silicone Bulb
    const dropperGroup = new THREE.Group();

    // Borosilicate Glass Pipette Tube running inside the liquid
    const pipetteGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 24);
    const pipetteMesh = new THREE.Mesh(pipetteGeo, pipetteGlassMat);
    pipetteMesh.position.y = -1.2;

    // Tapered pipette dispensing nozzle
    const nozzleGeo = new THREE.ConeGeometry(0.12, 0.35, 24);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, pipetteGlassMat);
    nozzleMesh.rotation.x = Math.PI;
    nozzleMesh.position.y = -3.55;

    // Suspended serum droplet at the tip
    const dropGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const dropMesh = new THREE.Mesh(dropGeo, liquidMat);
    dropMesh.position.y = -3.75;

    // Soft-touch matte silicone dropper bulb (sitting flush on gold collar)
    const bulbGeo = new THREE.CylinderGeometry(0.48, 0.58, 1.0, 32);
    const bulbMesh = new THREE.Mesh(bulbGeo, siliconeBulbMat);
    bulbMesh.position.y = 0.85;

    const bulbCapGeo = new THREE.SphereGeometry(0.48, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bulbCap = new THREE.Mesh(bulbCapGeo, siliconeBulbMat);
    bulbCap.position.y = 1.35;

    dropperGroup.add(pipetteMesh, nozzleMesh, dropMesh, bulbMesh, bulbCap);
    dropperGroup.position.y = 2.65;
    master.add(dropperGroup);

    perfumeParts = {
      bottleBodyGroup,
      collarGroup,
      dropperGroup
    };

    master.scale.set(0.72, 0.72, 0.72);
    master.position.y = -0.85;
    return master;
  }

  // -------------------------------------------------------------
  // THREE.JS SCENE, LIGHTS & RENDERER SETUP
  // -------------------------------------------------------------

  function initThreeScene(container) {
    canvasContainer = container;
    canvasContainer.innerHTML = '';

    const width = canvasContainer.clientWidth || 560;
    const height = canvasContainer.clientHeight || 520;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, cameraDistance);

    // Canvas Element
    canvasElement = document.createElement('canvas');
    canvasElement.className = 'atelier-canvas w-full h-full block cursor-grab active:cursor-grabbing select-none';
    canvasContainer.appendChild(canvasElement);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Procedural Studio Environment Map
    studioEnvMap = createStudioEnvironment(renderer);
    scene.environment = studioEnvMap;

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    keyLight = new THREE.DirectionalLight(0xfff8ee, 1.85);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    fillLight = new THREE.DirectionalLight(0xddeeff, 0.75);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    goldRimLight = new THREE.PointLight(0xe6c875, 2.5, 20);
    goldRimLight.position.set(3, -2, -4);
    scene.add(goldRimLight);

    const glintLight = new THREE.PointLight(0xffffff, 0.8, 15);
    glintLight.position.set(1.5, 2.5, 5.0);
    scene.add(glintLight);

    bottleLight = new THREE.PointLight(0xffb03a, 0, 15);
    bottleLight.position.set(0, 2, 3);
    scene.add(bottleLight);

    // Soft Studio Ground Reflection Disc
    const groundGeo = new THREE.CircleGeometry(6, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050e0a,
      roughness: 0.45,
      metalness: 0.4,
      transparent: true,
      opacity: 0.35
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -3.8;
    scene.add(groundMesh);

    // Build the 3 Procedural Models
    models.watch = buildWatchModel(studioEnvMap);
    models.headphones = buildHeadphonesModel(studioEnvMap);
    models.perfume = buildPerfumeModel(studioEnvMap);
    window.__watchParts = watchParts;
    window.__models = models;

    scene.add(models.watch);
    scene.add(models.headphones);
    scene.add(models.perfume);

    // Show initial active model
    updateVisibleModel();

    // Event Listeners
    setupInteractionEvents();
    setupScrollTrigger();
    setupResizeObserver();

    // Start Animation Loop
    animate();
  }

  // Set active model visibility and scale
  function updateVisibleModel() {
    Object.keys(models).forEach((key) => {
      const m = models[key];
      if (!m) return;
      if (key === activeModelKey) {
        m.visible = true;
        const targetScale = key === 'watch' ? 0.66 : key === 'headphones' ? 0.74 : 0.72;
        targetCameraDistance = key === 'watch' ? 8.2 : key === 'headphones' ? 7.8 : 7.5;
        if (window.gsap) {
          window.gsap.to(m.scale, {
            x: targetScale,
            y: targetScale,
            z: targetScale,
            duration: 0.6,
            ease: 'power2.out'
          });
        } else {
          m.scale.set(targetScale, targetScale, targetScale);
        }
      } else {
        m.visible = false;
      }
    });

    // Reset rotation & explode states on model change
    targetRotation = { x: 0.18, y: -0.22 };
    if (isExploded) {
      isExploded = false;
      updateComponentExplosion(0);
    }
    if (bottleLight) bottleLight.intensity = (activeModelKey === 'perfume') ? 2.4 : 0;
    updateExplodeButtonUI();
    renderProductSpecsCard();
  }

  // -------------------------------------------------------------
  // EXPLODED VIEW COMPONENT ANIMATION
  // -------------------------------------------------------------

  function updateComponentExplosion(progress) {
    explodeProgress = progress;

    // 1. Watch Component Separation (Starts 100% flush at progress 0, expands smoothly on demand)
    if (watchParts.crystalGroup) {
      watchParts.crystalGroup.position.z = 0.16 + progress * 2.2;
      watchParts.bezelGroup.position.z = 0.14 + progress * 1.5;
      watchParts.handsGroup.position.z = 0.09 + progress * 0.9;
      watchParts.dialGroup.position.z = 0.05 + progress * 0.4;
      watchParts.movementGroup.position.z = -0.06 - progress * 1.0;
      watchParts.rotorGroup.position.z = -0.10 - progress * 1.6;
      watchParts.casebackGroup.position.z = -0.16 - progress * 2.2;
      watchParts.strapTopGroup.position.y = 3.3 + progress * 0.85;
      watchParts.strapBottomGroup.position.y = -3.5 - progress * 0.85;
    }

    // 2. Headphones Component Separation
    if (headphonesParts.headbandGroup) {
      headphonesParts.headbandGroup.position.y = progress * 1.4;
      headphonesParts.leftYokeGroup.position.x = -2.35 - progress * 0.8;
      headphonesParts.rightYokeGroup.position.x = 2.35 + progress * 0.8;
      headphonesParts.leftShellGroup.position.x = -2.45 - progress * 1.5;
      headphonesParts.leftShellGroup.position.z = -progress * 0.6;
      headphonesParts.rightShellGroup.position.x = 2.45 + progress * 1.5;
      headphonesParts.rightShellGroup.position.z = -progress * 0.6;
      headphonesParts.leftDriverGroup.position.x = -2.15 - progress * 0.6;
      headphonesParts.leftDriverGroup.position.z = progress * 0.6;
      headphonesParts.rightDriverGroup.position.x = 2.15 + progress * 0.6;
      headphonesParts.rightDriverGroup.position.z = progress * 0.6;
      headphonesParts.leftCushionGroup.position.x = -1.85 + progress * 0.4;
      headphonesParts.leftCushionGroup.position.z = progress * 1.2;
      headphonesParts.rightCushionGroup.position.x = 1.85 - progress * 0.4;
      headphonesParts.rightCushionGroup.position.z = progress * 1.2;
    }

    // 3. Perfume Bottle Separation & Elevation
    if (perfumeParts.dropperGroup) {
      perfumeParts.dropperGroup.position.y = 2.65 + progress * 2.4;
      perfumeParts.collarGroup.position.y = 2.65 + progress * 0.95;
      if (bottleLight) {
        bottleLight.intensity = 2.4 + progress * 2.5;
      }
    }
  }

  function toggleExplode() {
    isExploded = !isExploded;
    const target = isExploded ? 1 : 0;

    if (window.gsap) {
      window.gsap.to({ val: explodeProgress }, {
        val: target,
        duration: 1.1,
        ease: 'power3.out',
        onUpdate: function () {
          updateComponentExplosion(this.targets()[0].val);
        }
      });
    } else {
      updateComponentExplosion(target);
    }

    updateExplodeButtonUI();
  }

  function updateExplodeButtonUI() {
    const btn = document.getElementById('atelier-explode-btn');
    if (!btn) return;
    if (isExploded) {
      btn.innerHTML = `
        <span class="text-gold">✦</span>
        <span>Assemble Components</span>
      `;
      btn.classList.add('!bg-gold', '!text-stone-900');
    } else {
      btn.innerHTML = `
        <span class="text-gold">✦</span>
        <span>Explode 3D Components</span>
      `;
      btn.classList.remove('!bg-gold', '!text-stone-900');
    }
  }

  // -------------------------------------------------------------
  // USER POINTER INTERACTION (DRAG & TILT & ZOOM)
  // -------------------------------------------------------------

  function setupInteractionEvents() {
    if (!canvasElement) return;

    // Mouse Drag
    canvasElement.addEventListener('mousedown', (e) => {
      isInteracting = true;
      previousPointer = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isInteracting) return;
      const deltaX = e.clientX - previousPointer.x;
      const deltaY = e.clientY - previousPointer.y;

      targetRotation.y += deltaX * 0.008;
      targetRotation.x = Math.max(-0.6, Math.min(0.6, targetRotation.x + deltaY * 0.008));

      previousPointer = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isInteracting = false;
    });

    // Touch Drag with Mobile Scrolling Preservation
    let touchStartX = 0;
    let touchStartY = 0;
    let isHorizontalSwipe = false;

    canvasElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        previousPointer = { x: touchStartX, y: touchStartY };
        isHorizontalSwipe = false;
        isInteracting = true;
      }
    }, { passive: true });

    canvasElement.addEventListener('touchmove', (e) => {
      if (!isInteracting || e.touches.length !== 1) return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const deltaX = curX - previousPointer.x;
      const deltaY = curY - previousPointer.y;

      if (!isHorizontalSwipe && Math.abs(deltaX) > Math.abs(deltaY) + 4) {
        isHorizontalSwipe = true;
      }

      if (isHorizontalSwipe) {
        targetRotation.y += deltaX * 0.012;
        targetRotation.x = Math.max(-0.5, Math.min(0.5, targetRotation.x + deltaY * 0.012));
      }

      previousPointer = { x: curX, y: curY };
    }, { passive: true });

    canvasElement.addEventListener('touchend', () => {
      isInteracting = false;
      isHorizontalSwipe = false;
    });

    // Mouse Wheel Zoom
    canvasContainer.addEventListener('wheel', (e) => {
      if (e.shiftKey || e.ctrlKey) {
        e.preventDefault();
        targetCameraDistance = Math.max(5.2, Math.min(11.5, targetCameraDistance + e.deltaY * 0.005));
      }
    }, { passive: false });
  }

  function zoom(direction) {
    if (direction === 'in') {
      targetCameraDistance = Math.max(5.2, targetCameraDistance - 0.8);
    } else if (direction === 'out') {
      targetCameraDistance = Math.min(11.5, targetCameraDistance + 0.8);
    }
  }

  function resetView() {
    targetRotation = { x: 0.18, y: -0.22 };
    targetCameraDistance = activeModelKey === 'watch' ? 8.2 : activeModelKey === 'headphones' ? 7.8 : 7.5;
    if (isExploded) toggleExplode();
  }

  // -------------------------------------------------------------
  // GSAP SCROLLTRIGGER (Smooth Scroll-Responsive 3D Scrubbing)
  // -------------------------------------------------------------

  function setupScrollTrigger() {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);

    const section = document.getElementById('interactive-atelier-3d');
    if (!section) return;

    if (scrollTimeline) {
      scrollTimeline.kill();
    }

    // Seamless, non-blocking scroll scrub that responds to both down and up scroll
    scrollTimeline = window.gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2,
        onUpdate: (self) => {
          scrollRotationDelta = (self.progress - 0.5) * Math.PI * 1.4;
        }
      }
    });
  }

  // -------------------------------------------------------------
  // RESIZE & VISIBILITY HANDLING
  // -------------------------------------------------------------

  function setupResizeObserver() {
    if (!canvasContainer || !window.ResizeObserver) return;

    const ro = new ResizeObserver(() => {
      if (!canvasContainer || !renderer || !camera) return;
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    ro.observe(canvasContainer);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    io.observe(canvasContainer);
  }

  // -------------------------------------------------------------
  // MAIN ANIMATION LOOP
  // -------------------------------------------------------------

  let clock = new THREE.Clock ? new THREE.Clock() : { getElapsedTime: () => Date.now() * 0.001 };

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (!isVisible || !renderer || !scene || !camera) return;

    const elapsedTime = clock.getElapsedTime ? clock.getElapsedTime() : Date.now() * 0.001;

    // Smooth lerp user pointer rotations
    modelRotation.x += (targetRotation.x - modelRotation.x) * 0.08;
    modelRotation.y += (targetRotation.y - modelRotation.y) * 0.08;

    // Smooth lerp camera distance zoom
    cameraDistance += (targetCameraDistance - cameraDistance) * 0.1;
    camera.position.z = cameraDistance;

    // Apply combined rotation to active model
    const activeModel = models[activeModelKey];
    if (activeModel) {
      activeModel.rotation.x = modelRotation.x;
      activeModel.rotation.y = modelRotation.y + scrollRotationDelta;

      // Subtle resting float
      if (!isInteracting) {
        const baseOffsetY = activeModelKey === 'headphones' ? 0.4 : activeModelKey === 'perfume' ? -0.85 : 0;
        activeModel.position.y = baseOffsetY + Math.sin(elapsedTime * 1.5) * 0.05;
      }
    }

    // Watch Mechanical Micro-Animations
    if (activeModelKey === 'watch') {
      if (watchParts.secondHand) {
        watchParts.secondHand.rotation.z = -elapsedTime * 1.05;
      }
      if (watchParts.balanceWheel) {
        watchParts.balanceWheel.rotation.z = Math.sin(elapsedTime * 18) * 0.65;
      }
      if (watchParts.rotorMesh) {
        watchParts.rotorMesh.rotation.z = Math.sin(elapsedTime * 0.8) * 0.45;
      }
    }

    // Perfume Radiance Caustic Lighting Orbit
    if (activeModelKey === 'perfume' && bottleLight) {
      bottleLight.position.x = Math.sin(elapsedTime * 1.8) * 3;
      bottleLight.position.z = Math.cos(elapsedTime * 1.8) * 3;
    }

    renderer.render(scene, camera);
  }

  // -------------------------------------------------------------
  // ACCESSIBLE NON-WEBGL FALLBACK & PRODUCT DETAILS UI
  // -------------------------------------------------------------

  function renderProductSpecsCard() {
    const cardEl = document.getElementById('atelier-specs-card');
    if (!cardEl) return;

    const data = SHOWCASE_PRODUCTS[activeModelKey];
    if (!data) return;

    const priceFormatted = (data.price != null && !isNaN(data.price)) ? '৳' + Number(data.price).toLocaleString('en-IN') : '৳—';
    const regularFormatted = (data.onSale && data.regularPrice != null && !isNaN(data.regularPrice)) ? '৳' + Number(data.regularPrice).toLocaleString('en-IN') : '';
    const discountAmount = (data.onSale && data.regularPrice != null && data.price != null && !isNaN(data.regularPrice - data.price)) ? '৳' + Number(data.regularPrice - data.price).toLocaleString('en-IN') : '';

    cardEl.innerHTML = `
      <div class="space-y-6">
        <div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold/15 text-gold border border-gold/30 tracking-wider uppercase">
            ${data.badge}
          </span>
          <h3 class="font-serif text-3xl font-bold text-white mt-3 leading-snug">
            ${data.title}
          </h3>
          <p class="text-sm text-stone-300 mt-2 leading-relaxed font-light">
            ${data.tagline}
          </p>
        </div>

        <!-- Pricing & Stock -->
        <div class="flex flex-wrap items-baseline gap-3 pb-3 border-b border-white/10">
          <span class="font-serif text-3xl font-bold text-gold tracking-tight">${priceFormatted}</span>
          ${data.onSale ? `<span class="text-base text-stone-400 line-through">${regularFormatted}</span>` : ''}
          ${data.onSale ? `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">Save ${discountAmount}</span>` : ''}
          <span class="text-xs text-emerald-400 font-medium ml-auto flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ${data.stock} In Stock
          </span>
        </div>

        <!-- Four Key Engineering Specifications (Verified from Database) -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          ${data.specs.map(s => `
            <div class="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gold/30 transition-colors">
              <span class="text-stone-400 uppercase tracking-wider block text-[10px] mb-1 font-mono">${s.label}</span>
              <span class="text-stone-100 font-medium leading-snug">${s.val}</span>
            </div>
          `).join('')}
        </div>

        <!-- Interactive 3D Component Architecture Tags -->
        <div class="space-y-2 pt-1">
          <span class="text-[11px] font-mono tracking-widest text-gold/90 uppercase block">3D Component Architecture</span>
          <div class="flex flex-wrap gap-1.5">
            ${data.components.map(c => `
              <span class="text-[11px] px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-stone-300 font-light">
                ${c}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Action CTAs: Direct Add to Cart & Product Modal -->
        <div class="flex items-center gap-3 pt-2">
          <button 
            onclick="quickAddToCart(${data.id})"
            class="flex-1 py-3.5 px-6 rounded-full bg-gold hover:bg-gold-light text-stone-900 font-semibold text-sm shadow-xl hover:shadow-gold/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span>🛍️</span>
            <span>Quick Add to Cart · ${priceFormatted}</span>
          </button>
          <button 
            onclick="location.hash='#/product/${data.id}'"
            class="py-3.5 px-5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/15 transition-all">
            View Details &rarr;
          </button>
        </div>
      </div>
    `;
  }

  function renderWebGLFallback(container) {
    const data = SHOWCASE_PRODUCTS[activeModelKey];
    if (!data) return;

    const fallbackImg = data.id === 3 ? '/images/prod-3.jpg' : data.id === 4 ? '/images/prod-4.jpg' : '/images/prod-8.jpg';

    container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-emerald-950/40 rounded-3xl border border-white/10">
        <div class="relative w-64 h-64 mb-6 rounded-2xl overflow-hidden shadow-2xl border border-gold/30 bg-black/30">
          <img src="${fallbackImg}" alt="${data.title}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gold text-stone-900">
            ${data.badge}
          </span>
        </div>
        <p class="text-xs text-stone-400 max-w-sm mb-4">
          WebGL hardware acceleration is not active on this browser session. Showing high-resolution static photography.
        </p>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // PUBLIC API: MOUNT, SWITCH, DESTROY
  // -------------------------------------------------------------

  function switchModel(key) {
    if (!SHOWCASE_PRODUCTS[key] || key === activeModelKey) return;
    activeModelKey = key;

    // Update active tab buttons
    document.querySelectorAll('.atelier-tab-btn').forEach(btn => {
      if (btn.dataset.model === key) {
        btn.classList.add('!bg-gold', '!text-stone-900', '!border-gold');
        btn.classList.remove('text-stone-300');
      } else {
        btn.classList.remove('!bg-gold', '!text-stone-900', '!border-gold');
        btn.classList.add('text-stone-300');
      }
    });

    if (isWebGLAvailable() && renderer) {
      updateVisibleModel();
    } else if (canvasContainer) {
      renderWebGLFallback(canvasContainer);
      renderProductSpecsCard();
    }
  }

  function init(containerSelector) {
    let container;
    if (containerSelector && typeof containerSelector !== 'string') {
      container = containerSelector;
    } else {
      container = document.querySelector(containerSelector || '#atelier-canvas-wrapper');
    }
    if (!container) return;

    if (!isWebGLAvailable()) {
      renderWebGLFallback(container);
      renderProductSpecsCard();
      return;
    }

    try {
      initThreeScene(container);
      renderProductSpecsCard();
    } catch (err) {
      console.warn('[Product3DExperience] WebGL context initialization fallback:', err);
      renderWebGLFallback(container);
      renderProductSpecsCard();
    }
  }

  function destroy() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (scrollTimeline) {
      scrollTimeline.kill();
      scrollTimeline = null;
    }
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    scene = null;
    camera = null;
    studioEnvMap = null;
  }

  // Expose Global Public API
  window.Product3DExperience = {
    init,
    switchModel,
    toggleExplode,
    zoom,
    resetView,
    destroy,
    getActiveProduct: () => SHOWCASE_PRODUCTS[activeModelKey]
  };

})(window);
