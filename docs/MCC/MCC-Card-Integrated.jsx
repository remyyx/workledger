import React from 'react';
import MCCSphereFinal25 from './MCC-Sphere-25px-Final';

/**
 * MCC Card - Integrated with 25px Rotating World Sphere
 *
 * Complete MCC credential card with animated sphere icon.
 * Matches futuristic federal aesthetic.
 *
 * Usage:
 * <MCCCardIntegrated
 *   title="Brand Identity Redesign"
 *   creator="Alice Martin"
 *   rating={5.0}
 *   ratingCount={127}
 *   amount="5,616.72"
 *   currency="RUSD"
 *   date="Mar 10, 2025"
 *   skillType="design"
 *   tags={['Design', 'Branding', 'Visual Communication']}
 * />
 */

const MCCCardIntegrated = ({
  title = 'Brand Identity Redesign',
  creator = 'Alice Martin',
  rating = 5.0,
  ratingCount = 127,
  amount = '5,616.72',
  currency = 'RUSD',
  date = 'Mar 10, 2025',
  skillType = 'design',
  tags = ['Design', 'Branding', 'Visual Communication'],
  onViewDetails = null,
  onShare = null,
}) => {
  const colorMap = {
    design: '#00ccff',
    code: '#00ccff',
    writing: '#ff88ff',
    marketing: '#ffaa00',
    business: '#00ff88',
    media: '#ff3366',
  };

  const sphereColor = colorMap[skillType] || '#00ccff';

  return (
    <div
      style={{
        background: 'rgba(22, 33, 62, 0.9)',
        border: `1px solid ${sphereColor}40`,
        borderRadius: '10px',
        padding: '16px',
        maxWidth: '340px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${sphereColor}80`;
        e.currentTarget.style.boxShadow = `0 0 20px ${sphereColor}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${sphereColor}40`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header with Icon */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            flexShrink: 0,
            width: '25px',
            height: '25px',
          }}
        >
          <MCCSphereFinal25 color={sphereColor} />
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '2px',
              lineHeight: '1.2',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            by {creator}
          </div>
        </div>
      </div>

      {/* Rating and Amount */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${sphereColor}20`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#ffd700', fontSize: '12px' }}>★</span>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: '600',
            }}
          >
            {rating.toFixed(1)}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            ({ratingCount})
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: sphereColor,
            }}
          >
            {amount} {currency}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {date}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          marginBottom: '12px',
        }}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            style={{
              background: `${sphereColor}15`,
              color: sphereColor,
              padding: '3px 8px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '500',
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          style={{
            flex: 1,
            background: `${sphereColor}20`,
            border: `1px solid ${sphereColor}60`,
            color: sphereColor,
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = `${sphereColor}30`;
            e.target.style.borderColor = `${sphereColor}80`;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = `${sphereColor}20`;
            e.target.style.borderColor = `${sphereColor}60`;
          }}
          onClick={onViewDetails}
        >
          View Details
        </button>
        <button
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid rgba(255, 255, 255, 0.2)`,
            color: 'rgba(255, 255, 255, 0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.target.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.target.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          onClick={onShare}
        >
          Share
        </button>
      </div>

      {/* Verified Badge */}
      <div
        style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: `1px solid ${sphereColor}15`,
          textAlign: 'center',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        ✓ Verified on XRPL • ZK Proof Valid
      </div>
    </div>
  );
};

export default MCCCardIntegrated;

/**
 * USAGE EXAMPLE:
 *
 * import MCCCardIntegrated from './MCC-Card-Integrated';
 *
 * export default function MCCCardDemo() {
 *   return (
 *     <div style={{ background: 'linear-gradient(135deg, #0a0e27 0%, #16213e 100%)', minHeight: '100vh', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 *       <MCCCardIntegrated
 *         title="Oreo Brand Creative Direction"
 *         creator="Alice Martin"
 *         rating={5.0}
 *         ratingCount={127}
 *         amount="5,616.72"
 *         currency="RUSD"
 *         date="Mar 10, 2025"
 *         skillType="design"
 *         tags={['Design', 'Branding', 'VisualComm']}
 *         onViewDetails={() => console.log('View details clicked')}
 *         onShare={() => console.log('Share clicked')}
 *       />
 *     </div>
 *   );
 * }
 */
