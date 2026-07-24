'use client';

// TopBar — breadcrumb + notification bell + user avatar dropdown
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import apiClient from '@/lib/api-client';

// Simple breadcrumb derived from pathname
function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    dashboard:       'Dashboard',
    roster:          'Roster',
    'leave-requests':'Leave Requests',
    'swap-requests': 'Swap Requests',
    'my-shifts':     'My Shifts',
    leave:           'Leave',
    swaps:           'Swaps',
    notifications:   'Notifications',
    'labor-rules':   'Labor Rules',
    'audit-log':     'Audit Log',
    users:           'Users',
    onboarding:      'Getting Started',
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold text-base" style={{ color: '#F2F1F7' }}>
        {parts.map((p) => labels[p] ?? p).join(' / ') || 'Home'}
      </span>
    </div>
  );
}

// Notification bell with unread badge
function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch unread notification count
    apiClient
      .get<{ data: Array<{ isRead: boolean }> }>('/notifications?unreadOnly=true')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setUnreadCount(res.data.filter((n) => !n.isRead).length);
        }
      })
      .catch(() => {/* silent — notification count is non-critical */});
  }, []);

  return (
    <button
      onClick={() => router.push('/notifications')}
      className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer"
      style={{ color: '#A6A3B5' }}
      onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(122,124,214,0.1)'; (e.currentTarget).style.color = '#F2F1F7'; }}
      onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#A6A3B5'; }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span
          className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1"
          style={{ background: '#7A7CD6', color: '#fff' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// User avatar dropdown
function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { success } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    success('Signed out successfully.');
    router.replace('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors duration-150"
        onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(122,124,214,0.08)'; }}
        onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: '#7A7CD6', color: '#fff' }}
        >
          {initials}
        </div>
        <span className="text-sm font-medium hidden sm:block" style={{ color: '#F2F1F7' }}>
          {user.name.split(' ')[0]}
        </span>
        <ChevronDown size={14} style={{ color: '#6B687A' }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-52 rounded-xl border py-1 z-50"
          style={{ background: '#232130', borderColor: '#322F3D', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: '#322F3D' }}>
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>{user.name}</p>
            <p className="text-xs truncate" style={{ color: '#A6A3B5' }}>{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150"
            style={{ color: '#A6A3B5' }}
            onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(225,88,79,0.08)'; (e.currentTarget).style.color = '#E1584F'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#A6A3B5'; }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  return (
    <header
      className="fixed top-0 right-0 left-0 h-16 flex items-center justify-between px-5 border-b z-30"
      style={{ background: '#1B1922', borderColor: '#322F3D' }}
    >
      {/* Offset for sidebar — handled by parent layout margin */}
      <Breadcrumb />
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

export default TopBar;
