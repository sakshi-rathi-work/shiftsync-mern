'use client';

// Sidebar — fixed left nav rail, collapsible to icon-only (240px ↔ 64px)
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Calendar, FileText, ArrowLeftRight,
  BarChart2, Settings, Shield, BookOpen, Users, ChevronLeft,
  ChevronRight, CalendarDays, Bell,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: ('ADMIN' | 'MANAGER' | 'EMPLOYEE')[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '/dashboard',      icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Roster',         href: '/roster',         icon: <Calendar size={18} />,        roles: ['ADMIN', 'MANAGER'] },
  { label: 'Leave Requests', href: '/leave-requests', icon: <FileText size={18} />,        roles: ['ADMIN', 'MANAGER'] },
  { label: 'Swap Requests',  href: '/swap-requests',  icon: <ArrowLeftRight size={18} />,  roles: ['ADMIN', 'MANAGER'] },
  // Employee
  { label: 'My Shifts',      href: '/my-shifts',      icon: <CalendarDays size={18} />,   roles: ['EMPLOYEE'] },
  { label: 'Leave',          href: '/leave',          icon: <FileText size={18} />,        roles: ['EMPLOYEE'] },
  { label: 'Swaps',          href: '/swaps',          icon: <ArrowLeftRight size={18} />,  roles: ['EMPLOYEE'] },
  { label: 'Notifications',  href: '/notifications',  icon: <Bell size={18} />,            roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  // Admin-only
  { label: 'Labor Rules',    href: '/labor-rules',    icon: <Settings size={18} />,        roles: ['ADMIN'] },
  { label: 'Audit Log',      href: '/audit-log',      icon: <BookOpen size={18} />,        roles: ['ADMIN'] },
  { label: 'Users',          href: '/users',          icon: <Users size={18} />,           roles: ['ADMIN'] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside
      className="fixed top-0 left-0 h-full flex flex-col border-r z-40 transition-all duration-200"
      style={{
        width: collapsed ? '64px' : '240px',
        background: '#1B1922',
        borderColor: '#322F3D',
      }}
    >
      {/* Logo / Wordmark */}
      <div
        className="flex items-center h-16 px-4 border-b shrink-0"
        style={{ borderColor: '#322F3D' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #7A7CD6 0%, #9092E0 100%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="3" rx="1.5" fill="white" />
            <rect x="3" y="10.5" width="11" height="3" rx="1.5" fill="white" opacity="0.8" />
            <rect x="3" y="17" width="7" height="3" rx="1.5" fill="white" opacity="0.6" />
          </svg>
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-base" style={{ color: '#F2F1F7' }}>
            ShiftSync
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group"
              style={{
                color: isActive ? '#F2F1F7' : '#A6A3B5',
                background: isActive ? 'rgba(122,124,214,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #7A7CD6' : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(122,124,214,0.08)';
                  (e.currentTarget as HTMLElement).style.color = '#F2F1F7';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#A6A3B5';
                }
              }}
            >
              <span className="shrink-0" style={{ color: isActive ? '#7A7CD6' : '#A6A3B5' }}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Role badge + collapse toggle */}
      <div
        className="border-t px-3 py-3 flex flex-col gap-2 shrink-0"
        style={{ borderColor: '#322F3D' }}
      >
        {!collapsed && (
          <div className="px-1">
            <p className="text-xs truncate" style={{ color: '#A6A3B5' }}>{user.name}</p>
            <span
              className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(122,124,214,0.2)', color: '#9092E0' }}
            >
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 self-end"
          style={{ color: '#6B687A' }}
          onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(122,124,214,0.1)'; (e.currentTarget).style.color = '#F2F1F7'; }}
          onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#6B687A'; }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
