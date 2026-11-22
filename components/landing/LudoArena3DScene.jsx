'use client';
import { useEffect, useRef } from 'react';

export default function LudoArena3DScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let animId;
    let renderer, scene, camera;
    const cleanups = [];

    (async () => {
      const THREE = await import('three');

      const W = mountRef.current.clientWidth || 500;
      const H = mountRef.current.clientHeight || 500;

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
      camera.position.set(0, 0, 8);

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambient);
      const gold = new THREE.PointLight(0xffd700, 3, 20);
      gold.position.set(3, 4, 5);
      scene.add(gold);
      const emerald = new THREE.PointLight(0x00ff88, 2, 15);
      emerald.position.set(-4, -2, 4);
      scene.add(emerald);
      const crimson = new THREE.PointLight(0xff3366, 1.5, 12);
      crimson.position.set(0, -4, 3);
      scene.add(crimson);

      // ── Dice ──────────────────────────────────────────────────────────────
      const makeDiceFace = (pips, bgColor, pipColor) => {
        const size = 128;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const ctx = cv.getContext('2d');
        // Use fillRect instead of roundRect for broader compatibility
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = pipColor;
        const positions = {
          1: [[64, 64]],
          2: [[36, 36], [92, 92]],
          3: [[36, 36], [64, 64], [92, 92]],
          4: [[36, 36], [92, 36], [36, 92], [92, 92]],
          5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]],
          6: [[36, 28], [92, 28], [36, 64], [92, 64], [36, 100], [92, 100]],
        };
        (positions[pips] || []).forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        });
        return new THREE.CanvasTexture(cv);
      };

      const diceMats = [
        new THREE.MeshStandardMaterial({ map: makeDiceFace(2, '#f5f0e8', '#1a1a2e'), roughness: 0.1, metalness: 0.3 }),
        new THREE.MeshStandardMaterial({ map: makeDiceFace(5, '#f5f0e8', '#1a1a2e'), roughness: 0.1, metalness: 0.3 }),
        new THREE.MeshStandardMaterial({ map: makeDiceFace(6, '#f5f0e8', '#cc1111'), roughness: 0.1, metalness: 0.3 }),
        new THREE.MeshStandardMaterial({ map: makeDiceFace(1, '#f5f0e8', '#cc1111'), roughness: 0.1, metalness: 0.3 }),
        new THREE.MeshStandardMaterial({ map: makeDiceFace(3, '#f5f0e8', '#1a1a2e'), roughness: 0.1, metalness: 0.3 }),
        new THREE.MeshStandardMaterial({ map: makeDiceFace(4, '#f5f0e8', '#1a1a2e'), roughness: 0.1, metalness: 0.3 }),
      ];

      const diceGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
      const dice = new THREE.Mesh(diceGeo, diceMats);
      scene.add(dice);

      // Golden edge wireframe
      const edgeGeo = new THREE.EdgesGeometry(diceGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 1.5 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      dice.add(edges);

      // ── 4 Ludo tokens ─────────────────────────────────────────────────────
      const TOKEN_COLORS = [0xe74c3c, 0x27ae60, 0xf1c40f, 0x3498db];
      const TOKEN_POSITIONS = [
        [-2.8, 1.8, 0], [2.8, 1.8, 0], [-2.8, -1.8, 0], [2.8, -1.8, 0],
      ];

      const tokens = TOKEN_COLORS.map((color, i) => {
        const group = new THREE.Group();
        // Base disc
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.12, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.5, 24);
        const bodyMesh = new THREE.Mesh(bodyGeo, baseMat);
        bodyMesh.position.y = 0.31;
        group.add(bodyMesh);
        // Head
        const headGeo = new THREE.SphereGeometry(0.28, 20, 20);
        const headMesh = new THREE.Mesh(headGeo, baseMat);
        headMesh.position.y = 0.78;
        group.add(headMesh);

        group.position.set(...TOKEN_POSITIONS[i]);
        group.userData.phaseOffset = i * Math.PI * 0.5;
        scene.add(group);
        return group;
      });

      // ── Gold coins ────────────────────────────────────────────────────────
      const coinGroup = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.9 });
        const coin = new THREE.Mesh(geo, mat);
        const angle = (i / 8) * Math.PI * 2;
        coin.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, -1);
        coin.userData.angle = angle;
        coinGroup.add(coin);
      }
      scene.add(coinGroup);

      // ── Particles ─────────────────────────────────────────────────────────
      const particleCount = 120;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
      const partGeo = new THREE.BufferGeometry();
      partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const partMat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.05, transparent: true, opacity: 0.6 });
      const particles = new THREE.Points(partGeo, partMat);
      scene.add(particles);

      // Mouse interaction
      let mouseX = 0, mouseY = 0;
      const onMouseMove = (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouseMove);
      cleanups.push(() => window.removeEventListener('mousemove', onMouseMove));

      // Resize
      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);
      cleanups.push(() => window.removeEventListener('resize', onResize));

      // Animate
      let rollProgress = 0;
      let rolling = false;
      let rollTimer = 0;

      const animate = (t) => {
        animId = requestAnimationFrame(animate);
        const time = t / 1000;

        // Dice idle rotation + mouse parallax
        if (!rolling) {
          dice.rotation.x = Math.sin(time * 0.4) * 0.3 + mouseY * 0.15;
          dice.rotation.y = time * 0.5 + mouseX * 0.15;
        } else {
          rollProgress += 0.05;
          dice.rotation.x += 0.15;
          dice.rotation.y += 0.18;
          if (rollProgress > 1) { rolling = false; rollProgress = 0; }
        }

        // Trigger roll every 4s
        rollTimer += 0.016;
        if (rollTimer > 4) { rolling = true; rollTimer = 0; }

        // Tokens bobbing
        tokens.forEach((tk, idx) => {
          tk.position.y = TOKEN_POSITIONS[idx][1] + Math.sin(time + tk.userData.phaseOffset) * 0.25;
          tk.rotation.y = time * 0.6 + tk.userData.phaseOffset;
        });

        // Coin orbit
        coinGroup.rotation.z = time * 0.4;
        coinGroup.children.forEach((c, i) => {
          c.rotation.x = time * 2 + i;
        });

        // Particles slow drift
        particles.rotation.y = time * 0.03;

        // Camera subtle sway
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.2;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      animId = requestAnimationFrame(animate);

      cleanups.push(() => {
        cancelAnimationFrame(animId);
        renderer.dispose();
        diceGeo.dispose();
        partGeo.dispose();
        edgeGeo.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      });
    })();

    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ minHeight: 420 }}
    />
  );
}
