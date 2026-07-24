'use client';

// Protected app layout — wraps all authenticated pages with sidebar + topbar
// Redirects to /login if not authenticated, /onboarding if not onboarded
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ToastProvider } from '@/components/Toast';

// Track sidebar width for main content offset
const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarWidth] = useState(SIDEBAR_EXPANDED);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (!user.hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#121016' }}>
        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#7A7CD6" strokeWidth="3" />
          <path className="opacity-80" fill="#7A7CD6" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToastProvider>
      <div className="min-h-screen" style={{ background: '#121016' }}>
        <Sidebar />
        <TopBar />
        {/* Main content — offset by sidebar + topbar */}
        <main
          className="min-h-screen pt-16 transition-all duration-200"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
