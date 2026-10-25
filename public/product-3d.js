/**
 * Luxury & Elegant — Interactive 3D Product Atelier Experience
 * Built with Three.js (WebGL), procedural PBR materials, and GSAP ScrollTrigger.
 * Features 3 interactive procedural 3D showcases:
 *   1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch)
 *   2. Premium Headphones (ID: 4 — Aura Pro Studio Wireless Headphones)
 *   3. Luxury Perfume / Radiance Bottle (ID: 8 — Lumière 20% Vitamin C Radiance Serum)
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
  let targetRotation = { x: 0.12, y: 0.2 };
  let cameraDistance = 7.2;
  let targetCameraDistance = 7.2;
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

  // Real Database Product Metadata for the 3 Showcases
  const SHOWCASE_PRODUCTS = {
    watch: {
      id: 3,
      category: 'Fashion & Horology',
      badge: '✦ Swiss Precision Quartz Calibre',
      title: 'Geneva Gold Minimalist Watch',
      tagline: 'Ultra-slim champagne gold casing with scratch-resistant sapphire crystal and exhibition movement.',
      price: 3600,
      regularPrice: 4500,
      onSale: true,
      stock: 25,
      specs: [
        { label: 'Crystal', val: 'Scratch-Resistant Sapphire Glass' },
        { label: 'Casing', val: '316L Surgical Champagne Gold' },
        { label: 'Movement', val: 'Geneva Calibre 28,800 VPH' },
        { label: 'Water Resistance', val: '50M / 5 ATM Tested' }
      ],
      components: ['Sapphire Lens', 'Coin-Fluted Bezel', 'Emerald Sunburst Dial', 'Calibre Movement', 'Geneva Rotor', 'Calfskin Strap']
    },
    headphones: {
      id: 4,
      category: 'High-Fidelity Acoustics',
      badge: '✦ 40mm Titanium Acoustic Transducer',
      title: 'Aura Pro Studio Wireless Headphones',
      tagline: 'Master-tuned spatial acoustic chamber with active noise cancellation and anodized aluminum hardware.',
      price: 8900,
      regularPrice: 8900,
      onSale: false,
      stock: 18,
      specs: [
        { label: 'Drivers', val: '40mm Custom Titanium Transducers' },
        { label: 'ANC', val: 'Hybrid Active Noise Cancellation' },
        { label: 'Battery', val: '45-Hour Ultra-Long Playback' },
        { label: 'Cushions', val: 'Memory Foam Protein Leatherette' }
      ],
      components: ['Titanium Drivers', 'Acoustic Shells', 'Memory Foam Cushions', 'Anodized Yoke Slider', 'Steel Headband']
    },
    perfume: {
      id: 8,
      category: 'Artisanal Beauty & Elixir',
      badge: '✦ 20% Stabilized L-Ascorbic Acid',
      title: 'Lumière 20% Vitamin C Radiance Serum',
      tagline: 'Concentrated antioxidant radiance elixir in heavy amber flint glass with champagne gold dropper collar.',
      price: 1850,
      regularPrice: 1850,
      onSale: false,
      stock: 32,
      specs: [
        { label: 'Formula', val: '20% L-Ascorbic Acid + Hyaluronic' },
        { label: 'Vessel', val: 'Apothecary Amber Flint Glass' },
        { label: 'Dispenser', val: 'Micro-Pipette Gold Collar Dropper' },
        { label: 'Finish', val: 'Luminous Hydration & Firming' }
      ],
      components: ['Flint Amber Glass', 'Gold Collar Ring', 'Radiance Liquid Core', 'Precision Pipette', 'Silicone Bulb']
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

  // Generate procedural studio environment reflection map
  function createStudioEnvironment(targetRenderer) {
    const pmremGenerator = new THREE.PMREMGenerator(targetRenderer);
    pmremGenerator.compileEquirectangularShader();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Studio dark emerald gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0c1b14');
    grad.addColorStop(0.5, '#050c09');
    grad.addColorStop(1, '#020504');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warm key softbox (top center-left)
    const softbox1 = ctx.createLinearGradient(200, 40, 800, 140);
    softbox1.addColorStop(0, 'rgba(255, 248, 235, 0.95)');
    softbox1.addColorStop(1, 'rgba(230, 200, 140, 0.15)');
    ctx.fillStyle = softbox1;
    ctx.fillRect(150, 30, 700, 120);

    // Warm gold rim softbox (bottom right)
    const softbox2 = ctx.createRadialGradient(850, 360, 20, 850, 360, 220);
    softbox2.addColorStop(0, 'rgba(215, 175, 80, 0.85)');
    softbox2.addColorStop(1, 'rgba(15, 61, 46, 0.0)');
    ctx.fillStyle = softbox2;
    ctx.fillRect(650, 180, 350, 320);

    // Cool ice-blue fill softbox (left edge)
    const softbox3 = ctx.createLinearGradient(40, 120, 220, 420);
    softbox3.addColorStop(0, 'rgba(210, 230, 255, 0.7)');
    softbox3.addColorStop(1, 'rgba(180, 210, 240, 0.0)');
    ctx.fillStyle = softbox3;
    ctx.fillRect(20, 100, 200, 320);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    return envMap;
  }

  // -------------------------------------------------------------
  // PROCEDURAL TEXTURE GENERATORS
  // -------------------------------------------------------------

  // Sunburst Dark Emerald Watch Dial
  function createDialTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.46;

    // Dark Emerald Base & Sunburst Gradient
    ctx.fillStyle = '#051810';
    ctx.fillRect(0, 0, size, size);

    const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    bgGrad.addColorStop(0, '#0d4230');
    bgGrad.addColorStop(0.65, '#07241a');
    bgGrad.addColorStop(1, '#02120d');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Sunburst radial lines
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(200, 162, 74, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 360; i += 2) {
      ctx.rotate((Math.PI / 180) * 2);
      ctx.beginPath();
      ctx.moveTo(radius * 0.25, 0);
      ctx.lineTo(radius * 0.96, 0);
      ctx.stroke();
    }
    ctx.restore();

    // Outer railway minute track
    ctx.strokeStyle = 'rgba(200, 162, 74, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    // Minute / Hour indices
    for (let i = 0; i < 60; i++) {
      const angle = (i * Math.PI) / 30;
      const isFive = i % 5 === 0;
      const inner = isFive ? radius * 0.86 : radius * 0.90;
      const outer = radius * 0.94;
      ctx.strokeStyle = isFive ? '#dfbf68' : 'rgba(200, 162, 74, 0.5)';
      ctx.lineWidth = isFive ? 3.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Dial Typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 36px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#f0d283';
    ctx.fillText('LUXURY & ELEGANT', cx, cy - radius * 0.45);

    ctx.font = '500 16px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(200, 162, 74, 0.85)';
    ctx.fillText('AUTOMATIC CHRONOMETER', cx, cy - radius * 0.35);

    ctx.font = '600 15px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('28,800 VPH · 50M', cx, cy + radius * 0.42);

    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(200, 162, 74, 0.8)';
    ctx.fillText('GENEVE CRAFTED', cx, cy + radius * 0.52);

    // Date Window at 3 o'clock
    const dateX = cx + radius * 0.58;
    const dateY = cy;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(dateX - 22, dateY - 16, 44, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('26', dateX, dateY + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.center.set(0.5, 0.5);
    texture.rotation = 0;
    texture.anisotropy = 8;
    return texture;
  }

  // Côtes de Genève (Geneva Stripes) for movement rotor
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
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  // Perforated Acoustic Mesh Texture for Headphones Driver
  function createSpeakerGrilleTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1f22';
    ctx.fillRect(0, 0, size, size);

    // Micro-perforated acoustic dots
    ctx.fillStyle = '#080b0c';
    const step = 16;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        ctx.beginPath();
        ctx.arc(x + (y % 32 === 0 ? 0 : 8), y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gold titanium voice-coil concentric rings
    const cx = size / 2;
    const cy = size / 2;
    ctx.strokeStyle = 'rgba(215, 175, 80, 0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.stroke();

    // Center titanium dome gradient
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

  // Luxury Perfume / Radiance Elixir Front Gold Foil Label
  function createBottleLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Transparent soft parchment backing with gold border
    ctx.fillStyle = 'rgba(255, 252, 245, 0.95)';
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
  // MODEL BUILDERS (Procedural Three.js Geometries & PBR Materials)
  // -------------------------------------------------------------

  // 1. Luxury Watch (ID: 3 — Geneva Gold Minimalist Watch)
  function buildWatchModel(envMap) {
    const master = new THREE.Group();
    master.name = 'watch_master';

    // Materials
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfbf68,
      metalness: 0.94,
      roughness: 0.16,
      envMap: envMap,
      envMapIntensity: 1.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xc8a24a,
      metalness: 0.88,
      roughness: 0.35,
      envMap: envMap,
      envMapIntensity: 1.2
    });

    const sapphireGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.77,
      envMap: envMap,
      envMapIntensity: 1.8,
      clearcoat: 1.0
    });

    const steelMat = new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee,
      metalness: 0.95,
      roughness: 0.14,
      envMap: envMap,
      envMapIntensity: 1.4
    });

    const rubyJewelMat = new THREE.MeshPhysicalMaterial({
      color: 0xd91438,
      transmission: 0.7,
      roughness: 0.1,
      ior: 1.76,
      emissive: 0x4a000d,
      emissiveIntensity: 0.4
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.78,
      metalness: 0.05
    });

    // 1.1 Sapphire Crystal (+Z front)
    const crystalGroup = new THREE.Group();
    const crystalGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.08, 64);
    const crystalMesh = new THREE.Mesh(crystalGeo, sapphireGlassMat);
    crystalMesh.rotation.x = -Math.PI / 2;
    crystalGroup.add(crystalMesh);
    crystalGroup.position.z = 0.45;
    master.add(crystalGroup);

    // 1.2 Bezel
    const bezelGroup = new THREE.Group();
    const bezelRingGeo = new THREE.TorusGeometry(2.14, 0.12, 24, 80);
    const bezelRing = new THREE.Mesh(bezelRingGeo, goldMat);
    bezelGroup.add(bezelRing);

    // Coin-fluted bezel edge
    const flutingGeo = new THREE.CylinderGeometry(2.26, 2.26, 0.14, 90, 1, true);
    const flutingMesh = new THREE.Mesh(flutingGeo, brushedGoldMat);
    flutingMesh.rotation.x = -Math.PI / 2;
    bezelGroup.add(flutingMesh);
    bezelGroup.position.z = 0.35;
    master.add(bezelGroup);

    // 1.3 Hands
    const handsGroup = new THREE.Group();
    const hourHandGeo = new THREE.BoxGeometry(0.08, 1.1, 0.03);
    const hourHand = new THREE.Mesh(hourHandGeo, goldMat);
    hourHand.position.set(0, 0.45, 0.05);

    const minuteHandGeo = new THREE.BoxGeometry(0.06, 1.6, 0.03);
    const minuteHand = new THREE.Mesh(minuteHandGeo, goldMat);
    minuteHand.position.set(0, 0.65, 0.08);
    minuteHand.rotation.z = -Math.PI / 3;

    const secondHandGeo = new THREE.BoxGeometry(0.02, 1.85, 0.02);
    const secondHandMat = new THREE.MeshPhysicalMaterial({ color: 0x2563eb, metalness: 0.9, roughness: 0.2 });
    const secondHand = new THREE.Mesh(secondHandGeo, secondHandMat);
    secondHand.position.set(0, 0.6, 0.11);

    const centerCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 32);
    const centerCap = new THREE.Mesh(centerCapGeo, goldMat);
    centerCap.rotation.x = -Math.PI / 2;
    centerCap.position.z = 0.12;

    handsGroup.add(hourHand, minuteHand, secondHand, centerCap);
    handsGroup.position.z = 0.22;
    master.add(handsGroup);

    // 1.4 Dial Plate (+Z front)
    const dialGroup = new THREE.Group();
    const dialBaseGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.04, 64);
    const dialBaseMat = new THREE.MeshStandardMaterial({
      color: 0x051810,
      roughness: 0.4,
      metalness: 0.1
    });
    const dialBaseMesh = new THREE.Mesh(dialBaseGeo, dialBaseMat);
    dialBaseMesh.rotation.x = -Math.PI / 2;
    dialGroup.add(dialBaseMesh);

    const dialFaceGeo = new THREE.CircleGeometry(2.08, 64);
    const dialMat = new THREE.MeshStandardMaterial({
      map: createDialTexture(),
      roughness: 0.28,
      metalness: 0.3,
      envMap: envMap,
      envMapIntensity: 1.2
    });
    const dialFaceMesh = new THREE.Mesh(dialFaceGeo, dialMat);
    dialFaceMesh.position.z = 0.025;
    dialGroup.add(dialFaceMesh);

    dialGroup.position.z = 0.1;
    master.add(dialGroup);

    // 1.5 Calibre Movement (Rear Side -Z)
    const movementGroup = new THREE.Group();
    const plateGeo = new THREE.CylinderGeometry(1.98, 1.98, 0.12, 48);
    const plateMesh = new THREE.Mesh(plateGeo, steelMat);
    plateMesh.rotation.x = -Math.PI / 2;
    movementGroup.add(plateMesh);

    // Balance wheel
    const balanceWheelGeo = new THREE.TorusGeometry(0.48, 0.035, 16, 40);
    const balanceWheel = new THREE.Mesh(balanceWheelGeo, goldMat);
    balanceWheel.position.set(-0.65, 0.45, -0.08);
    movementGroup.add(balanceWheel);

    // Brass gears
    const gear1Geo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 28);
    const gear1 = new THREE.Mesh(gear1Geo, brushedGoldMat);
    gear1.rotation.x = -Math.PI / 2;
    gear1.position.set(0.4, 0.3, -0.08);
    movementGroup.add(gear1);

    // Jewels
    for (let j = 0; j < 5; j++) {
      const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), rubyJewelMat);
      jewel.rotation.x = -Math.PI / 2;
      jewel.position.set(Math.cos(j * 1.25) * 0.9, Math.sin(j * 1.25) * 0.9, -0.09);
      movementGroup.add(jewel);
    }
    movementGroup.position.z = -0.25;
    master.add(movementGroup);

    // 1.6 Rotor (Rear Side)
    const rotorGroup = new THREE.Group();
    const rotorShape = new THREE.Shape();
    rotorShape.absarc(0, 0, 1.88, 0, Math.PI, false);
    rotorShape.lineTo(0, 0);
    const rotorGeo = new THREE.ExtrudeGeometry(rotorShape, { depth: 0.08, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.02, bevelThickness: 0.02 });
    const rotorMat = new THREE.MeshStandardMaterial({
      map: createGenevaStripesTexture(),
      roughness: 0.28,
      metalness: 0.85,
      envMap: envMap
    });
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    rotorGroup.add(rotorMesh);
    rotorGroup.position.z = -0.45;
    master.add(rotorGroup);

    // 1.7 Casing, Lugs, Crown
    const caseGroup = new THREE.Group();
    const caseGeo = new THREE.CylinderGeometry(2.28, 2.28, 0.42, 64, 1, true);
    const caseMesh = new THREE.Mesh(caseGeo, goldMat);
    caseMesh.rotation.x = -Math.PI / 2;
    caseGroup.add(caseMesh);

    const backplateGeo = new THREE.CircleGeometry(2.26, 64);
    const backplateMesh = new THREE.Mesh(backplateGeo, brushedGoldMat);
    backplateMesh.rotation.y = Math.PI; // facing rear (-Z)
    backplateMesh.position.z = -0.21;
    caseGroup.add(backplateMesh);

    // Lugs (4 corner curved horns)
    const lugGeo = new THREE.BoxGeometry(0.24, 0.9, 0.32);
    const lugPositions = [
      [-1.4, 2.2, 0],
      [1.4, 2.2, 0],
      [-1.4, -2.2, 0],
      [1.4, -2.2, 0]
    ];
    lugPositions.forEach((pos) => {
      const lug = new THREE.Mesh(lugGeo, goldMat);
      lug.position.set(...pos);
      caseGroup.add(lug);
    });

    // Fluted Crown at 3 o'clock
    const crownGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 32);
    const crownMesh = new THREE.Mesh(crownGeo, brushedGoldMat);
    crownMesh.rotation.z = Math.PI / 2;
    crownMesh.position.set(2.4, 0, 0);
    const cabochon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshPhysicalMaterial({ color: 0x052e22, roughness: 0.1, clearcoat: 1.0 }));
    cabochon.position.set(2.6, 0, 0);
    caseGroup.add(crownMesh, cabochon);
    caseGroup.position.z = 0;
    master.add(caseGroup);

    // 1.8 Caseback Ring
    const casebackGroup = new THREE.Group();
    const casebackGeo = new THREE.TorusGeometry(2.18, 0.14, 20, 64);
    const casebackMesh = new THREE.Mesh(casebackGeo, goldMat);
    casebackGroup.add(casebackMesh);
    casebackGroup.position.z = -0.65;
    master.add(casebackGroup);

    // 1.9 Leather Straps
    const strapTopGroup = new THREE.Group();
    const strapTopGeo = new THREE.BoxGeometry(1.9, 2.8, 0.14);
    const strapTop = new THREE.Mesh(strapTopGeo, leatherMat);
    strapTop.position.set(0, 3.4, -0.05);
    strapTopGroup.add(strapTop);
    master.add(strapTopGroup);

    const strapBottomGroup = new THREE.Group();
    const strapBottomGeo = new THREE.BoxGeometry(1.9, 3.2, 0.14);
    const strapBottom = new THREE.Mesh(strapBottomGeo, leatherMat);
    strapBottom.position.set(0, -3.6, -0.05);

    // Gold tang buckle
    const buckleGeo = new THREE.TorusGeometry(0.9, 0.08, 16, 32);
    const buckle = new THREE.Mesh(buckleGeo, goldMat);
    buckle.position.set(0, -5.2, -0.05);
    strapBottomGroup.add(strapBottom, buckle);
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
      secondHand,
      balanceWheel,
      rotorMesh
    };

    master.scale.set(0.78, 0.78, 0.78);
    return master;
  }

  // 2. Premium Headphones (ID: 4 — Aura Pro Studio Wireless Headphones)
  function buildHeadphonesModel(envMap) {
    const master = new THREE.Group();
    master.name = 'headphones_master';

    // Materials
    const matteObsidianMat = new THREE.MeshPhysicalMaterial({
      color: 0x14181a,
      metalness: 0.35,
      roughness: 0.28,
      envMap: envMap,
      envMapIntensity: 1.1,
      clearcoat: 0.4
    });

    const champagneGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfbf68,
      metalness: 0.95,
      roughness: 0.18,
      envMap: envMap,
      envMapIntensity: 1.5,
      clearcoat: 0.6
    });

    const steelHeadbandMat = new THREE.MeshStandardMaterial({
      color: 0xd0d5dd,
      metalness: 0.9,
      roughness: 0.25,
      envMap: envMap
    });

    const cushionLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x1b1f22,
      roughness: 0.72,
      metalness: 0.08
    });

    const driverMeshMat = new THREE.MeshStandardMaterial({
      map: createSpeakerGrilleTexture(),
      roughness: 0.3,
      metalness: 0.85,
      envMap: envMap
    });

    // 2.1 Headband Group: Arches upward over the top (Y >= 0)
    const headbandGroup = new THREE.Group();
    // In Three.js TorusGeometry(R, tube, radial, tubular, Math.PI) from 0 to PI is already an upper arch in XY plane!
    const bandCurveGeo = new THREE.TorusGeometry(2.35, 0.16, 24, 60, Math.PI);
    const bandMesh = new THREE.Mesh(bandCurveGeo, steelHeadbandMat);
    bandMesh.position.set(0, 0, 0);
    headbandGroup.add(bandMesh);

    // Ergonomic underside leather cushion
    const cushionCurveGeo = new THREE.TorusGeometry(2.24, 0.14, 18, 50, Math.PI * 0.75);
    const cushionMesh = new THREE.Mesh(cushionCurveGeo, cushionLeatherMat);
    // Center the 0.75 PI arc around the top point (PI / 2)
    cushionMesh.rotation.z = Math.PI * 0.125;
    cushionMesh.position.set(0, 0, 0);
    headbandGroup.add(cushionMesh);
    master.add(headbandGroup);

    // 2.2 Telescoping Slider Yokes (Left & Right)
    const leftYokeGroup = new THREE.Group();
    const rightYokeGroup = new THREE.Group();

    function createYoke() {
      const yokeG = new THREE.Group();
      // Telescoping extension arm
      const armGeo = new THREE.BoxGeometry(0.18, 1.2, 0.12);
      const armMesh = new THREE.Mesh(armGeo, champagneGoldMat);
      armMesh.position.y = -0.6;

      // Downward U-fork cradling the cup
      const forkCurve = new THREE.TorusGeometry(1.2, 0.08, 16, 32, Math.PI);
      const forkMesh = new THREE.Mesh(forkCurve, champagneGoldMat);
      forkMesh.rotation.z = Math.PI; // Inverts fork to curve downward
      forkMesh.position.y = -1.1;

      yokeG.add(armMesh, forkMesh);
      return yokeG;
    }

    const leftYoke = createYoke();
    leftYoke.position.set(-2.35, 0, 0);
    leftYokeGroup.add(leftYoke);

    const rightYoke = createYoke();
    rightYoke.position.set(2.35, 0, 0);
    rightYokeGroup.add(rightYoke);

    master.add(leftYokeGroup, rightYokeGroup);

    // 2.3 Outer Acoustic Ear Cups (Left & Right)
    const leftShellGroup = new THREE.Group();
    const rightShellGroup = new THREE.Group();

    function createAcousticCup() {
      const cupG = new THREE.Group();
      // Outer beveled dome
      const domeGeo = new THREE.CylinderGeometry(1.12, 1.18, 0.45, 48);
      const dome = new THREE.Mesh(domeGeo, matteObsidianMat);
      dome.rotation.z = Math.PI / 2;

      // Gold chamfer rim
      const rimGeo = new THREE.TorusGeometry(1.18, 0.06, 16, 48);
      const rim = new THREE.Mesh(rimGeo, champagneGoldMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = -0.15;

      // Embossed gold logo medallion
      const logoGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32);
      const logo = new THREE.Mesh(logoGeo, champagneGoldMat);
      logo.rotation.z = Math.PI / 2;
      logo.position.x = -0.25;

      cupG.add(dome, rim, logo);
      return cupG;
    }

    const leftShell = createAcousticCup();
    leftShellGroup.position.set(-2.45, -1.1, 0);
    leftShellGroup.add(leftShell);

    const rightShell = createAcousticCup();
    rightShell.rotation.y = Math.PI;
    rightShellGroup.position.set(2.45, -1.1, 0);
    rightShellGroup.add(rightShell);

    master.add(leftShellGroup, rightShellGroup);

    // 2.4 Titanium Acoustic Drivers (Left & Right)
    const leftDriverGroup = new THREE.Group();
    const rightDriverGroup = new THREE.Group();

    function createDriver() {
      const driverG = new THREE.Group();
      const discGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.05, 48);
      const disc = new THREE.Mesh(discGeo, driverMeshMat);
      disc.rotation.z = Math.PI / 2;

      const magnetGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.12, 32);
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

    // 2.5 Memory Foam Ear Cushions (Left & Right)
    const leftCushionGroup = new THREE.Group();
    const rightCushionGroup = new THREE.Group();

    function createCushion() {
      const cushionG = new THREE.Group();
      const cushionGeo = new THREE.TorusGeometry(1.08, 0.32, 24, 48);
      const cushion = new THREE.Mesh(cushionGeo, cushionLeatherMat);
      cushion.rotation.y = Math.PI / 2;
      cushionG.add(cushion);
      return cushionG;
    }

    const leftCushion = createCushion();
    leftCushionGroup.position.set(-1.85, -1.1, 0);
    leftCushionGroup.add(leftCushion);

    const rightCushion = createCushion();
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

    master.scale.set(0.76, 0.76, 0.76);
    master.position.y = 0.4;
    return master;
  }

  // 3. Luxury Perfume / Radiance Elixir Bottle (ID: 8 — Lumière 20% Vitamin C Radiance Serum)
  function buildPerfumeModel(envMap) {
    const master = new THREE.Group();
    master.name = 'perfume_master';

    // Materials
    const heavyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdf9838, // Warm Amber Flint Glass
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.54,
      envMap: envMap,
      envMapIntensity: 2.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });

    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b, // Radiant Vitamin C Honey Amber Serum
      transmission: 0.65,
      opacity: 0.9,
      transparent: true,
      roughness: 0.08,
      ior: 1.38,
      emissive: 0x3d1c02,
      emissiveIntensity: 0.5,
      envMap: envMap,
      envMapIntensity: 1.4
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

    // Thick Crystal Base
    const baseGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.35, 48);
    const baseMesh = new THREE.Mesh(baseGeo, heavyGlassMat);
    baseMesh.position.y = -1.65;
    bottleBodyGroup.add(baseMesh);

    // 3.2 Internal Radiant Liquid Fluid Core
    const liquidGeo = new THREE.CylinderGeometry(1.22, 1.22, 2.7, 36);
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = -0.2;
    bottleBodyGroup.add(liquidMesh);

    // 3.3 Front Luxury Label
    const labelGeo = new THREE.CylinderGeometry(1.46, 1.46, 1.8, 36, 1, true, -Math.PI * 0.35, Math.PI * 0.7);
    const labelMat = new THREE.MeshStandardMaterial({
      map: createBottleLabelTexture(),
      roughness: 0.45,
      metalness: 0.2,
      side: THREE.DoubleSide,
      transparent: true
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = -0.15;
    bottleBodyGroup.add(labelMesh);

    master.add(bottleBodyGroup);

    // 3.4 Champagne Gold Threaded Collar
    const collarGroup = new THREE.Group();
    const collarGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.6, 36);
    const collarMesh = new THREE.Mesh(collarGeo, champagneGoldMat);
    // Knurling rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.04, 16, 36), champagneGoldMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.2;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.04, 16, 36), champagneGoldMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -0.2;
    collarGroup.add(collarMesh, ring1, ring2);
    collarGroup.position.y = 2.75;
    master.add(collarGroup);

    // 3.5 Dropper Pipette Assembly (Cap, Bulb, and Glass Tube)
    const dropperGroup = new THREE.Group();

    // Gold Cap Base
    const capGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.7, 36);
    const capMesh = new THREE.Mesh(capGeo, champagneGoldMat);
    dropperGroup.add(capMesh);

    // Silicone Suction Squeeze Bulb
    const bulbGeo = new THREE.SphereGeometry(0.62, 32, 24);
    bulbGeo.scale(0.85, 1.4, 0.85);
    const bulbMesh = new THREE.Mesh(bulbGeo, siliconeBulbMat);
    bulbMesh.position.y = 0.85;
    dropperGroup.add(bulbMesh);

    // Clear Glass Pipette Tube dipping into the serum
    const pipetteGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.6, 24);
    const pipetteMesh = new THREE.Mesh(pipetteGeo, pipetteGlassMat);
    pipetteMesh.position.y = -2.1;
    dropperGroup.add(pipetteMesh);

    // Golden suspended droplet at the pipette tip
    const dropletGeo = new THREE.SphereGeometry(0.14, 16, 16);
    dropletGeo.scale(0.9, 1.4, 0.9);
    const dropletMesh = new THREE.Mesh(dropletGeo, liquidMat);
    dropletMesh.position.y = -3.95;
    dropperGroup.add(dropletMesh);

    dropperGroup.position.y = 3.35;
    master.add(dropperGroup);

    perfumeParts = {
      bottleBodyGroup,
      collarGroup,
      dropperGroup,
      liquidMesh,
      dropletMesh
    };

    master.scale.set(0.72, 0.72, 0.72);
    master.position.y = -0.85;
    return master;
  }

  // -------------------------------------------------------------
  // THREE.JS SCENE INITIALIZATION & LIGHTING
  // -------------------------------------------------------------

  function initThreeScene(container) {
    canvasContainer = container;
    canvasContainer.innerHTML = '';

    // Create Canvas Element
    canvasElement = document.createElement('canvas');
    canvasElement.className = 'w-full h-full block cursor-grab active:cursor-grabbing select-none';
    canvasElement.style.touchAction = 'pan-y'; // Preserve vertical mobile page scrolling
    canvasContainer.appendChild(canvasElement);

    const width = canvasContainer.clientWidth || 600;
    const height = canvasContainer.clientHeight || 500;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, cameraDistance);

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
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Procedural Studio Environment Map
    studioEnvMap = createStudioEnvironment(renderer);
    scene.environment = studioEnvMap;

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    keyLight = new THREE.DirectionalLight(0xfff7ea, 2.5);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    fillLight = new THREE.DirectionalLight(0xcde3ff, 1.2);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    goldRimLight = new THREE.PointLight(0xdfbf68, 3.8, 25);
    goldRimLight.position.set(3, -2, -4);
    scene.add(goldRimLight);

    bottleLight = new THREE.PointLight(0xffb74d, 2.2, 15);
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
    groundMesh.position.y = -2.6;
    scene.add(groundMesh);

    // Build the 3 Procedural Models
    models.watch = buildWatchModel(studioEnvMap);
    models.headphones = buildHeadphonesModel(studioEnvMap);
    models.perfume = buildPerfumeModel(studioEnvMap);

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
        const targetScale = key === 'watch' ? 0.78 : key === 'headphones' ? 0.76 : 0.72;
        if (window.gsap) {
          window.gsap.to(m.scale, {
            x: targetScale,
            y: targetScale,
            z: targetScale,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
      } else {
        if (window.gsap) {
          window.gsap.to(m.scale, {
            x: 0.001,
            y: 0.001,
            z: 0.001,
            duration: 0.35,
            ease: 'power2.in',
            onComplete: () => {
              if (key !== activeModelKey) m.visible = false;
            }
          });
        } else {
          m.visible = false;
        }
      }
    });

    // Reset exploded state when switching models
    isExploded = false;
    explodeProgress = 0;
    updateComponentExplosion(0);
    updateExplodeButtonUI();
    renderProductSpecsCard();
  }

  // -------------------------------------------------------------
  // EXPLODED VIEW COMPONENT ANIMATION
  // -------------------------------------------------------------

  function updateComponentExplosion(progress) {
    explodeProgress = progress;

    // 1. Watch Component Separation
    if (watchParts.crystalGroup) {
      watchParts.crystalGroup.position.z = 0.45 + progress * 1.55;
      watchParts.bezelGroup.position.z = 0.35 + progress * 1.05;
      watchParts.handsGroup.position.z = 0.22 + progress * 0.65;
      watchParts.dialGroup.position.z = 0.1 + progress * 0.25;
      watchParts.movementGroup.position.z = -0.25 - progress * 0.85;
      watchParts.rotorGroup.position.z = -0.45 - progress * 1.35;
      watchParts.casebackGroup.position.z = -0.65 - progress * 1.85;
      watchParts.strapTopGroup.position.y = 3.4 + progress * 0.8;
      watchParts.strapBottomGroup.position.y = -3.6 - progress * 0.8;
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
      perfumeParts.dropperGroup.position.y = 3.35 + progress * 2.4;
      perfumeParts.collarGroup.position.y = 2.75 + progress * 0.95;
      if (bottleLight) {
        bottleLight.intensity = 2.2 + progress * 2.5;
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
        targetCameraDistance = Math.max(4.8, Math.min(10.5, targetCameraDistance + e.deltaY * 0.005));
      }
    }, { passive: false });
  }

  function zoom(direction) {
    if (direction === 'in') {
      targetCameraDistance = Math.max(4.8, targetCameraDistance - 0.8);
    } else if (direction === 'out') {
      targetCameraDistance = Math.min(10.5, targetCameraDistance + 0.8);
    }
  }

  function resetView() {
    targetRotation = { x: 0.12, y: 0.2 };
    targetCameraDistance = 7.2;
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
    // Centered at progress = 0.5 so model faces forward directly when in view
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

    // Pause rendering loop when not in viewport to optimize battery/CPU
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

    // Apply combined rotation to active model (pointer + subtle idle floating + scroll scrub)
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

    cardEl.innerHTML = `
      <div class="space-y-4">
        <!-- Category & Active Badge -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold border border-gold/40">
            ${data.badge}
          </span>
          <span class="text-xs text-stone-400 font-medium tracking-wide">
            Verified In Database (ID: ${data.id})
          </span>
        </div>

        <!-- Product Title & Tagline -->
        <div>
          <h3 class="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
            ${data.title}
          </h3>
          <p class="text-sm text-stone-300 mt-2 font-light leading-relaxed">
            ${data.tagline}
          </p>
        </div>

        <!-- Real Database Price & Stock Status -->
        <div class="flex items-baseline gap-3 pt-1">
          <span class="font-serif text-3xl font-bold text-gold">
            ৳${data.price.toLocaleString('en-IN')}
          </span>
          ${data.onSale ? `
            <span class="text-stone-400 line-through text-base">
              ৳${data.regularPrice.toLocaleString('en-IN')}
            </span>
            <span class="rounded-md bg-rose-600/80 px-2 py-0.5 text-xs font-bold text-white">
              Save ৳${(data.regularPrice - data.price).toLocaleString('en-IN')}
            </span>
          ` : ''}
          <span class="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ${data.stock} In Stock
          </span>
        </div>

        <!-- Technical Specifications Grid -->
        <div class="grid grid-cols-2 gap-2.5 pt-2">
          ${data.specs.map(s => `
            <div class="rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <p class="text-[11px] uppercase tracking-wider text-stone-400">${s.label}</p>
              <p class="text-xs font-semibold text-white mt-0.5 leading-snug">${s.val}</p>
            </div>
          `).join('')}
        </div>

        <!-- Exploded View Component Tags -->
        <div class="pt-2">
          <p class="text-[11px] uppercase tracking-wider text-gold font-semibold mb-2">3D Component Architecture</p>
          <div class="flex flex-wrap gap-1.5">
            ${data.components.map(c => `
              <span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-stone-200 border border-white/15">
                ${c}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Real Actions: Quick Add to Cart & View Full Details -->
        <div class="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <button onclick="if(window.quickAddToCart){window.quickAddToCart(${data.id});}else{location.hash='#/p/${data.id}';}" class="btn btn-gold w-full sm:flex-1 !py-3.5 shadow-xl text-sm font-bold flex items-center justify-center gap-2">
            <span>🛍️</span>
            <span>Quick Add to Cart · ৳${data.price.toLocaleString('en-IN')}</span>
          </button>
          <a href="#/p/${data.id}" class="btn btn-outline-white w-full sm:w-auto !py-3.5 !px-5 text-sm font-medium text-center">
            View Details →
          </a>
        </div>
      </div>
    `;
  }

  // Render Accessible WebGL Fallback Card when WebGL is unavailable
  function renderWebGLFallback(container) {
    const data = SHOWCASE_PRODUCTS[activeModelKey];
    container.innerHTML = `
      <div class="p-8 sm:p-12 text-center flex flex-col items-center justify-center h-full">
        <div class="relative max-w-sm w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-gold/30 mb-6 bg-stone-900">
          <img src="/images/prod-${data.id}.jpg" alt="${data.title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='/images/hero.jpg';">
          <span class="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs text-gold border border-gold/30">
            ${data.badge}
          </span>
        </div>
        <h3 class="font-serif text-2xl font-bold text-white mb-2">${data.title}</h3>
        <p class="text-sm text-stone-300 max-w-md mb-6">${data.tagline}</p>
        <div class="flex gap-4">
          <button onclick="quickAddToCart(${data.id});" class="btn btn-gold text-sm !py-2.5 !px-6">
            Add to Cart · ৳${data.price.toLocaleString('en-IN')}
          </button>
          <a href="#/p/${data.id}" class="btn btn-outline-white text-sm !py-2.5 !px-5">
            View Details
          </a>
        </div>
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
    const container = document.querySelector(containerSelector || '#atelier-canvas-wrapper');
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
    canvasElement = null;
  }

  // Export to global window object
  window.Product3DExperience = {
    init,
    destroy,
    switchModel,
    toggleExplode,
    zoom,
    resetView,
    getActiveProduct: () => SHOWCASE_PRODUCTS[activeModelKey]
  };

})(window);
