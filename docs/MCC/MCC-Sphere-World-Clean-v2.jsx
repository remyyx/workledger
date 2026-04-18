import React, { useEffect, useRef } from 'react';

/**
 * MCC 50x50px World Sphere - Clean v2
 *
 * Earth-like sphere made of tiny cloud dots.
 * 23-degree axial tilt. Rotating RIGHT.
 * Single consistent color. No equator line.
 *
 * Usage:
 * <MCCWorldSphereClean />
 */

const MCCWorldSphereClean = ({ color = '#00ccff' } = {}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 50;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 16;

    // Generate tiny point cloud
    const pointCount = 180;
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

    let rotationRight = 0;
    const earthTilt = (23.5 * Math.PI) / 180;

    const rotatePoint = (point, rotZ, tiltX) => {
      let x = point.baseX;
      let y = point.baseY * Math.cos(tiltX) - point.baseZ * Math.sin(tiltX);
      let z = point.baseY * Math.sin(tiltX) + point.baseZ * Math.cos(tiltX);

      let x2 = x * Math.cos(rotZ) - z * Math.sin(rotZ);
      z = x * Math.sin(rotZ) + z * Math.cos(rotZ);
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
      // Clear with trail
      ctx.fillStyle = 'rgba(10, 14, 39, 0.2)';
      ctx.fillRect(0, 0, size, size);

      // Rotate RIGHT
      rotationRight += 0.02;

      // Process and sort points
      const sortedPoints = points
        .map((p) => ({
          ...p,
          rotated: rotatePoint(p, rotationRight, earthTilt),
        }))
        .map((p) => ({
          ...p,
          projected: projectPoint(p.rotated),
        }))
        .sort((a, b) => a.rotated.z - b.rotated.z);

      // Draw tiny dots - single color
      ctx.fillStyle = color;

      for (let point of sortedPoints) {
        const screenX = centerX + point.projected.x * 1.2;
        const screenY = centerY + point.projected.y * 1.2;
        const dotSize = 0.6 * point.projected.scale; // Smaller dots
        const opacity = Math.max(0.2, point.projected.scale * 0.7);

        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      width={50}
      height={50}
      style={{
        border: `1px solid ${color}80`,
        borderRadius: '6px',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'block',
        cursor: 'pointer',
      }}
      title="World sphere • 23° tilt • rotating right"
    />
  );
};

export default MCCWorldSphereClean;
