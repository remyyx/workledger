import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  subtext?: string;
}

export default function StatCard({ label, value, icon, subtext }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-green-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className="text-gray-500">{icon}</div>
      </div>
    </div>
  );
}
