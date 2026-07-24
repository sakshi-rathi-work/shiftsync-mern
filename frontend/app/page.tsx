'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Route to onboarding if first login
    if (!user.hasOnboarded) {
      router.replace('/onboarding');
      return;
    }

    // Route to role-based home
    switch (user.role) {
      case 'ADMIN':
      case 'MANAGER':
        router.replace('/dashboard');
        break;
      case 'EMPLOYEE':
        router.replace('/my-shifts');
        break;
      default:
        router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Loading state — show a spinner on the dark canvas
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#121016' }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#7A7CD6" strokeWidth="3" />
          <path className="opacity-80" fill="#7A7CD6" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-sm" style={{ color: '#A6A3B5' }}>Loading ShiftSync…</span>
      </div>
    </div>
  );
}
