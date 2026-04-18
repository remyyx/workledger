import React, { useEffect, useRef } from 'react';

/**
 * MCC 25x25px Rotating Sphere
 *
 * Ultra-compact 3D sphere animation for MCC card icon.
 * Lightweight Canvas2D implementation. ~2KB minified.
 *
 * Usage:
 * <MCCSphere25 skillType="design" />
 *
 * Props:
 * - skillType: 'design' | 'code' | 'writing' | 'marketing' | 'business' | 'media'
 * - color: hex color (default per skill type)
 */

const MCCSphere25 = ({ skillType = 'design', color = null }) => {
  const canvasRef = useRef(null);

  const colorMap = {
    design: '#00ff88',
    code: '#00ccff',
    writing: '#ff88ff',
    marketing: '#ffaa00',
    business: '#00ff88',
    media: '#ff3366',
  };

  const sphereColor = color || colorMap[skillType] || '#00ff88';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 25;
    let rotation = 0;

    const drawSphere = () => {
      // Clear
      ctx.fillStyle = 'rgba(10, 14, 39, 0.5)';
      ctx.fillRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = 8;

      // Draw sphere with gradient (3D effect)
      const gradient = ctx.createRadialGradient(
        centerX - 2,
        centerY - 2,
        2,
        centerX,
        centerY,
        radius
      );

      gradient.addColorStop(0, sphereColor);
      gradient.addColorStop(0.6, sphereColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating line (shows rotation)
      ctx.strokeStyle = sphereColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(rotation) * radius,
        centerY + Math.sin(rotation) * radius
      );
      ctx.lineTo(
        centerX + Math.cos(rotation + Math.PI) * radius,
        centerY + Math.sin(rotation + Math.PI) * radius
      );
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Highlight (glow)
      ctx.strokeStyle = sphereColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      rotation += 0.05;
    };

    const animate = () => {
      drawSphere();
      requestAnimationFrame(animate);
    };

    animate();
  }, [sphereColor]);

  return (
    <canvas
      ref={canvasRef}
      width={25}
      height={25}
      style={{
        border: `1px solid ${sphereColor}40`,
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.3)',
        display: 'block',
      }}
    />
  );
};

export default MCCSphere25;

/**
 * INTEGRATION:
 *
 * <div className="mcc-card-compact">
 *   <MCCSphere25 skillType="design" />
 *   <div className="mcc-compact-info">
 *     <div className="title">Brand Identity</div>
 *     <div className="rating">5.0 ⭐</div>
 *   </div>
 * </div>
 *
 * CSS:
 * .mcc-card-compact {
 *   display: flex;
 *   align-items: center;
 *   gap: 8px;
 *   padding: 8px;
 *   background: rgba(22, 33, 62, 0.6);
 *   border-radius: 8px;
 * }
 */
