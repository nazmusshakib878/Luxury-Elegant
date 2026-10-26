'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';

export default function FlagshipCinematicShowcase() {
  const { addToCart } = useCart();
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  const containerRef = useRef(null);
  const canvasMountRef = useRef(null);
  const isPausedRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const audioContextRef = useRef(null);
  const oscillatorGainRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Three.js 3D Cinematic Commercial Video Animation Engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let scene, camera, renderer, animationFrameId;
    let headphonesModel, particles, gleamLight, rimLight, causticAura;
    let isVisible = true;
    let animTime = 0;
    let lastTime = performance.now();
    let resizeObserver, intersectionObserver;

    function initScene() {
      const THREE = window.THREE;
      if (!THREE || !canvasMountRef.current) return;

      const mount = canvasMountRef.current;
      const width = mount.clientWidth || 1200;
      const height = mount.clientHeight || 540;

      // 1. Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
      camera.position.set(0, 0, 8.5);

      // 2. High-Performance WebGL Renderer
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
      } catch (e) {
        console.warn('WebGL initialization fallback:', e);
        setHasWebGL(false);
        return;
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);

      // Studio Reflection HDRI Map for PBR Metallic Glints
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const sc = document.createElement('canvas');
        sc.width = 1024;
        sc.height = 512;
        const sctx = sc.getContext('2d');
        const sgrad = sctx.createLinearGradient(0, 0, 0, 512);
        sgrad.addColorStop(0, '#0d3829');
        sgrad.addColorStop(0.5, '#051810');
        sgrad.addColorStop(1, '#020a06');
        sctx.fillStyle = sgrad;
        sctx.fillRect(0, 0, 1024, 512);

        // Overhead softbox
        const soft = sctx.createRadialGradient(512, 100, 10, 512, 100, 360);
        soft.addColorStop(0, 'rgba(255, 255, 255, 1)');
        soft.addColorStop(0.4, 'rgba(255, 248, 220, 0.8)');
        soft.addColorStop(1, 'rgba(0, 0, 0, 0)');
        sctx.fillStyle = soft;
        sctx.fillRect(100, 10, 824, 220);

        // Gold rim strip
        const sStrip = sctx.createLinearGradient(820, 0, 940, 0);
        sStrip.addColorStop(0, 'rgba(0, 0, 0, 0)');
        sStrip.addColorStop(0.5, 'rgba(245, 215, 127, 0.95)');
        sStrip.addColorStop(1, 'rgba(0, 0, 0, 0)');
        sctx.fillStyle = sStrip;
        sctx.fillRect(820, 80, 120, 340);

        const stex = new THREE.CanvasTexture(sc);
        stex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmrem.fromEquirectangular(stex).texture;
        pmrem.dispose();
      } catch (err) {
        console.warn('EnvMap error:', err);
      }

      // 3. Cinematic Studio Lighting Rig
      const ambientLight = new THREE.AmbientLight(0x143c2c, 1.4); // Rich emerald studio atmosphere
      scene.add(ambientLight);

      // Main overhead beauty key light
      const keyLight = new THREE.DirectionalLight(0xfffaec, 3.4);
      keyLight.position.set(4.5, 5.5, 5.5);
      scene.add(keyLight);

      // Direct front beauty key light (illuminates the product face crisp & clear)
      const frontKeyLight = new THREE.PointLight(0xfff5e4, 2.8, 18);
      frontKeyLight.position.set(2.45, 0.4, 4.8);
      scene.add(frontKeyLight);

      // Cool studio fill light for depth separation
      const fillLight = new THREE.DirectionalLight(0x8ec5ff, 1.0);
      fillLight.position.set(-4.5, 2.5, 3.5);
      scene.add(fillLight);

      // 18K Champagne Gold rim light
      rimLight = new THREE.PointLight(0xffe292, 4.6, 24);
      rimLight.position.set(4.2, 3.0, -2.2);
      scene.add(rimLight);

      // Subtle emerald kicker light behind product
      const kickerLight = new THREE.PointLight(0x10b981, 2.6, 16);
      kickerLight.position.set(1.5, -1.2, -1.8);
      scene.add(kickerLight);

      // Orbital Anamorphic Commercial Gleam Light
      gleamLight = new THREE.PointLight(0xffeed0, 3.6, 14);
      gleamLight.position.set(2.45, 0, 3.5);
      scene.add(gleamLight);

      // 4. Volumetric Caustic Halo Disc (Behind Product)
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 512;
      haloCanvas.height = 512;
      const hctx = haloCanvas.getContext('2d');
      const hgrad = hctx.createRadialGradient(256, 256, 10, 256, 256, 250);
      hgrad.addColorStop(0, 'rgba(16, 185, 129, 0.40)');
      hgrad.addColorStop(0.35, 'rgba(200, 162, 74, 0.22)');
      hgrad.addColorStop(0.75, 'rgba(6, 40, 28, 0.08)');
      hgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      hctx.fillStyle = hgrad;
      hctx.fillRect(0, 0, 512, 512);

      const haloTexture = new THREE.CanvasTexture(haloCanvas);
      const haloGeo = new THREE.PlaneGeometry(7.5, 7.5);
      const haloMat = new THREE.MeshBasicMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      causticAura = new THREE.Mesh(haloGeo, haloMat);
      causticAura.position.set(width >= 1024 ? 2.45 : 1.15, -0.28, -1.8);
      scene.add(causticAura);

      // 5. 3D Floating Golden Bokeh Sparks
      const particleCount = 55;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      const speedArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] = (Math.random() - 0.2) * 8.0;
        posArray[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 4.5;

        speedArray[i * 3] = (Math.random() - 0.5) * 0.003;
        speedArray[i * 3 + 1] = 0.004 + Math.random() * 0.006;
        speedArray[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      // Particle Circular Glow Texture
      const sparkCanvas = document.createElement('canvas');
      sparkCanvas.width = 64;
      sparkCanvas.height = 64;
      const sctx = sparkCanvas.getContext('2d');
      const sgrad = sctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      sgrad.addColorStop(0, '#ffffff');
      sgrad.addColorStop(0.3, '#f5d77f');
      sgrad.addColorStop(0.7, 'rgba(200, 162, 74, 0.4)');
      sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = sgrad;
      sctx.fillRect(0, 0, 64, 64);
      const sparkTexture = new THREE.CanvasTexture(sparkCanvas);

      const particleMat = new THREE.PointsMaterial({
        size: 0.22,
        map: sparkTexture,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // 6. Build High-Precision 3D Headphones Master Model
      headphonesModel = new THREE.Group();

      const matteObsidianMat = new THREE.MeshPhysicalMaterial({
        color: 0x1f272a, // Rich graphite/obsidian
        metalness: 0.65,
        roughness: 0.18,
        clearcoat: 0.85,
        clearcoatRoughness: 0.06,
      });

      const champagneGoldMat = new THREE.MeshPhysicalMaterial({
        color: 0xf6d78a,
        emissive: 0x3d2b07,
        emissiveIntensity: 0.18,
        metalness: 0.98,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      });

      const brushedTitaniumMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.96,
        roughness: 0.14,
      });

      const cushionLeatherMat = new THREE.MeshStandardMaterial({
        color: 0x14181a,
        roughness: 0.88,
        metalness: 0.02,
      });

      // Headband Arched Spring-Steel Band
      const bandCurveGeo = new THREE.TorusGeometry(2.35, 0.16, 24, 60, Math.PI);
      const bandMesh = new THREE.Mesh(bandCurveGeo, brushedTitaniumMat);
      headphonesModel.add(bandMesh);

      // Ergonomic Ribbed Leather Underside Cushion
      const cushionCurveGeo = new THREE.TorusGeometry(2.22, 0.15, 18, 50, Math.PI * 0.75);
      const cushionMesh = new THREE.Mesh(cushionCurveGeo, cushionLeatherMat);
      cushionMesh.rotation.z = Math.PI * 0.125;
      headphonesModel.add(cushionMesh);

      // Left & Right Telescoping Slider Yokes & Acoustic Cups
      function createYokeAndShell(isRight) {
        const sideG = new THREE.Group();
        const sign = isRight ? 1 : -1;

        // Slider Arm
        const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.12);
        const arm = new THREE.Mesh(armGeo, champagneGoldMat);
        arm.position.set(sign * 2.35, -0.2, 0);

        // Cup & Fork Swivel Assembly
        const swivelG = new THREE.Group();
        swivelG.position.set(sign * 2.35, -1.1, 0);

        // U-Fork Cradling the Acoustic Cup
        const forkCurve = new THREE.TorusGeometry(1.24, 0.07, 16, 36, Math.PI);
        const fork = new THREE.Mesh(forkCurve, champagneGoldMat);
        fork.rotation.set(0, Math.PI / 2, 0);

        // Pivot Pins
        const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16);
        const pinF = new THREE.Mesh(pinGeo, brushedTitaniumMat);
        pinF.rotation.x = Math.PI / 2;
        pinF.position.set(0, 0, 1.24);

        const pinR = new THREE.Mesh(pinGeo, brushedTitaniumMat);
        pinR.rotation.x = Math.PI / 2;
        pinR.position.set(0, 0, -1.24);

        // Acoustic Cup Shell Assembly
        const cupG = new THREE.Group();

        // Outer Obsidian Shell Dome
        const domeGeo = new THREE.CylinderGeometry(1.14, 1.20, 0.48, 48);
        const dome = new THREE.Mesh(domeGeo, matteObsidianMat);
        dome.rotation.z = Math.PI / 2;

        // Diamond-Cut Champagne Gold Chamfer Ring (outer face)
        const rimGeo = new THREE.TorusGeometry(1.20, 0.07, 16, 48);
        const rim = new THREE.Mesh(rimGeo, champagneGoldMat);
        rim.rotation.y = Math.PI / 2;
        rim.position.x = -0.16;

        // Spun-Gold Logo Medallion (outer face)
        const logoGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.06, 32);
        const logo = new THREE.Mesh(logoGeo, champagneGoldMat);
        logo.rotation.z = Math.PI / 2;
        logo.position.x = -0.26;

        // Concentric acoustic engraving ring on outer face
        const innerRingGeo = new THREE.TorusGeometry(0.78, 0.035, 16, 40);
        const innerRing = new THREE.Mesh(innerRingGeo, champagneGoldMat);
        innerRing.rotation.y = Math.PI / 2;
        innerRing.position.x = -0.24;

        // Memory Foam Ear Cushion (inner face)
        const earcupCushionGeo = new THREE.TorusGeometry(1.10, 0.32, 24, 48);
        const earcupCushion = new THREE.Mesh(earcupCushionGeo, cushionLeatherMat);
        earcupCushion.rotation.y = Math.PI / 2;
        earcupCushion.position.x = 0.34;

        // Titanium Speaker Grille Plate (inner face)
        const grilleGeo = new THREE.CircleGeometry(0.90, 32);
        const grilleMat = new THREE.MeshStandardMaterial({
          color: 0x1f2428,
          roughness: 0.35,
          metalness: 0.85,
        });
        const grille = new THREE.Mesh(grilleGeo, grilleMat);
        grille.rotation.y = Math.PI / 2;
        grille.position.x = 0.35;

        cupG.add(dome, rim, logo, innerRing, earcupCushion, grille);

        // Physical Gold Crown/Dial on the right cup
        if (isRight) {
          const dialGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24);
          const dial = new THREE.Mesh(dialGeo, champagneGoldMat);
          dial.position.set(-0.20, -1.02, 0.45);
          dial.rotation.x = Math.PI / 4;
          cupG.add(dial);
        }

        swivelG.add(fork, pinF, pinR, cupG);

        // Turn outer metallic cup with diamond chamfer & gold logo medallion towards the viewer
        swivelG.rotation.y = isRight ? Math.PI * 0.62 : Math.PI * 0.38;

        sideG.add(arm, swivelG);
        return sideG;
      }

      headphonesModel.add(createYokeAndShell(false));
      headphonesModel.add(createYokeAndShell(true));

      // Initial placement: Positioned gracefully on the right half of the banner
      const isDesktop = width >= 1024;
      const baseX = isDesktop ? 2.45 : 1.15;
      const baseY = -0.28;
      headphonesModel.position.set(baseX, baseY, 0);
      headphonesModel.scale.set(0.92, 0.92, 0.92);
      headphonesModel.rotation.set(0.12, -0.35, 0.04);
      scene.add(headphonesModel);

      // 7. Continuous 60FPS Cinematic Render Loop
      function animate(timestamp) {
        animationFrameId = requestAnimationFrame(animate);

        const delta = Math.min((timestamp - lastTime) * 0.001, 0.1);
        lastTime = timestamp;

        if (!isVisible || !renderer || !scene || !camera) return;

        if (!isPausedRef.current) {
          animTime += delta;

          // Smooth Slow 3D Turntable Yaw & Pitch
          const targetYaw = -0.35 + Math.sin(animTime * 0.42) * 0.32 + mousePosRef.current.x * 0.28;
          const targetPitch = 0.12 + Math.cos(animTime * 0.32) * 0.10 + mousePosRef.current.y * 0.18;
          const targetRoll = 0.04 + Math.sin(animTime * 0.24) * 0.04;

          headphonesModel.rotation.y += (targetYaw - headphonesModel.rotation.y) * 0.08;
          headphonesModel.rotation.x += (targetPitch - headphonesModel.rotation.x) * 0.08;
          headphonesModel.rotation.z += (targetRoll - headphonesModel.rotation.z) * 0.08;

          // Weightless Ambient Floating Bob
          headphonesModel.position.y = baseY + Math.sin(animTime * 0.72) * 0.12;

          // Cinematic Breathing Camera Zoom & Subtle Orbit Pan
          camera.position.z = 8.4 + Math.sin(animTime * 0.22) * 0.32;
          camera.position.x = Math.sin(animTime * 0.16) * 0.18;

          // Traveling Anamorphic Commercial Light Sweep
          if (gleamLight) {
            gleamLight.position.x = headphonesModel.position.x + Math.sin(animTime * 0.85) * 3.0;
            gleamLight.position.y = headphonesModel.position.y + Math.cos(animTime * 0.65) * 2.0;
            gleamLight.position.z = 2.8 + Math.sin(animTime * 1.1) * 1.2;
          }

          // Volumetric Caustic Glow Pulsation
          if (causticAura) {
            const auraScale = 1.0 + Math.sin(animTime * 0.5) * 0.08;
            causticAura.scale.set(auraScale, auraScale, 1);
          }

          // 3D Particles Float & Twinkle
          if (particles) {
            const pos = particleGeo.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
              pos[i * 3 + 1] += speedArray[i * 3 + 1];
              pos[i * 3] += speedArray[i * 3] + Math.sin(animTime + i) * 0.001;

              // Wrap particles around when drifting too high
              if (pos[i * 3 + 1] > 3.5) {
                pos[i * 3 + 1] = -3.5;
                pos[i * 3] = headphonesModel.position.x + (Math.random() - 0.5) * 5.0;
              }
            }
            particleGeo.attributes.position.needsUpdate = true;
          }
        }

        renderer.render(scene, camera);
      }

      animationFrameId = requestAnimationFrame(animate);

      // 8. Responsive Resize Handling
      resizeObserver = new ResizeObserver(() => {
        if (!mount || !renderer || !camera) return;
        const newW = mount.clientWidth;
        const newH = mount.clientHeight;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);

          // Adapt product centering for mobile vs desktop
          if (headphonesModel) {
            headphonesModel.position.x = newW >= 1024 ? 2.45 : 1.15;
            if (causticAura) {
              causticAura.position.x = headphonesModel.position.x;
            }
          }
        }
      });
      resizeObserver.observe(mount);

      // 9. Intersection Observer (Freeze when out of viewport for max performance)
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
          });
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(mount);
    }

    // Check for Three.js availability with polling fallback
    let pollCount = 0;
    const checkThree = setInterval(() => {
      pollCount++;
      if (window.THREE && canvasMountRef.current) {
        clearInterval(checkThree);
        initScene();
      } else if (pollCount > 30) {
        clearInterval(checkThree);
        console.warn('Three.js load timeout; falling back to high-res poster.');
        setHasWebGL(false);
      }
    }, 100);

    return () => {
      clearInterval(checkThree);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      if (renderer) {
        renderer.dispose();
      }
      scene = null;
      camera = null;
    };
  }, []);

  // Mouse Parallax Listener
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mousePosRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { x: 0, y: 0 };
  };

  // Toggle ambient luxury acoustic tone using Web Audio API
  const handleToggleSound = () => {
    if (isMuted) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          if (!audioContextRef.current) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            // Ambient chord synthesis (warm luxury low frequency pad)
            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
            masterGain.connect(ctx.destination);
            oscillatorGainRef.current = masterGain;

            // Create 3 harmonic oscillators (130Hz, 196Hz, 261Hz - C3, G3, C4 warm triad)
            [130.81, 196.0, 261.63].forEach((freq) => {
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime);
              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(450, ctx.currentTime);
              osc.connect(filter);
              filter.connect(masterGain);
              osc.start();
            });
          } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          if (oscillatorGainRef.current) {
            oscillatorGainRef.current.gain.linearRampToValueAtTime(0.08, audioContextRef.current.currentTime + 0.3);
          }
        }
      } catch (err) {
        console.warn('Web Audio playback error:', err);
      }
      setIsMuted(false);
    } else {
      if (audioContextRef.current && oscillatorGainRef.current) {
        oscillatorGainRef.current.gain.linearRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.3);
      }
      setIsMuted(true);
    }
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleInspectInAtelier = () => {
    const atelierEl = document.getElementById('interactive-atelier-3d');
    if (atelierEl) {
      atelierEl.scrollIntoView({ behavior: 'smooth' });
    }
    if (typeof window !== 'undefined' && window.Product3DExperience) {
      window.Product3DExperience.switchModel('headphones');
    }
  };

  const handleAddToCart = () => {
    const headphoneProduct = {
      id: 4,
      name: 'Aura Pro Studio Wireless Headphones',
      price: 8900,
      price_now: 6990,
      sale_price: 6990,
      image: '/images/prod-4.jpg',
      cat: 'Electronics',
    };
    addToCart(headphoneProduct);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2600);
  };

  return (
    <section
      id="flagship-creation"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="video-ad-container"
      style={{
        margin: '2.5rem 0',
      }}
    >
      {/* 1. Underlying Base Background Atmosphere */}
      <img
        src="/images/headphone-cinematic.jpg"
        alt="Aura Pro Studio Wireless Headphones Cinematic Showcase"
        className={`video-ad-media ${isPaused ? 'cinematic-drift-paused' : 'cinematic-drift'}`}
        style={{
          opacity: hasWebGL ? 0.35 : 0.95,
          filter: hasWebGL ? 'blur(12px) brightness(0.6)' : 'none',
          transform: 'scale(1.05)',
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/images/prod-4.jpg';
        }}
      />

      {/* 2. Real-Time 3D WebGL Cinematic Commercial Video Canvas */}
      {/* 2. Atmospheric Vignette & Text Contrast Protection Overlay */}
      <div className="video-ad-overlay" />

      {/* 3. Real-Time 3D WebGL Cinematic Commercial Video Canvas */}
      <div
        ref={canvasMountRef}
        className="flagship-3d-canvas-wrap"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
          display: hasWebGL ? 'block' : 'none',
        }}
      />

      {/* 4. Anamorphic Commercial Lens Flare Light Streak */}
      <div className={`cinematic-flare-sweep ${isPaused ? 'cinematic-flare-paused' : ''}`} />

      {/* 5. Main Foreground Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '480px',
          color: '#ffffff',
          pointerEvents: 'auto',
        }}
      >
        {/* Top Badges & Interactive Audio/Play Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* 3D Craftsmanship Cinematic Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(12px)',
              padding: '0.4rem 1rem',
              border: '1px solid rgba(200, 162, 74, 0.35)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#c8a24a',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '9999px',
                backgroundColor: isPaused ? '#f59e0b' : '#10b981',
                boxShadow: isPaused ? '0 0 10px #f59e0b' : '0 0 10px #10b981',
                transition: 'all 0.3s ease',
              }}
            />
            <span>● ✦ 3D CRAFTSMANSHIP CINEMATIC</span>
          </div>

          {/* Right Controls: Sound (with audio wave visualizer) and Play/Pause */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Animated Equalizer Waveform when Sound is ON */}
            {!isMuted && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  height: '24px',
                  padding: '0 8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200, 162, 74, 0.3)',
                }}
              >
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
              </div>
            )}

            <button
              onClick={handleToggleSound}
              className="video-control-btn"
              title={isMuted ? 'Turn on ambient acoustic tuning' : 'Mute ambient sound'}
              aria-label="Sound Toggle"
            >
              <span style={{ fontSize: '1.1rem' }}>{isMuted ? '🔇' : '🔊'}</span>
            </button>
            <button
              onClick={handleTogglePause}
              className="video-control-btn"
              title={isPaused ? 'Resume cinematic motion' : 'Pause cinematic motion'}
              aria-label="Play/Pause Toggle"
            >
              <span style={{ fontSize: '1.1rem' }}>{isPaused ? '▶' : '⏸'}</span>
            </button>
          </div>
        </div>

        {/* Central Editorial Content (Focused on Headphones) */}
        <div style={{ maxWidth: '38rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
          <p
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#c8a24a',
            }}
          >
            FLAGSHIP CREATION
          </p>

          <h2
            className="font-serif"
            style={{
              margin: 0,
              fontSize: 'clamp(2rem, 4.2vw, 3.4rem)',
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            Precision in Motion.{' '}
            <span style={{ color: '#c8a24a', fontStyle: 'italic', fontWeight: 400 }}>
              Sound in Perfection.
            </span>
          </h2>

          <p
            style={{
              marginTop: '1rem',
              fontSize: '1rem',
              color: '#e7e5e4',
              lineHeight: 1.65,
              fontWeight: 300,
            }}
          >
            Experience our 2026 flagship curation — forged from surgical-grade acoustic titanium,
            40mm beryllium-plated drivers, and obsidian memory lambskin for pure studio acoustic fidelity.
          </p>

          {/* Price & Savings Tag */}
          <div
            style={{
              marginTop: '1.25rem',
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '0.75rem',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(10px)',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c8a24a' }}>৳6,990</span>
            <span style={{ fontSize: '0.85rem', color: '#a8a29e', textDecoration: 'line-through' }}>৳8,900</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Save ৳1,910 (21% OFF)
            </span>
          </div>

          {/* Action CTAs */}
          <div
            style={{
              marginTop: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <button
              onClick={handleAddToCart}
              className="btn btn-gold"
              style={{
                padding: '0.85rem 1.85rem',
                fontSize: '0.95rem',
                boxShadow: '0 10px 25px rgba(200, 162, 74, 0.35)',
              }}
            >
              <span>{addedToast ? '✓ Added to Cart!' : 'Shop Studio Headphones →'}</span>
            </button>

            <button
              onClick={handleInspectInAtelier}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                padding: '0.85rem 1.4rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = '#c8a24a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '0.45rem',
                  height: '0.45rem',
                  borderRadius: '9999px',
                  backgroundColor: '#10b981',
                }}
              />
              <span>● 4K Cinematic Experience</span>
            </button>
          </div>
        </div>

        {/* Bottom Strip: Guarantees & Loop Status */}
        <div
          style={{
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.78rem',
            color: '#d6d3d1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#c8a24a' }}>✦</span> Ray-traced 3D Showcase
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#c8a24a' }}>✦</span> Ambient Acoustic Tuning
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#c8a24a' }}>✦</span> 7-Day In-Hand Guarantee
            </span>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#a8a29e' }}>
            Seamless Autoplay · Continuous Loop
          </div>
        </div>
      </div>
    </section>
  );
}
