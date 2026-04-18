'use client';

import { Send, Star } from 'lucide-react';
import { useState } from 'react';
import MakeOfferModal from './MakeOfferModal';

interface CreatorCardProps {
  creator: {
    id: string;
    display_name: string;
    role: string;
    skills?: string[];
    avatar_url?: string;
    bio?: string;
  };
}

export default function CreatorCard({ creator }: CreatorCardProps) {
  const [showOfferModal, setShowOfferModal] = useState(false);

  return (
    <>
      <div
        className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] group"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {/* Creator Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{
              backgroundColor: `hsl(${creator.id.charCodeAt(0) * 30}, 70%, 60%)`,
              color: '#fff',
            }}
          >
            {creator.display_name?.charAt(0).toUpperCase() || '?'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-[15px] truncate group-hover:text-blue-400 transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {creator.display_name || 'Anonymous Creator'}
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Creator · {creator.skills?.length || 0} skill{(creator.skills?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p
            className="text-sm line-clamp-2 mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {creator.bio}
          </p>
        )}

        {/* Skills */}
        {creator.skills && creator.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {creator.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {skill}
              </span>
            ))}
            {creator.skills.length > 5 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                +{creator.skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => setShowOfferModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
          style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
        >
          <Send size={14} /> Make an Offer
        </button>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <MakeOfferModal
          creator={creator}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </>
  );
}
