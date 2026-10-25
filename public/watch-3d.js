/**
 * Luxury & Elegant — Interactive 3D Watch Experience
 * Built with Three.js (WebGL), procedural PBR materials, and GSAP ScrollTrigger.
 * Inspired by Haute Horlogerie craftsmanship & Fossil watch education storytelling.
 */

(function () {
  let scene, camera, renderer, animationFrameId;
  let watchGroup, crystalGroup, bezelGroup, handsGroup, dialGroup;
  let movementGroup, rotorGroup, caseGroup, casebackGroup, strapTopGroup, strapBottomGroup;
  let balanceWheel, secondHand, minuteHand, hourHand, rotorMesh;
  let scrollTimeline;
  let isInteracting = false;
  let previousMousePosition = { x: 0, y: 0 };
  let manualRotation = { x: 0, y: 0 };
  let mouseTilt = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isVisible = true;

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
  function createStudioEnvironment(renderer) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Studio gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#101713');
    grad.addColorStop(0.5, '#050a08');
    grad.addColorStop(1, '#020504');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Softbox light strip 1 (top key light)
    const softbox1 = ctx.createLinearGradient(200, 50, 824, 150);
    softbox1.addColorStop(0, 'rgba(255, 250, 240, 0.9)');
    softbox1.addColorStop(1, 'rgba(255, 235, 190, 0.1)');
    ctx.fillStyle = softbox1;
    ctx.fillRect(150, 40, 720, 100);

    // Rim light strip (bottom-right)
    const softbox2 = ctx.createRadialGradient(850, 380, 20, 850, 380, 200);
    softbox2.addColorStop(0, 'rgba(200, 162, 74, 0.8)');
    softbox2.addColorStop(1, 'rgba(15, 61, 46, 0.0)');
    ctx.fillStyle = softbox2;
    ctx.fillRect(650, 200, 350, 300);

    // Cool fill strip (left)
    const softbox3 = ctx.createLinearGradient(50, 150, 250, 450);
    softbox3.addColorStop(0, 'rgba(210, 230, 255, 0.6)');
    softbox3.addColorStop(1, 'rgba(180, 210, 240, 0.0)');
    ctx.fillStyle = softbox3;
    ctx.fillRect(30, 120, 200, 320);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    pmremGenerator.dispose();
    return envMap;
  }

  // Generate procedural dial face texture with sunburst & markings
  function createDialTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.46;

    // Dial background: Dark Emerald & Forest Radial Gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    bgGrad.addColorStop(0, '#0d3829');
    bgGrad.addColorStop(0.65, '#07241a');
    bgGrad.addColorStop(1, '#02120d');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle sunburst guilloché lines
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(200, 162, 74, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 360; i += 2) {
      ctx.rotate((Math.PI / 180) * 2);
      ctx.beginPath();
      ctx.moveTo(radius * 0.25, 0);
      ctx.lineTo(radius * 0.96, 0);
      ctx.stroke();
    }
    ctx.restore();

    // Outer railway minute track rings
    ctx.strokeStyle = 'rgba(200, 162, 74, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    // 60 Minute / Second ticks
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

    // Brand Name
    ctx.font = '600 36px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#f0d283';
    ctx.fillText('LUXURY & ELEGANT', cx, cy - radius * 0.45);

    ctx.font = '500 16px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(200, 162, 74, 0.85)';
    ctx.fillText('AUTOMATIC CHRONOMETER', cx, cy - radius * 0.35);

    // Lower Dial Specifications
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
    texture.rotation = Math.PI / 2;
    texture.anisotropy = 8;
    return texture;
  }

  // Procedural Côtes de Genève (Geneva Stripes) for the rotor
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

  // Build the Complete Procedural 3D Watch with Exploded Component Groups
  function buildWatchModel(envMap) {
    const master = new THREE.Group();

    // Standard PBR Materials
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdfbf68,
      metalness: 0.94,
      roughness: 0.16,
      envMap: envMap,
      envMapIntensity: 1.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });

    const brushedGoldMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8a24a,
      metalness: 0.88,
      roughness: 0.32,
      envMap: envMap,
      envMapIntensity: 1.2,
    });

    const steelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee,
      metalness: 0.95,
      roughness: 0.12,
      envMap: envMap,
      envMapIntensity: 1.5,
      clearcoat: 0.6,
    });

    const brushedSteelMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6d6d6,
      metalness: 0.9,
      roughness: 0.35,
      envMap: envMap,
      envMapIntensity: 1.1,
    });

    const darkCeramicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x051a13,
      metalness: 0.2,
      roughness: 0.08,
      envMap: envMap,
      envMapIntensity: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    const sapphireMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf2f8ff,
      transmission: 0.96,
      opacity: 1,
      transparent: true,
      roughness: 0.03,
      ior: 1.77,
      reflectivity: 0.9,
      envMap: envMap,
      envMapIntensity: 2.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
    });

    const rubyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd61339,
      transmission: 0.75,
      transparent: true,
      opacity: 0.95,
      roughness: 0.08,
      ior: 1.76,
      envMap: envMap,
      envMapIntensity: 1.6,
    });

    const brassGearMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6b422,
      metalness: 0.92,
      roughness: 0.24,
      envMap: envMap,
      envMapIntensity: 1.3,
    });

    // ==========================================
    // LAYER 1: SAPPHIRE CRYSTAL (Front / Top)
    // ==========================================
    crystalGroup = new THREE.Group();
    crystalGroup.name = 'Layer_SapphireCrystal';

    const crystalGeo = new THREE.CylinderGeometry(3.38, 3.42, 0.14, 64);
    const crystalMesh = new THREE.Mesh(crystalGeo, sapphireMaterial);
    crystalMesh.rotation.x = Math.PI / 2;
    crystalGroup.add(crystalMesh);

    // Subtle AR-coating cyan halo ring
    const arHaloGeo = new THREE.TorusGeometry(3.4, 0.04, 16, 64);
    const arHaloMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
    const arHaloMesh = new THREE.Mesh(arHaloGeo, arHaloMat);
    crystalGroup.add(arHaloMesh);

    crystalGroup.position.z = 0.72;
    master.add(crystalGroup);

    // ==========================================
    // LAYER 2: BEZEL & FLUTED RING
    // ==========================================
    bezelGroup = new THREE.Group();
    bezelGroup.name = 'Layer_Bezel';

    // Outer fluted ring
    const bezelRingGeo = new THREE.TorusGeometry(3.48, 0.22, 24, 64);
    const bezelRingMesh = new THREE.Mesh(bezelRingGeo, goldMaterial);
    bezelGroup.add(bezelRingMesh);

    // Ceramic inlay insert ring
    const ceramicInlayGeo = new THREE.RingGeometry(2.95, 3.38, 64);
    const ceramicInlayMesh = new THREE.Mesh(ceramicInlayGeo, darkCeramicMaterial);
    ceramicInlayMesh.position.z = 0.08;
    bezelGroup.add(ceramicInlayMesh);

    // 60 micro-fluted notches around perimeter
    const notchGeo = new THREE.BoxGeometry(0.08, 0.22, 0.12);
    for (let i = 0; i < 60; i++) {
      const angle = (i * Math.PI) / 30;
      const notch = new THREE.Mesh(notchGeo, i % 5 === 0 ? goldMaterial : brushedGoldMaterial);
      notch.position.set(Math.cos(angle) * 3.48, Math.sin(angle) * 3.48, 0.02);
      notch.rotation.z = angle;
      bezelGroup.add(notch);
    }

    bezelGroup.position.z = 0.58;
    master.add(bezelGroup);

    // ==========================================
    // LAYER 3: HANDS (Hours, Minutes, Seconds)
    // ==========================================
    handsGroup = new THREE.Group();
    handsGroup.name = 'Layer_Hands';

    // Central jewel cap
    const capGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 32);
    const capMesh = new THREE.Mesh(capGeo, goldMaterial);
    capMesh.rotation.x = Math.PI / 2;
    handsGroup.add(capMesh);

    const capRubyGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const capRubyMesh = new THREE.Mesh(capRubyGeo, rubyMaterial);
    capRubyMesh.position.z = 0.07;
    handsGroup.add(capRubyMesh);

    // Faceted Hour Hand (Sword shape)
    hourHand = new THREE.Group();
    const hourBase = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.7, 4), goldMaterial);
    hourBase.position.y = 0.85;
    hourHand.add(hourBase);
    handsGroup.add(hourHand);

    // Faceted Minute Hand
    minuteHand = new THREE.Group();
    const minBase = new THREE.Mesh(new THREE.ConeGeometry(0.14, 2.5, 4), goldMaterial);
    minBase.position.y = 1.25;
    minuteHand.add(minBase);
    handsGroup.add(minuteHand);

    // Needle Seconds Hand
    secondHand = new THREE.Group();
    const secNeedleGeo = new THREE.CylinderGeometry(0.02, 0.03, 3.1, 16);
    const secNeedle = new THREE.Mesh(secNeedleGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.2 }));
    secNeedle.position.y = 1.25;
    secondHand.add(secNeedle);

    // Counterbalance ring
    const secCounterGeo = new THREE.TorusGeometry(0.14, 0.04, 16, 24);
    const secCounter = new THREE.Mesh(secCounterGeo, goldMaterial);
    secCounter.position.y = -0.4;
    secondHand.add(secCounter);
    handsGroup.add(secondHand);

    // Initial hand orientations (approx 10:10 luxury catalog pose)
    hourHand.rotation.z = -Math.PI / 3;
    minuteHand.rotation.z = Math.PI / 3;
    secondHand.rotation.z = -Math.PI / 6;

    handsGroup.position.z = 0.44;
    master.add(handsGroup);

    // ==========================================
    // LAYER 4: ARTISANAL DIAL FACE & INDICES
    // ==========================================
    dialGroup = new THREE.Group();
    dialGroup.name = 'Layer_Dial';

    // Dial plate
    const dialPlateGeo = new THREE.CylinderGeometry(3.32, 3.32, 0.08, 64);
    const dialPlateMat = new THREE.MeshStandardMaterial({
      map: createDialTexture(),
      metalness: 0.45,
      roughness: 0.35,
      envMap: envMap,
      envMapIntensity: 1.1,
    });
    const dialPlate = new THREE.Mesh(dialPlateGeo, dialPlateMat);
    dialPlate.rotation.x = Math.PI / 2;
    dialGroup.add(dialPlate);

    // 12 Applied 3D Faceted Gold Hour Batons
    const batonGeo = new THREE.BoxGeometry(0.16, 0.55, 0.12);
    for (let i = 0; i < 12; i++) {
      if (i === 3) continue; // Skip 3 o'clock for date window
      const angle = (i * Math.PI) / 6;
      const r = 2.75;
      const baton = new THREE.Mesh(batonGeo, goldMaterial);
      baton.position.set(Math.sin(angle) * r, Math.cos(angle) * r, 0.06);
      baton.rotation.z = -angle;
      dialGroup.add(baton);
    }
    // Double Baton at 12 o'clock
    const baton12B = new THREE.Mesh(batonGeo, goldMaterial);
    baton12B.position.set(0.14, 2.75, 0.06);
    dialGroup.add(baton12B);

    dialGroup.position.z = 0.30;
    master.add(dialGroup);

    // ==========================================
    // LAYER 5: CALIBRE AUTOMATIC MOVEMENT (The Heart)
    // ==========================================
    movementGroup = new THREE.Group();
    movementGroup.name = 'Layer_CalibreMovement';

    // Mainplate (brushed rhodium)
    const mainplateGeo = new THREE.CylinderGeometry(3.25, 3.25, 0.35, 48);
    const mainplate = new THREE.Mesh(mainplateGeo, steelMaterial);
    mainplate.rotation.x = Math.PI / 2;
    movementGroup.add(mainplate);

    // Gear Train (4 Interlocking Brass Cogs)
    const gearGeo1 = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 28);
    const gear1 = new THREE.Mesh(gearGeo1, brassGearMaterial);
    gear1.position.set(0.8, 0.7, 0.22);
    gear1.rotation.x = Math.PI / 2;
    movementGroup.add(gear1);

    const gearGeo2 = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24);
    const gear2 = new THREE.Mesh(gearGeo2, brassGearMaterial);
    gear2.position.set(-0.7, 0.85, 0.22);
    gear2.rotation.x = Math.PI / 2;
    movementGroup.add(gear2);

    const gearGeo3 = new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24);
    const gear3 = new THREE.Mesh(gearGeo3, brassGearMaterial);
    gear3.position.set(-0.9, -0.6, 0.22);
    gear3.rotation.x = Math.PI / 2;
    movementGroup.add(gear3);

    // Oscillating Balance Wheel
    balanceWheel = new THREE.Group();
    balanceWheel.position.set(0.85, -0.75, 0.24);

    const balanceRimGeo = new THREE.TorusGeometry(0.7, 0.05, 16, 32);
    const balanceRim = new THREE.Mesh(balanceRimGeo, goldMaterial);
    balanceWheel.add(balanceRim);

    // 3 Cross-spokes on balance wheel
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.35, 0.03), goldMaterial);
      spoke.rotation.z = (s * Math.PI) / 3;
      balanceWheel.add(spoke);
    }
    movementGroup.add(balanceWheel);

    // 6 Synthetic Ruby Jewels embedded across plate
    const rubyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
    const rubyPositions = [
      [0.8, 0.7, 0.27],
      [-0.7, 0.85, 0.27],
      [-0.9, -0.6, 0.27],
      [0.85, -0.75, 0.27],
      [0.0, 0.0, 0.27],
      [0.1, -1.1, 0.27],
    ];
    rubyPositions.forEach(([rx, ry, rz]) => {
      const jewel = new THREE.Mesh(rubyGeo, rubyMaterial);
      jewel.position.set(rx, ry, rz);
      jewel.rotation.x = Math.PI / 2;
      movementGroup.add(jewel);
    });

    movementGroup.position.z = 0.02;
    master.add(movementGroup);

    // Rotor (Oscillating Winding Weight) in its own sub-group
    rotorGroup = new THREE.Group();
    rotorGroup.name = 'Layer_Rotor';

    const rotorGeo = new THREE.CylinderGeometry(3.05, 3.05, 0.12, 48, 1, false, 0, Math.PI * 0.95);
    const rotorMat = new THREE.MeshStandardMaterial({
      map: createGenevaStripesTexture(),
      metalness: 0.88,
      roughness: 0.28,
      envMap: envMap,
      envMapIntensity: 1.4,
    });
    rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
    rotorMesh.rotation.x = Math.PI / 2;
    rotorMesh.rotation.y = Math.PI; // Face outwards toward back
    rotorGroup.add(rotorMesh);

    // Gold outer rim weight on rotor
    const rotorWeightGeo = new THREE.CylinderGeometry(3.15, 3.15, 0.16, 48, 1, false, 0, Math.PI * 0.95);
    const rotorWeight = new THREE.Mesh(rotorWeightGeo, goldMaterial);
    rotorWeight.rotation.x = Math.PI / 2;
    rotorWeight.rotation.y = Math.PI;
    rotorGroup.add(rotorWeight);

    rotorGroup.position.z = -0.22;
    master.add(rotorGroup);

    // ==========================================
    // LAYER 6: 316L SURGICAL STEEL CASE & LUGS & CROWN
    // ==========================================
    caseGroup = new THREE.Group();
    caseGroup.name = 'Layer_Case';

    // Main Case Cylinder
    const caseGeo = new THREE.CylinderGeometry(3.62, 3.62, 0.75, 64);
    const caseMesh = new THREE.Mesh(caseGeo, brushedSteelMaterial);
    caseMesh.rotation.x = Math.PI / 2;
    caseGroup.add(caseMesh);

    // 4 Curved Ergonomic Lugs
    const lugGeo = new THREE.BoxGeometry(0.48, 1.4, 0.65);
    const lugPositions = [
      [-1.9, 3.5, 0],
      [1.9, 3.5, 0],
      [-1.9, -3.5, 0],
      [1.9, -3.5, 0],
    ];
    lugPositions.forEach(([lx, ly, lz]) => {
      const lug = new THREE.Mesh(lugGeo, steelMaterial);
      lug.position.set(lx, ly, lz);
      lug.rotation.z = ly > 0 ? (lx > 0 ? -0.15 : 0.15) : (lx > 0 ? 0.15 : -0.15);
      caseGroup.add(lug);
    });

    // Fluted Winding Crown at 3 o'clock
    const crownGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.42, 24);
    const crown = new THREE.Mesh(crownGeo, goldMaterial);
    crown.position.set(3.85, 0, 0);
    crown.rotation.z = Math.PI / 2;
    caseGroup.add(crown);

    // 2 Chronograph Pushers at 2 and 4 o'clock
    const pusherGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.35, 16);
    const pusher1 = new THREE.Mesh(pusherGeo, steelMaterial);
    pusher1.position.set(3.65, 1.8, 0);
    pusher1.rotation.z = Math.PI / 2.8;
    caseGroup.add(pusher1);

    const pusher2 = new THREE.Mesh(pusherGeo, steelMaterial);
    pusher2.position.set(3.65, -1.8, 0);
    pusher2.rotation.z = Math.PI / 1.5;
    caseGroup.add(pusher2);

    caseGroup.position.z = -0.42;
    master.add(caseGroup);

    // ==========================================
    // LAYER 7: EXHIBITION SAPPHIRE CASEBACK
    // ==========================================
    casebackGroup = new THREE.Group();
    casebackGroup.name = 'Layer_Caseback';

    const casebackRimGeo = new THREE.TorusGeometry(3.25, 0.35, 24, 64);
    const casebackRim = new THREE.Mesh(casebackRimGeo, steelMaterial);
    casebackGroup.add(casebackRim);

    // Exhibition back glass
    const backGlassGeo = new THREE.CylinderGeometry(2.9, 2.9, 0.08, 48);
    const backGlass = new THREE.Mesh(backGlassGeo, sapphireMaterial);
    backGlass.rotation.x = Math.PI / 2;
    casebackGroup.add(backGlass);

    casebackGroup.position.z = -0.75;
    master.add(casebackGroup);

    // ==========================================
    // LAYER 8: ARTISANAL MULTI-LINK BRACELET
    // ==========================================
    strapTopGroup = new THREE.Group();
    strapBottomGroup = new THREE.Group();

    const linkGeo = new THREE.BoxGeometry(3.2, 0.55, 0.28);
    for (let k = 0; k < 5; k++) {
      // Top link
      const linkTop = new THREE.Mesh(linkGeo, k % 2 === 0 ? brushedSteelMaterial : goldMaterial);
      linkTop.position.set(0, 4.3 + k * 0.58, -k * 0.12);
      strapTopGroup.add(linkTop);

      // Bottom link
      const linkBottom = new THREE.Mesh(linkGeo, k % 2 === 0 ? brushedSteelMaterial : goldMaterial);
      linkBottom.position.set(0, -4.3 - k * 0.58, -k * 0.12);
      strapBottomGroup.add(linkBottom);
    }
    master.add(strapTopGroup);
    master.add(strapBottomGroup);

    return master;
  }

  // Set up GSAP ScrollTrigger Exploded Storytelling Timeline
  function setupScrollAnimation() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded; falling back to interaction mode.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const triggerElem = document.getElementById('watch-experience');
    if (!triggerElem) return;

    // Base positions when assembled
    const assembledPositions = {
      crystalZ: 0.72,
      bezelZ: 0.58,
      handsZ: 0.44,
      dialZ: 0.30,
      movementZ: 0.02,
      rotorZ: -0.22,
      caseZ: -0.42,
      casebackZ: -0.75,
      strapTopY: 0,
      strapBottomY: 0,
    };

    // Target positions when fully exploded
    const explodedPositions = {
      crystalZ: 4.2,
      bezelZ: 2.9,
      handsZ: 1.85,
      dialZ: 0.95,
      movementZ: -0.2,
      rotorZ: -1.45,
      caseZ: -0.7,
      casebackZ: -2.8,
      strapTopY: 1.8,
      strapBottomY: -1.8,
    };

    // Text cards elements
    const cards = [
      document.getElementById('watch-card-1'),
      document.getElementById('watch-card-2'),
      document.getElementById('watch-card-3'),
      document.getElementById('watch-card-4'),
      document.getElementById('watch-card-5'),
    ].filter(Boolean);

    // If reduced motion is requested by user, display clean static exploded layout with manual controls
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach((c) => {
        c.style.opacity = '1';
        c.style.transform = 'none';
        c.style.position = 'relative';
      });
      return;
    }

    // Timeline pinned across 350vh scroll distance
    scrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElem,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        pin: '#watch-pin-container',
        anticipatePin: 1,
      },
    });

    // ----------------------------------------------------
    // PHASE 1: Assembled Overview -> 3D Isometric View (0.0 -> 0.25)
    // ----------------------------------------------------
    scrollTimeline
      .to(watchGroup.rotation, {
        x: 0.45,
        y: -0.75,
        z: 0.2,
        duration: 2,
        ease: 'power2.inOut',
      }, 0)
      .to(camera.position, {
        z: 14.5,
        duration: 2,
        ease: 'power2.inOut',
      }, 0);

    if (cards[0] && cards[1]) {
      scrollTimeline
        .to(cards[0], { opacity: 0, y: -25, duration: 0.6 }, 1.4)
        .fromTo(cards[1], { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6 }, 1.8);
    }

    // ----------------------------------------------------
    // PHASE 2: Explode Components Apart (0.25 -> 0.55)
    // ----------------------------------------------------
    scrollTimeline
      .to(crystalGroup.position, { z: explodedPositions.crystalZ, duration: 3, ease: 'power2.out' }, 2)
      .to(bezelGroup.position, { z: explodedPositions.bezelZ, duration: 3, ease: 'power2.out' }, 2)
      .to(handsGroup.position, { z: explodedPositions.handsZ, duration: 3, ease: 'power2.out' }, 2)
      .to(dialGroup.position, { z: explodedPositions.dialZ, duration: 3, ease: 'power2.out' }, 2)
      .to(movementGroup.position, { z: explodedPositions.movementZ, duration: 3, ease: 'power2.out' }, 2)
      .to(rotorGroup.position, { z: explodedPositions.rotorZ, duration: 3, ease: 'power2.out' }, 2)
      .to(caseGroup.position, { z: explodedPositions.caseZ, duration: 3, ease: 'power2.out' }, 2)
      .to(casebackGroup.position, { z: explodedPositions.casebackZ, duration: 3, ease: 'power2.out' }, 2)
      .to(strapTopGroup.position, { y: explodedPositions.strapTopY, duration: 3, ease: 'power2.out' }, 2)
      .to(strapBottomGroup.position, { y: explodedPositions.strapBottomY, duration: 3, ease: 'power2.out' }, 2);

    if (cards[1] && cards[2]) {
      scrollTimeline
        .to(cards[1], { opacity: 0, y: -25, duration: 0.6 }, 3.6)
        .fromTo(cards[2], { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6 }, 4.0);
    }

    // ----------------------------------------------------
    // PHASE 3: Rotate to showcase Mechanical Movement (0.55 -> 0.75)
    // ----------------------------------------------------
    scrollTimeline
      .to(watchGroup.rotation, {
        x: 0.25,
        y: 1.85,
        z: -0.15,
        duration: 3,
        ease: 'power2.inOut',
      }, 4.5)
      .to(camera.position, {
        z: 13.5,
        duration: 3,
        ease: 'power1.inOut',
      }, 4.5);

    if (cards[2] && cards[3]) {
      scrollTimeline
        .to(cards[2], { opacity: 0, y: -25, duration: 0.6 }, 5.8)
        .fromTo(cards[3], { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6 }, 6.2);
    }

    // ----------------------------------------------------
    // PHASE 4: Precision Convergence / Reassembly (0.75 -> 1.0)
    // ----------------------------------------------------
    scrollTimeline
      .to(crystalGroup.position, { z: assembledPositions.crystalZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(bezelGroup.position, { z: assembledPositions.bezelZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(handsGroup.position, { z: assembledPositions.handsZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(dialGroup.position, { z: assembledPositions.dialZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(movementGroup.position, { z: assembledPositions.movementZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(rotorGroup.position, { z: assembledPositions.rotorZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(caseGroup.position, { z: assembledPositions.caseZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(casebackGroup.position, { z: assembledPositions.casebackZ, duration: 3, ease: 'power3.inOut' }, 7)
      .to(strapTopGroup.position, { y: assembledPositions.strapTopY, duration: 3, ease: 'power3.inOut' }, 7)
      .to(strapBottomGroup.position, { y: assembledPositions.strapBottomY, duration: 3, ease: 'power3.inOut' }, 7)
      .to(watchGroup.rotation, {
        x: 0.1,
        y: 0.0,
        z: 0.0,
        duration: 3,
        ease: 'power3.inOut',
      }, 7)
      .to(camera.position, {
        z: 16.0,
        duration: 3,
        ease: 'power3.inOut',
      }, 7);

    if (cards[3] && cards[4]) {
      scrollTimeline
        .to(cards[3], { opacity: 0, y: -25, duration: 0.6 }, 7.6)
        .fromTo(cards[4], { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6 }, 8.0);
    }
  }

  // Initialize the Entire 3D Experience
  function initWatch3DExperience() {
    const container = document.getElementById('watch-3d-container');
    const canvas = document.getElementById('watch-canvas');
    const loadingEl = document.getElementById('watch-loading');
    const fallbackEl = document.getElementById('watch-fallback');

    if (!container || !canvas) return;

    // Check WebGL support
    if (!isWebGLAvailable()) {
      console.warn('WebGL is not supported in this browser. Displaying luxury fallback.');
      if (loadingEl) loadingEl.style.display = 'none';
      if (fallbackEl) fallbackEl.classList.remove('hidden');
      return;
    }

    try {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // 1. Scene & Camera Setup
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0, 16);

      // 2. High-Performance WebGL Renderer
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.outputEncoding = THREE.sRGBEncoding;

      // 3. Studio Reflections Environment
      const envMap = createStudioEnvironment(renderer);
      scene.environment = envMap;

      // 4. Directional & Rim Studio Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfffaec, 2.2);
      keyLight.position.set(6, 8, 10);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
      fillLight.position.set(-8, -4, 6);
      scene.add(fillLight);

      const goldRimLight = new THREE.DirectionalLight(0xc8a24a, 2.8);
      goldRimLight.position.set(0, -9, -6);
      scene.add(goldRimLight);

      const topSpecular = new THREE.PointLight(0xffffff, 1.5, 30);
      topSpecular.position.set(0, 7, 8);
      scene.add(topSpecular);

      // 5. Build Procedural Watch
      watchGroup = buildWatchModel(envMap);
      scene.add(watchGroup);

      // 6. Fade Out Loading Indicator
      if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => {
          loadingEl.style.display = 'none';
        }, 500);
      }

      // 7. Interactive Drag-to-Rotate Support
      canvas.addEventListener('mousedown', (e) => {
        isInteracting = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      window.addEventListener('mousemove', (e) => {
        // Subtle mouse parallax tilt when not dragging
        const rect = container.getBoundingClientRect();
        if (rect.top <= window.innerHeight && rect.bottom >= 0) {
          const normX = (e.clientX / window.innerWidth) * 2 - 1;
          const normY = -(e.clientY / window.innerHeight) * 2 + 1;
          mouseTilt.targetX = normX * 0.18;
          mouseTilt.targetY = normY * 0.14;
        }

        if (!isInteracting) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        manualRotation.y += deltaX * 0.006;
        manualRotation.x += deltaY * 0.006;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      window.addEventListener('mouseup', () => {
        isInteracting = false;
      });

      // Touch interaction
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isInteracting = true;
          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isInteracting || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        manualRotation.y += deltaX * 0.008;
        manualRotation.x += deltaY * 0.008;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }, { passive: true });

      window.addEventListener('touchend', () => {
        isInteracting = false;
      });

      // 8. Responsive Resize Handler
      const handleResize = () => {
        if (!container || !camera || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        if (w < 640) {
          camera.fov = 48;
          camera.position.z = 21;
        } else if (w < 1024) {
          camera.fov = 42;
          camera.position.z = 18;
        } else {
          camera.fov = 38;
          camera.position.z = 16;
        }
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      // 9. Visibility Throttling (0% CPU when scrolled away)
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
          });
        }, { threshold: 0.05 });
        obs.observe(container);
      }

      // 10. GSAP ScrollTrigger Setup
      setupScrollAnimation();

      // 11. Render Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (!isVisible) return;

        const elapsedTime = clock.getElapsedTime();

        // Realistic seconds hand movement
        if (secondHand) {
          secondHand.rotation.z = -(elapsedTime * (Math.PI / 30)) % (Math.PI * 2);
        }
        if (minuteHand) {
          minuteHand.rotation.z = -((elapsedTime / 60) * (Math.PI / 30)) + Math.PI / 3;
        }

        // Mechanical Balance Wheel rapid oscillation (4 Hz = 28,800 vph)
        if (balanceWheel) {
          balanceWheel.rotation.z = Math.sin(elapsedTime * 25) * 0.45;
        }

        // Automatic Rotor subtle inertia swing
        if (rotorMesh) {
          rotorMesh.rotation.z = Math.sin(elapsedTime * 1.5) * 0.35;
        }

        // Smooth mouse parallax lerp
        mouseTilt.x += (mouseTilt.targetX - mouseTilt.x) * 0.05;
        mouseTilt.y += (mouseTilt.targetY - mouseTilt.y) * 0.05;

        // Apply interactive user drag rotation with spring return
        if (!isInteracting) {
          manualRotation.x *= 0.95;
          manualRotation.y *= 0.95;
        }

        if (watchGroup) {
          watchGroup.rotation.x += (mouseTilt.y + manualRotation.x) * 0.02;
          watchGroup.rotation.y += (mouseTilt.x + manualRotation.y) * 0.02;
        }

        renderer.render(scene, camera);
      };

      animate();
    } catch (err) {
      console.error('Watch 3D Initialization Error:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (fallbackEl) fallbackEl.classList.remove('hidden');
    }
  }

  // Teardown / Cleanup
  function disposeWatch3DExperience() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (scrollTimeline) {
      scrollTimeline.kill();
    }
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    }
    if (renderer) {
      renderer.dispose();
    }
    if (scene) {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  }

  // Expose global methods
  window.initWatch3DExperience = initWatch3DExperience;
  window.disposeWatch3DExperience = disposeWatch3DExperience;
})();
