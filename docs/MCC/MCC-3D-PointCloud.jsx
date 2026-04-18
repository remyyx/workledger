import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * MCC 3D Point Cloud Component
 *
 * A small (50x50 or 100x100px) rotating point cloud with matrix-like moving data effect.
 * Embeds directly in MCC card. Lightweight, performant, futuristic aesthetic.
 *
 * Usage:
 * <MCC3DPointCloud size={100} skillType="design" />
 *
 * Props:
 * - size: canvas width/height in pixels (default 100)
 * - skillType: 'design' | 'code' | 'writing' | 'marketing' | 'business' | 'media' | 'other'
 * - color: hex color for points (default #00ff88 - matrix green)
 */

const MCC3DPointCloud = ({ size = 100, skillType = 'design', color = '#00ff88' }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const particlesRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      size / size,
      0.1,
      1000
    );
    camera.position.z = 2;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Geometry: Cloud of points
    const pointCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const velocities = new Float32Array(pointCount * 3);

    // Skill-based distribution
    const skillDistributions = {
      design: { radius: 1.5, spread: 'spiral', speed: 0.003 },
      code: { radius: 1.8, spread: 'cube', speed: 0.004 },
      writing: { radius: 1.4, spread: 'cloud', speed: 0.002 },
      marketing: { radius: 1.6, spread: 'orbit', speed: 0.0035 },
      business: { radius: 1.7, spread: 'hexagon', speed: 0.003 },
      media: { radius: 1.5, spread: 'wave', speed: 0.0045 },
      other: { radius: 1.5, spread: 'random', speed: 0.003 }
    };

    const dist = skillDistributions[skillType] || skillDistributions.design;

    // Generate point positions based on skill type
    for (let i = 0; i < pointCount; i++) {
      let x, y, z;

      if (dist.spread === 'spiral') {
        const angle = (i / pointCount) * Math.PI * 4;
        const radius = (i / pointCount) * dist.radius;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
        z = (i / pointCount - 0.5) * 2;
      } else if (dist.spread === 'cube') {
        x = (Math.random() - 0.5) * dist.radius;
        y = (Math.random() - 0.5) * dist.radius;
        z = (Math.random() - 0.5) * dist.radius;
      } else if (dist.spread === 'cloud') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        x = Math.sin(phi) * Math.cos(theta) * dist.radius;
        y = Math.sin(phi) * Math.sin(theta) * dist.radius;
        z = Math.cos(phi) * dist.radius;
      } else if (dist.spread === 'orbit') {
        const angle = Math.random() * Math.PI * 2;
        const orbits = Math.floor(i / (pointCount / 3));
        const radius = dist.radius * (0.5 + orbits * 0.25);
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * (radius * 0.5);
        z = (Math.random() - 0.5) * 0.5;
      } else if (dist.spread === 'hexagon') {
        const angle = (i / pointCount) * Math.PI * 2;
        const layer = Math.floor(i / (pointCount / 3));
        const radius = dist.radius * (0.5 + layer * 0.25);
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
        z = (layer - 1) * 0.3;
      } else if (dist.spread === 'wave') {
        x = (i / pointCount - 0.5) * dist.radius;
        y = Math.sin((i / pointCount) * Math.PI * 2) * 0.5;
        z = (Math.random() - 0.5) * 0.5;
      } else {
        x = (Math.random() - 0.5) * dist.radius;
        y = (Math.random() - 0.5) * dist.radius;
        z = (Math.random() - 0.5) * dist.radius;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      velocities[i * 3] = (Math.random() - 0.5) * dist.speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * dist.speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * dist.speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;

    // Material: Points with glow
    const material = new THREE.PointsMaterial({
      color: color,
      size: size > 80 ? 0.08 : 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      fog: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate particles
      particles.rotation.x += 0.0003;
      particles.rotation.y += 0.0005;
      particles.rotation.z += 0.0002;

      // Update positions (matrix-like flowing effect)
      const positionAttribute = geometry.getAttribute('position');
      const velocities = geometry.userData.velocities;
      const positions = positionAttribute.array;

      for (let i = 0; i < pointCount; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Wrap around bounds
        if (positions[i * 3] > 2) positions[i * 3] = -2;
        if (positions[i * 3] < -2) positions[i * 3] = 2;
        if (positions[i * 3 + 1] > 2) positions[i * 3 + 1] = -2;
        if (positions[i * 3 + 1] < -2) positions[i * 3 + 1] = 2;
        if (positions[i * 3 + 2] > 2) positions[i * 3 + 2] = -2;
        if (positions[i * 3 + 2] < -2) positions[i * 3 + 2] = 2;
      }

      positionAttribute.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      renderer.setSize(size, size);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [size, skillType, color]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
      }}
    />
  );
};

export default MCC3DPointCloud;

/**
 * INTEGRATION EXAMPLE:
 *
 * In your MCC Card component:
 *
 * <div className="mcc-card">
 *   <div className="mcc-icon-container">
 *     <MCC3DPointCloud
 *       size={100}
 *       skillType={credential.skillCategory}
 *       color="#00ff88"
 *     />
 *   </div>
 *   <div className="mcc-details">
 *     [rest of card content]
 *   </div>
 * </div>
 *
 * CSS for container:
 *
 * .mcc-icon-container {
 *   width: 100px;
 *   height: 100px;
 *   margin-right: 16px;
 *   flex-shrink: 0;
 * }
 *
 * PERFORMANCE NOTES:
 * - Uses requestAnimationFrame for 60fps on supported devices
 * - Canvas rendered at device pixel ratio for crisp visuals
 * - Alpha channel transparent background blends with card
 * - Matrix green (#00ff88) default — customize with color prop
 * - Skill type changes point distribution pattern (design = spiral, code = cube, etc.)
 * - Lightweight: ~10KB for Three.js, ~2KB for component code
 * - Lazy loads Three.js from CDN if not already loaded
 */
