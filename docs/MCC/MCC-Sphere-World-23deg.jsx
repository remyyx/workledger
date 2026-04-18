import React, { useEffect, useRef } from 'react';

/**
 * MCC 50x50px World Sphere - 23° Tilt
 *
 * Earth-like sphere made of cloud dots.
 * 23-degree axial tilt (Earth's actual tilt).
 * Rotating rightward (EST/eastward).
 *
 * Usage:
 * <MCCWorldSphere50 />
 */

const MCCWorldSphere50 = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 50;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 16;

    // Generate point cloud in sphere shape
    const pointCount = 150;
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = Math.sin(phi) * Math.sin(theta) * radius;
      const z = Math.cos(phi) * radius;

      points.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
      });
    }

    let rotationEast = 0;
    const earthTilt = (23.5 * Math.PI) / 180; // 23.5 degrees

    const rotatePoint = (point, rotZ, tiltX) => {
      // Apply Earth's axial tilt (23.5° on X axis)
      let x = point.baseX;
      let y = point.baseY * Math.cos(tiltX) - point.baseZ * Math.sin(tiltX);
      let z = point.baseY * Math.sin(tiltX) + point.baseZ * Math.cos(tiltX);

      // Apply eastward rotation (around Y axis)
      let x2 = x * Math.cos(rotZ) + z * Math.sin(rotZ);
      z = -x * Math.sin(rotZ) + z * Math.cos(rotZ);
      x = x2;

      return { x, y, z };
    };

    const projectPoint = (point) => {
      const scale = 200 / (200 + point.z);
      return {
        x: point.x * scale,
        y: point.y * scale,
        scale,
        z: point.z,
      };
    };

    const animate = () => {
      // Clear with trail effect
      ctx.fillStyle = 'rgba(10, 14, 39, 0.3)';
      ctx.fillRect(0, 0, size, size);

      // Rotate eastward (right)
      rotationEast += 0.02;

      // Sort points by depth for painter's algorithm
      const sortedPoints = points
        .map((p, idx) => ({
          ...p,
          index: idx,
        }))
        .map((p) => ({
          ...p,
          rotated: rotatePoint(p, rotationEast, earthTilt),
        }))
        .map((p) => ({
          ...p,
          projected: projectPoint(p.rotated),
        }))
        .sort((a, b) => a.rotated.z - b.rotated.z);

      // Draw points
      for (let point of sortedPoints) {
        const screenX = centerX + point.projected.x * 1.2;
        const screenY = centerY + point.projected.y * 1.2;
        const size_px = 1.2 * point.projected.scale;
        const opacity = Math.max(0, point.projected.scale * 0.8);

        // Ocean blue for back hemisphere, bright cyan for front
        if (point.rotated.z > 0) {
          ctx.fillStyle = '#00ccff'; // Front - bright cyan
          ctx.globalAlpha = opacity * 0.9;
        } else {
          ctx.fillStyle = '#0088aa'; // Back - darker blue
          ctx.globalAlpha = opacity * 0.3;
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, size_px, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw tilted equator line (shows 23° tilt)
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 0.8;
      ctx.beginPath();

      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI * 2 + rotationEast;

        // Point on equator
        let x = Math.cos(angle) * radius;
        let y = 0;
        let z = Math.sin(angle) * radius;

        // Apply tilt
        let y_tilt = y * Math.cos(earthTilt) - z * Math.sin(earthTilt);
        z = y * Math.sin(earthTilt) + z * Math.cos(earthTilt);
        y = y_tilt;

        const projected = projectPoint({ x, y, z });
        const screenX = centerX + projected.x * 1.2;
        const screenY = centerY + projected.y * 1.2;

        if (i === 0) ctx.moveTo(screenX, screenY);
        else ctx.lineTo(screenX, screenY);
      }

      ctx.stroke();

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={50}
      height={50}
      style={{
        border: '1px solid rgba(0, 204, 255, 0.5)',
        borderRadius: '6px',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'block',
        cursor: 'pointer',
      }}
      title="Earth rotating eastward • 23° axial tilt • Cloud point visualization"
    />
  );
};

export default MCCWorldSphere50;

/**
 * INTEGRATION:
 *
 * <div className="mcc-card">
 *   <MCCWorldSphere50 />
 *   <div className="mcc-info">
 *     [credential details]
 *   </div>
 * </div>
 */
