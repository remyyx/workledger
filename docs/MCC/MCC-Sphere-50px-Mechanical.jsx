import React, { useEffect, useRef } from 'react';

/**
 * MCC 50x50px Mechanical Rotating Sphere
 *
 * Geometric wireframe sphere with rotating segments.
 * Technical, futuristic aesthetic.
 *
 * Usage:
 * <MCCSphereMech50 skillType="design" />
 *
 * Props:
 * - skillType: 'design' | 'code' | 'writing' | 'marketing' | 'business' | 'media'
 * - color: hex color (default per skill type)
 */

const MCCSphereMech50 = ({ skillType = 'design', color = null }) => {
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
    const size = 50;
    let rotation = 0;

    const drawMechanicalSphere = () => {
      // Clear
      ctx.fillStyle = 'rgba(10, 14, 39, 0.6)';
      ctx.fillRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = 18;

      // Set drawing style
      ctx.strokeStyle = sphereColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;

      // Draw horizontal latitude lines (rotated)
      const latLines = 5;
      for (let i = 0; i < latLines; i++) {
        const lat = (i / latLines - 0.5) * Math.PI;
        const y = centerY + Math.sin(lat) * radius;
        const ellipseRadius = Math.cos(lat) * radius;

        ctx.beginPath();
        ctx.ellipse(centerX, y, ellipseRadius, ellipseRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw rotating longitude lines
      const longLines = 8;
      for (let i = 0; i < longLines; i++) {
        const angle = (i / longLines) * Math.PI * 2 + rotation;
        const x = centerX + Math.cos(angle) * radius;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw segment lines
        for (let j = 0; j < 3; j++) {
          const segY = centerY + (j - 1) * (radius / 1.5);
          const segX1 = centerX + Math.cos(angle) * (radius * 0.6);
          const segX2 = centerX + Math.cos(angle + Math.PI / 4) * (radius * 0.4);

          ctx.beginPath();
          ctx.moveTo(segX1, segY);
          ctx.lineTo(segX2, segY);
          ctx.stroke();
        }
      }

      // Central rotating ring (shows rotation)
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = sphereColor;
      ctx.beginPath();
      const ringRadius = radius * 0.7;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + rotation;
        const x = centerX + Math.cos(angle) * ringRadius;
        const y = centerY + Math.sin(angle) * ringRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = sphereColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      rotation += 0.04;
    };

    const animate = () => {
      drawMechanicalSphere();
      requestAnimationFrame(animate);
    };

    animate();
  }, [sphereColor]);

  return (
    <canvas
      ref={canvasRef}
      width={50}
      height={50}
      style={{
        border: `1px solid ${sphereColor}60`,
        borderRadius: '6px',
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'block',
      }}
    />
  );
};

export default MCCSphereMech50;

/**
 * INTEGRATION:
 *
 * <div className="mcc-card">
 *   <MCCSphereMech50 skillType="design" />
 *   <div className="mcc-info">
 *     [card details]
 *   </div>
 * </div>
 */
