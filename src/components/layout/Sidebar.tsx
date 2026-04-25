'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Award,
  User,
  CreditCard,
  Settings,
  Store,
  PanelLeftClose,
  PanelLeft,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import DevUserSwitcher from '@/components/dev/DevUserSwitcher';

const navItems = [
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/contracts', label: 'Smart Contracts', icon: FileText },
  { href: '/dashboard/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/dashboard/nfts', label: 'Credential Assets', icon: Award },
  { href: '/dashboard/wallet', label: 'Balance', icon: Wallet },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
];

interface SidebarProps {
  user: {
    display_name: string;
    role: string;
    avatar_url: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const stored = localStorage.getItem('sl-sidebar');
    if (stored === 'collapsed') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sl-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        'min-h-screen flex flex-col shrink-0 transition-all duration-200 ease-out',
        collapsed ? 'w-[64px]' : 'w-[240px]'
      )}
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Logo — height matches TopBar (60px) so it aligns with breadcrumb row */}
      <div className={cn('h-[60px] flex items-center', collapsed ? 'px-3 justify-center' : 'px-5')}>
        <Link href="/dashboard" className="group flex items-center">
          <img
            src="/images/logorangeSL2.png"
            alt="StudioLedger"
            className={cn(
              'object-contain transition-all duration-200',
              collapsed ? 'h-[46px] w-[46px]' : 'h-[46px] w-auto'
            )}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-3 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'sidebar-link',
                active && 'sidebar-link-active',
                collapsed && 'justify-center px-0 gap-0'
              )}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                className="shrink-0 transition-colors duration-200"
              />
              {!collapsed && (
                <span className={cn('transition-colors duration-200', active && 'font-semibold')}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Dev user switcher — only visible in dev mode */}
      {!collapsed && <DevUserSwitcher />}

      {/* Collapse toggle */}
      <div className={cn('py-2', collapsed ? 'px-2' : 'px-3')}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'sidebar-link w-full text-[15px]',
            collapsed && 'justify-center px-0'
          )}
          style={{ background: 'none', border: 'none' }}
        >
          {collapsed ? <PanelLeft size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className={cn('py-4', collapsed ? 'px-2' : 'px-4')}>
        <Link
          href="/dashboard/profile"
          className={cn(
            'sidebar-link p-2',
            collapsed && 'justify-center p-0'
          )}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-medium truncate" style={{ color: 'inherit' }}>
                {user.display_name}
              </p>
              <p className="text-[13px] capitalize" style={{ color: 'inherit', opacity: 0.6 }}>
                {user.role}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
