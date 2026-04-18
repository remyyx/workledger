'use client';

import Sidebar from '@/components/layout/Sidebar';
import CommandPalette from '@/components/dashboard/CommandPalette';
import { CommandPaletteProvider, useCommandPalette } from '@/contexts/CommandPaletteContext';
import { useUser } from '@/hooks';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const { isOpen, close } = useCommandPalette();

  const sidebarUser = user
    ? {
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    : {
        display_name: 'Loading...',
        role: 'creator' as const,
        avatar_url: null,
      };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <Sidebar user={sidebarUser} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <CommandPalette isOpen={isOpen} onClose={close} />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </CommandPaletteProvider>
  );
}
