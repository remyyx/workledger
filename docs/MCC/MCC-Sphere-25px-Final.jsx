import React, { useEffect, useRef } from 'react';

/**
 * MCC 25x25px World Sphere - Final
 *
 * Tiny rotating world sphere for MCC card icon.
 * 23° axial tilt. Rotating right.
 * Single color. No equator line. Minimal.
 *
 * Usage:
 * <MCCSphereFinal25 color="#00ccff" />
 */

const MCCSphereFinal25 = ({ color = '#00ccff' } = {}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 25;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 8;

    // Generate tiny point cloud
    const pointCount = 100;
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
      ctx.fillStyle = 'rgba(10, 14, 39, 0.2)';
      ctx.fillRect(0, 0, size, size);

      rotationRight += 0.02;

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

      ctx.fillStyle = color;

      for (let point of sortedPoints) {
        const screenX = centerX + point.projected.x * 1.2;
        const screenY = centerY + point.projected.y * 1.2;
        const dotSize = 0.5 * point.projected.scale;
        const opacity = Math.max(0.15, point.projected.scale * 0.6);

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
      width={25}
      height={25}
      style={{
        border: `1px solid ${color}60`,
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'block',
      }}
    />
  );
};

export default MCCSphereFinal25;
