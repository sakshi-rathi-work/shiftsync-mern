'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      // Redirect based on hasOnboarded will be handled in layout
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#121016' }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(122,124,214,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Wordmark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7A7CD6 0%, #9092E0 100%)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="3" rx="1.5" fill="white" />
                <rect x="3" y="10.5" width="11" height="3" rx="1.5" fill="white" opacity="0.8" />
                <rect x="3" y="17" width="7" height="3" rx="1.5" fill="white" opacity="0.6" />
                <circle cx="19" cy="18.5" r="3.5" fill="white" opacity="0.9" />
                <path d="M17.5 18.5l1 1 2-2" stroke="#7A7CD6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ color: '#F2F1F7' }}
            >
              ShiftSync
            </span>
          </div>
          <p className="text-sm" style={{ color: '#A6A3B5' }}>
            Workforce scheduling, streamlined.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: '#1B1922',
            borderColor: '#322F3D',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h1 className="text-xl font-semibold mb-1" style={{ color: '#F2F1F7' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-7" style={{ color: '#A6A3B5' }}>
            Sign in to your organization account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#A6A3B5' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...register('email')}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm border outline-none transition-all duration-150"
                style={{
                  background: '#232130',
                  borderColor: errors.email ? '#E1584F' : '#322F3D',
                  color: '#F2F1F7',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7A7CD6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(122,124,214,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#E1584F' : '#322F3D';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs" style={{ color: '#E1584F' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#A6A3B5' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm border outline-none transition-all duration-150"
                style={{
                  background: '#232130',
                  borderColor: errors.password ? '#E1584F' : '#322F3D',
                  color: '#F2F1F7',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7A7CD6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(122,124,214,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#E1584F' : '#322F3D';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs" style={{ color: '#E1584F' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div
                className="rounded-lg px-4 py-3 text-sm border"
                style={{
                  background: 'rgba(225,88,79,0.1)',
                  borderColor: 'rgba(225,88,79,0.3)',
                  color: '#E1584F',
                }}
              >
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150"
              style={{
                background: isSubmitting ? '#5A5CA0' : '#7A7CD6',
                color: '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) (e.target as HTMLButtonElement).style.background = '#9092E0';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) (e.target as HTMLButtonElement).style.background = '#7A7CD6';
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-6" style={{ color: '#6B687A' }}>
          No public sign-up · Contact your admin to get access
        </p>
      </div>
    </div>
  );
}
