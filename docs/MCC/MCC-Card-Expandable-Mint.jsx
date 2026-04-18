import React, { useState } from 'react';
import MCCSphereFinal25 from './MCC-Sphere-25px-Final';

/**
 * MCC Card - Expandable with Mint Details
 *
 * Card that expands inline to show full contract/escrow details.
 * End-to-end testing for MCC minting workflow.
 *
 * Usage:
 * <MCCCardExpandableMint
 *   title="Brand Identity Redesign"
 *   creator="Alice Martin"
 *   rating={5.0}
 *   amount="5,616.72"
 *   currency="RUSD"
 *   date="Mar 10, 2025"
 *   skillType="design"
 *   tags={['Design', 'Branding', 'Visual Communication']}
 *   contractData={{
 *     escrowAddress: 'rN9cZvQn5B86wXQkqKiVmWf9J7SSh3z2u4',
 *     escrowAmount: '5,616.72 XRP',
 *     escrowStatus: 'Locked',
 *     contractHash: 'ABC123DEF456GHI789JKL012MNO345PQR678',
 *     condition: 'SHA-256: abc123...',
 *     fulfillment: 'Not yet released',
 *     mccTokenId: 'MCC-0047-XYZ891',
 *     mccStatus: 'Ready to Mint',
 *     xrpLedgerLine: 'Ledger 84,902,345',
 *     createdAt: '2025-03-10T09:47:32Z',
 *     maturityDate: '2025-06-10T09:47:32Z',
 *   }}
 * />
 */

const MCCCardExpandableMint = ({
  title = 'Brand Identity Redesign',
  creator = 'Alice Martin',
  rating = 5.0,
  ratingCount = 127,
  amount = '5,616.72',
  currency = 'RUSD',
  date = 'Mar 10, 2025',
  skillType = 'design',
  tags = ['Design', 'Branding', 'Visual Communication'],
  contractData = {
    escrowAddress: 'rN9cZvQn5B86wXQkqKiVmWf9J7SSh3z2u4',
    escrowAmount: '5,616.72 XRP',
    escrowStatus: 'Locked',
    contractHash: 'ABC123DEF456GHI789JKL012MNO345PQR678',
    condition: 'SHA-256: abc123def456ghi789jkl012mno345pqr678stu',
    fulfillment: 'Not yet released',
    mccTokenId: 'MCC-0047-XYZ891',
    mccStatus: 'Ready to Mint',
    xrpLedgerLine: 'Ledger 84,902,345',
    createdAt: '2025-03-10T09:47:32Z',
    maturityDate: '2025-06-10T09:47:32Z',
  },
}) => {
  const [expanded, setExpanded] = useState(false);

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
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        maxWidth: '420px',
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
      {/* Header - Always Visible */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flexShrink: 0, width: '25px', height: '25px' }}>
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

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '10px',
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
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Details' : 'View Details'}
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
          >
            Share
          </button>
        </div>

        <div
          style={{
            textAlign: 'center',
            paddingTop: '10px',
            borderTop: `1px solid ${sphereColor}15`,
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          ✓ Verified on XRPL • ZK Proof Valid
        </div>
      </div>

      {/* Expandable Details Section */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${sphereColor}20`,
            background: `${sphereColor}08`,
            padding: '16px',
            animation: 'slideDown 0.3s ease',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: sphereColor,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Contract & Escrow Details
          </div>

          {/* Escrow Section */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '6px',
              }}
            >
              🔒 Escrow Status
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6',
              }}
            >
              <div>
                <strong>Address:</strong>{' '}
                <code
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    fontSize: '9px',
                  }}
                >
                  {contractData.escrowAddress}
                </code>
              </div>
              <div>
                <strong>Amount Locked:</strong> {contractData.escrowAmount}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ color: '#00ff88' }}>✓ {contractData.escrowStatus}</span>
              </div>
            </div>
          </div>

          {/* Crypto-Condition Section */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '6px',
              }}
            >
              🔐 Crypto-Condition (XLS-85)
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6',
              }}
            >
              <div>
                <strong>Condition:</strong>{' '}
                <code
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    fontSize: '9px',
                    display: 'block',
                    wordBreak: 'break-all',
                    marginTop: '2px',
                  }}
                >
                  {contractData.condition}
                </code>
              </div>
              <div style={{ marginTop: '6px' }}>
                <strong>Fulfillment:</strong> {contractData.fulfillment}
              </div>
            </div>
          </div>

          {/* MCC Minting Section */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '6px',
              }}
            >
              🎖️ MCC Minting
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6',
              }}
            >
              <div>
                <strong>Token ID:</strong> {contractData.mccTokenId}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ color: '#00ff88' }}>✓ {contractData.mccStatus}</span>
              </div>
              <div>
                <strong>Standard:</strong> XLS-20 (Non-Fungible Token)
              </div>
            </div>
          </div>

          {/* Ledger Section */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '6px',
              }}
            >
              ⛓️ XRP Ledger
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                lineHeight: '1.6',
              }}
            >
              <div>
                <strong>Closed Ledger:</strong> {contractData.xrpLedgerLine}
              </div>
              <div>
                <strong>Created:</strong> {contractData.createdAt}
              </div>
              <div>
                <strong>Maturity Date:</strong> {contractData.maturityDate}
              </div>
            </div>
          </div>

          {/* Contract Hash */}
          <div style={{ borderTop: `1px solid ${sphereColor}15`, paddingTop: '12px' }}>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                wordBreak: 'break-all',
                fontFamily: 'Courier New, monospace',
                lineHeight: '1.4',
              }}
            >
              <strong>Contract Hash:</strong>
              <br />
              <code
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '4px',
                  borderRadius: '2px',
                  display: 'block',
                  marginTop: '4px',
                }}
              >
                {contractData.contractHash}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCCCardExpandableMint;

/**
 * USAGE FOR END-TO-END MINTING TEST:
 *
 * <MCCCardExpandableMint
 *   title="Test Project"
 *   creator="Test Creator"
 *   rating={5.0}
 *   amount="1000.00"
 *   currency="XRP"
 *   skillType="design"
 *   contractData={{
 *     escrowAddress: 'rXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
 *     escrowAmount: '1000.00 XRP',
 *     escrowStatus: 'Locked',
 *     contractHash: 'HASH_HERE',
 *     condition: 'SHA-256: abc123...',
 *     fulfillment: 'Not yet released',
 *     mccTokenId: 'MCC-0001-TEST',
 *     mccStatus: 'Ready to Mint',
 *     xrpLedgerLine: 'Ledger XXXXX',
 *     createdAt: new Date().toISOString(),
 *     maturityDate: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
 *   }}
 * />
 *
 * The card expands inline to show:
 * - Escrow wallet address, amount, status
 * - Crypto-condition hash and fulfillment status
 * - MCC token ID and minting status
 * - XRP Ledger line and dates
 * - Full contract hash
 *
 * Use this for testing end-to-end MCC minting flow.
 */
