import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ─── Architecture Data ────────────────────────────────
const LAYERS = [
  { id: "frontend", label: "FRONTEND", color: 0x3b82f6, y: 8, nodes: [
    { id: "nextjs", label: "Next.js 14", desc: "App Router, RSC" },
    { id: "dashboard", label: "Dashboard", desc: "Role-aware CR/MK" },
    { id: "marketplace", label: "Marketplace", desc: "Creator discovery" },
    { id: "contracts-ui", label: "Contract Detail", desc: "Milestone flow" },
    { id: "mcc-portfolio", label: "MCC Portfolio", desc: "Federal aesthetic" },
    { id: "admin-ui", label: "Admin Panel", desc: "Phase 2" },
  ]},
  { id: "api", label: "API ROUTES", color: 0x8b5cf6, y: 4, nodes: [
    { id: "contracts-api", label: "/api/contracts", desc: "CRUD + state machine" },
    { id: "proposals-api", label: "/api/proposals", desc: "CR↔MK negotiation" },
    { id: "milestones-api", label: "/api/milestones", desc: "fund/submit/approve/release" },
    { id: "mccs-api", label: "/api/mccs", desc: "Credential queries" },
    { id: "admin-api", label: "/api/admin/*", desc: "Auth, disputes, audit" },
    { id: "test-api", label: "/api/test/*", desc: "Mock escrow/mint" },
  ]},
  { id: "services", label: "SERVICE LAYER", color: 0xf59e0b, y: 0, nodes: [
    { id: "escrow", label: "Escrow Engine", desc: "milestone-escrow.ts" },
    { id: "mint", label: "MCC Mint", desc: "T1+T4 on release" },
    { id: "crypto", label: "Crypto", desc: "AES-256-GCM" },
    { id: "messages", label: "Messages", desc: "Activity timeline" },
    { id: "wallet", label: "Wallet Mgr", desc: "Philosophy A" },
    { id: "n8n-client", label: "n8n Client", desc: "14 event types" },
  ]},
  { id: "external", label: "EXTERNAL", color: 0x10b981, y: -4, nodes: [
    { id: "xrpl", label: "XRPL Ledger", desc: "Escrow, NFT, Payments" },
    { id: "supabase", label: "Supabase", desc: "Postgres + RLS + Auth" },
    { id: "pinata", label: "Pinata/IPFS", desc: "MCC metadata" },
    { id: "n8n", label: "n8n Workflows", desc: "Automations" },
    { id: "austrac", label: "AUSTRAC", desc: "VASP compliance" },
  ]},
  { id: "admin", label: "ADMIN LAYER", color: 0xef4444, y: -8, nodes: [
    { id: "boss", label: "Boss", desc: "Full access" },
    { id: "dev", label: "Dev", desc: "DB + architecture" },
    { id: "accounting", label: "Accounting", desc: "Financial data" },
    { id: "commercial", label: "Commercial", desc: "Contracts + disputes" },
    { id: "protocol", label: "Protocol", desc: "UX/UI + config" },
  ]},
];

const CONNECTIONS = [
  { from: "dashboard", to: "contracts-api" }, { from: "marketplace", to: "proposals-api" },
  { from: "contracts-ui", to: "milestones-api" }, { from: "mcc-portfolio", to: "mccs-api" },
  { from: "admin-ui", to: "admin-api" }, { from: "contracts-api", to: "escrow" },
  { from: "contracts-api", to: "crypto" }, { from: "milestones-api", to: "escrow" },
  { from: "milestones-api", to: "mint" }, { from: "milestones-api", to: "messages" },
  { from: "contracts-api", to: "n8n-client" }, { from: "escrow", to: "xrpl" },
  { from: "mint", to: "xrpl" }, { from: "mint", to: "pinata" },
  { from: "wallet", to: "xrpl" }, { from: "crypto", to: "supabase" },
  { from: "n8n-client", to: "n8n" }, { from: "messages", to: "supabase" },
  { from: "admin-api", to: "supabase" }, { from: "commercial", to: "admin-api" },
  { from: "boss", to: "admin-api" },
];

const STATS = [
  { label: "Tests", value: "216" }, { label: "Migrations", value: "15" },
  { label: "Routes", value: "24" }, { label: "Fee", value: "0.98%" },
  { label: "Taxons", value: "4" }, { label: "Admin Roles", value: "5" },
];

// ─── Canvas Texture Helper ────────────────────────────
function createTextTexture(text, opts = {}) {
  const { width = 256, height = 64, fontSize = 20, color = "#ffffff", bg = null, font = "bold sans-serif" } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (bg) {
    ctx.fillStyle = bg;
    ctx.roundRect ? ctx.roundRect(0, 0, width, height, 8) : ctx.fillRect(0, 0, width, height);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createLabelSprite(text, color = "#ffffff", scale = 1.8) {
  const tex = createTextTexture(text, { width: 512, height: 64, fontSize: 32, color, font: "600 sans-serif" });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale * 0.25, 1);
  return sprite;
}

// ─── Main Component ───────────────────────────────────
export default function StudioLedger3D() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const selectedRef = useRef(null);

  // Build node position lookup
  const nodePositions = useRef({});
  const nodeMeshes = useRef({});
  const connLines = useRef([]);
  const particleSystems = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // ── Scene setup ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(18, 12, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Lights ──
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0xc9a84c, 0.5, 50);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // ── Grid floor ──
    const gridHelper = new THREE.GridHelper(40, 40, 0x1a2030, 0x141822);
    gridHelper.position.y = -12;
    scene.add(gridHelper);

    // ── Build nodes ──
    const positions = {};
    const meshes = {};

    LAYERS.forEach((layer) => {
      const count = layer.nodes.length;
      const spread = count * 3;

      // Layer plane (translucent)
      const planeGeo = new THREE.PlaneGeometry(spread + 4, 0.05);
      const planeMat = new THREE.MeshBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, layer.y - 0.5, 0);
      scene.add(plane);

      // Layer label
      const layerLabel = createLabelSprite(layer.label, "#" + layer.color.toString(16).padStart(6, "0"), 3);
      layerLabel.position.set(-spread / 2 - 2.5, layer.y + 0.3, 0);
      scene.add(layerLabel);

      layer.nodes.forEach((node, i) => {
        const x = (i - (count - 1) / 2) * 3;
        const y = layer.y;
        const z = 0;

        // Node box
        const geo = new THREE.BoxGeometry(2.2, 0.8, 1.4);
        const mat = new THREE.MeshPhongMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.7,
          emissive: layer.color,
          emissiveIntensity: 0.15,
          shininess: 60,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.userData = { nodeId: node.id, layerId: layer.id, label: node.label, desc: node.desc, color: layer.color };
        scene.add(mesh);

        // Edge glow
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMat = new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.5 });
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        mesh.add(edges);

        // Label
        const label = createLabelSprite(node.label, "#E6EDF3", 2);
        label.position.set(0, 0.7, 0);
        mesh.add(label);

        positions[node.id] = new THREE.Vector3(x, y, z);
        meshes[node.id] = mesh;
      });
    });

    nodePositions.current = positions;
    nodeMeshes.current = meshes;

    // ── Build connections ──
    const lines = [];
    CONNECTIONS.forEach((conn) => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      if (!fromPos || !toPos) return;

      // Curved line via quadratic bezier
      const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
      mid.z += 1.5; // curve outward

      const curve = new THREE.QuadraticBezierCurve3(fromPos.clone(), mid, toPos.clone());
      const pts = curve.getPoints(20);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x8b949e,
        transparent: true,
        opacity: 0.15,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { from: conn.from, to: conn.to };
      scene.add(line);
      lines.push(line);
    });
    connLines.current = lines;

    // ── Particle data streams ──
    const particles = [];
    CONNECTIONS.forEach((conn) => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      if (!fromPos || !toPos) return;

      const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
      mid.z += 1.5;
      const curve = new THREE.QuadraticBezierCurve3(fromPos.clone(), mid, toPos.clone());

      const pGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const fromMesh = meshes[conn.from];
      const pColor = fromMesh ? fromMesh.userData.color : 0xc9a84c;
      const pMat = new THREE.MeshBasicMaterial({
        color: pColor,
        transparent: true,
        opacity: 0.6,
      });
      const particle = new THREE.Mesh(pGeo, pMat);
      particle.userData = { curve, t: Math.random(), speed: 0.002 + Math.random() * 0.003, from: conn.from, to: conn.to };
      scene.add(particle);
      particles.push(particle);
    });
    particleSystems.current = particles;

    // ── Background stars ──
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 500; i++) {
      starVerts.push((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60 + 10, (Math.random() - 0.5) * 100);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x445566, size: 0.15 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Raycaster for click/hover ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function getIntersectedNode(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const allMeshes = Object.values(meshes);
      const intersects = raycaster.intersectObjects(allMeshes);
      return intersects.length > 0 ? intersects[0].object : null;
    }

    renderer.domElement.addEventListener("click", (e) => {
      const hit = getIntersectedNode(e);
      if (hit && hit.userData.nodeId) {
        const nId = hit.userData.nodeId;
        if (selectedRef.current === nId) {
          selectedRef.current = null;
          setSelected(null);
        } else {
          selectedRef.current = nId;
          setSelected({ id: nId, ...hit.userData });
        }
      } else {
        selectedRef.current = null;
        setSelected(null);
      }
    });

    renderer.domElement.addEventListener("mousemove", (e) => {
      const hit = getIntersectedNode(e);
      if (hit && hit.userData.nodeId) {
        renderer.domElement.style.cursor = "pointer";
        setHovered(hit.userData.nodeId);
      } else {
        renderer.domElement.style.cursor = "grab";
        setHovered(null);
      }
    });

    // ── Orbit controls (manual) ──
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let theta = Math.atan2(camera.position.x, camera.position.z);
    let phi = Math.acos(camera.position.y / camera.position.length());
    let radius = camera.position.length();

    renderer.domElement.addEventListener("mousedown", (e) => {
      if (e.button === 0) { isDragging = true; prevX = e.clientX; prevY = e.clientY; }
    });
    renderer.domElement.addEventListener("mouseup", () => { isDragging = false; });
    renderer.domElement.addEventListener("mouseleave", () => { isDragging = false; });
    renderer.domElement.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      theta -= dx * 0.005;
      phi = Math.max(0.3, Math.min(Math.PI - 0.3, phi + dy * 0.005));
      prevX = e.clientX;
      prevY = e.clientY;
    });
    renderer.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      radius = Math.max(10, Math.min(50, radius + e.deltaY * 0.03));
    }, { passive: false });

    // Touch support
    let touchStartDist = 0;
    renderer.domElement.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx*dx + dy*dy);
      }
    }, { passive: true });
    renderer.domElement.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevX;
        const dy = e.touches[0].clientY - prevY;
        theta -= dx * 0.005;
        phi = Math.max(0.3, Math.min(Math.PI - 0.3, phi + dy * 0.005));
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        radius = Math.max(10, Math.min(50, radius - (dist - touchStartDist) * 0.05));
        touchStartDist = dist;
      }
    }, { passive: true });
    renderer.domElement.addEventListener("touchend", () => { isDragging = false; });

    // ── Animation loop ──
    let time = 0;
    let autoRotate = true;

    function animate() {
      requestAnimationFrame(animate);
      time += 0.01;

      // Auto-rotate when not dragging
      if (!isDragging && autoRotate) theta += 0.001;

      // Update camera
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);

      // Animate nodes (gentle float)
      Object.values(meshes).forEach((mesh) => {
        const baseY = positions[mesh.userData.nodeId].y;
        mesh.position.y = baseY + Math.sin(time * 2 + mesh.position.x) * 0.08;
      });

      // Highlight selected/hovered
      const sel = selectedRef.current;
      Object.entries(meshes).forEach(([id, mesh]) => {
        const isSelected = sel === id;
        const isConnected = sel && CONNECTIONS.some(
          (c) => (c.from === sel && c.to === id) || (c.to === sel && c.from === id)
        );
        const isHov = hovered === id;
        const targetOpacity = isSelected ? 1.0 : isConnected ? 0.9 : sel ? 0.25 : (isHov ? 0.9 : 0.7);
        const targetEmissive = isSelected ? 0.5 : isConnected ? 0.35 : (isHov ? 0.3 : 0.15);
        const targetScale = isSelected ? 1.15 : isHov ? 1.08 : 1.0;

        mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.1;
        mesh.material.emissiveIntensity += (targetEmissive - mesh.material.emissiveIntensity) * 0.1;
        const s = mesh.scale.x + (targetScale - mesh.scale.x) * 0.1;
        mesh.scale.set(s, s, s);
      });

      // Highlight connections
      lines.forEach((line) => {
        const isActive = sel && (line.userData.from === sel || line.userData.to === sel);
        const targetOp = isActive ? 0.7 : sel ? 0.05 : 0.15;
        line.material.opacity += (targetOp - line.material.opacity) * 0.1;
        if (isActive) line.material.color.set(0xc9a84c);
        else line.material.color.set(0x8b949e);
      });

      // Animate particles
      particles.forEach((p) => {
        p.userData.t += p.userData.speed;
        if (p.userData.t > 1) p.userData.t = 0;
        const pos = p.userData.curve.getPoint(p.userData.t);
        p.position.copy(pos);
        // Float with nodes
        const fromMesh = meshes[p.userData.from];
        if (fromMesh) {
          const baseFromY = positions[p.userData.from].y;
          const yOff = fromMesh.position.y - baseFromY;
          p.position.y += yOff * (1 - p.userData.t);
        }
        const isActive = sel && (p.userData.from === sel || p.userData.to === sel);
        const targetOp = isActive ? 1.0 : sel ? 0.1 : 0.6;
        p.material.opacity += (targetOp - p.material.opacity) * 0.1;
      });

      // Pulsing point light
      pointLight.intensity = 0.4 + Math.sin(time * 3) * 0.15;

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const layerForNode = useCallback((nodeId) => {
    for (const l of LAYERS) {
      if (l.nodes.some((n) => n.id === nodeId)) return l;
    }
    return null;
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0a0e17", position: "relative", overflow: "hidden" }}>
      {/* 3D Canvas */}
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* HUD Header */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "12px 20px",
          background: "linear-gradient(180deg, rgba(10,14,23,0.95), rgba(10,14,23,0))",
          pointerEvents: "none",
          display: "flex", alignItems: "baseline", gap: 10,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "#C9A84C", fontFamily: "system-ui" }}>
          StudioLedger
        </span>
        <span style={{ fontSize: 12, color: "#8B949E", fontFamily: "system-ui" }}>
          3D Architecture — drag to orbit, scroll to zoom
        </span>
      </div>

      {/* Stats HUD */}
      <div
        style={{
          position: "absolute", top: 50, right: 16,
          display: "flex", flexDirection: "column", gap: 4,
          pointerEvents: "none",
        }}
      >
        {STATS.map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(22,27,34,0.85)",
              border: "1px solid rgba(48,54,61,0.6)",
              borderRadius: 6,
              padding: "4px 10px",
              display: "flex", alignItems: "center", gap: 8,
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C", fontFamily: "monospace", minWidth: 40 }}>
              {s.value}
            </span>
            <span style={{ fontSize: 10, color: "#8B949E", fontFamily: "system-ui" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Selected node detail */}
      {selected && (
        <div
          style={{
            position: "absolute", bottom: 20, left: 20,
            background: "rgba(22,27,34,0.92)",
            border: `1px solid #${(selected.color || 0xc9a84c).toString(16).padStart(6, "0")}44`,
            borderRadius: 12,
            padding: "14px 18px",
            maxWidth: 280,
            backdropFilter: "blur(12px)",
            boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
            fontFamily: "system-ui",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: `#${(selected.color || 0x8b949e).toString(16).padStart(6, "0")}`, marginBottom: 4 }}>
            {layerForNode(selected.id)?.label || ""}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E6EDF3", marginBottom: 6 }}>
            {selected.label}
          </div>
          <div style={{ fontSize: 11, color: "#8B949E", lineHeight: 1.5, marginBottom: 8 }}>
            {selected.desc}
          </div>
          {(() => {
            const inb = CONNECTIONS.filter((c) => c.to === selected.id);
            const outb = CONNECTIONS.filter((c) => c.from === selected.id);
            return (
              <>
                {inb.length > 0 && (
                  <div style={{ fontSize: 10, color: "#8B949E", marginBottom: 3 }}>
                    <span style={{ color: "#C9A84C" }}>← In: </span>
                    {inb.map((c) => c.from).join(", ")}
                  </div>
                )}
                {outb.length > 0 && (
                  <div style={{ fontSize: 10, color: "#8B949E" }}>
                    <span style={{ color: "#C9A84C" }}>→ Out: </span>
                    {outb.map((c) => c.to).join(", ")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Layer legend */}
      <div
        style={{
          position: "absolute", bottom: 20, right: 16,
          display: "flex", flexDirection: "column", gap: 3,
          pointerEvents: "none",
        }}
      >
        {LAYERS.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: 3,
                background: `#${l.color.toString(16).padStart(6, "0")}40`,
                border: `1px solid #${l.color.toString(16).padStart(6, "0")}`,
              }}
            />
            <span style={{ fontSize: 9, color: "#8B949E", fontFamily: "system-ui" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div
        style={{
          position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, color: "#8B949E44", fontFamily: "system-ui",
          pointerEvents: "none",
        }}
      >
        Click node to inspect — drag to orbit — scroll to zoom
      </div>
    </div>
  );
}
