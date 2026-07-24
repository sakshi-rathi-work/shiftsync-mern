'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/api-client';
import { Calendar, ArrowRight, Users, Shield, BookOpen, FileText, ArrowLeftRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step { title: string; content: React.ReactNode }

// ─── Step Illustrations ───────────────────────────────────────────────────────

function StepIcon({ icon, color = '#7A7CD6' }: { icon: React.ReactNode; color?: string }) {
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span style={{ color }}>{icon}</span>
    </div>
  );
}

// ─── Manager Steps ────────────────────────────────────────────────────────────

const managerSteps: Step[] = [
  {
    title: 'Welcome to ShiftSync',
    content: (
      <>
        <StepIcon icon={<Calendar size={32} />} />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          Build weekly rosters, catch conflicts before you publish, and manage your team&apos;s leave and swaps — all in one place. No more spreadsheet chaos.
        </p>
      </>
    ),
  },
  {
    title: 'Your Team',
    content: (
      <>
        <StepIcon icon={<Users size={32} />} />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          Your team has been set up by your Admin. Head to the Roster page to start building this week&apos;s schedule. Employees can only see published rosters — drafts are private to you.
        </p>
        <div
          className="mt-5 p-4 rounded-xl text-sm text-center"
          style={{ background: 'rgba(122,124,214,0.08)', border: '1px solid rgba(122,124,214,0.2)', color: '#9092E0' }}
        >
          Tip: Click any grid cell to assign a shift to an employee.
        </div>
      </>
    ),
  },
  {
    title: 'Labor Rules',
    content: (
      <>
        <StepIcon icon={<Shield size={32} />} color="#3FB876" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          ShiftSync automatically checks for overtime and understaffing when you save or publish a roster. Rules are configured by your Admin.
        </p>
        <div
          className="mt-5 grid grid-cols-2 gap-3 text-sm"
        >
          {[['Max Weekly Hours', '48 hrs (default)'], ['Min Staff / Shift', '1 (default)']].map(([label, val]) => (
            <div key={label} className="p-3 rounded-xl text-center" style={{ background: '#232130', border: '1px solid #322F3D' }}>
              <p className="text-xs mb-1" style={{ color: '#6B687A' }}>{label}</p>
              <p className="font-semibold" style={{ color: '#F2F1F7' }}>{val}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-center mt-4" style={{ color: '#6B687A' }}>
          Ask your Admin to adjust these in Labor Rules.
        </p>
      </>
    ),
  },
  {
    title: 'Build Your First Roster',
    content: (
      <>
        <StepIcon icon={<Calendar size={32} />} color="#E3A73B" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          You&apos;re all set. Head to the Roster page to create your first weekly schedule. ShiftSync will highlight any conflicts before you publish.
        </p>
        <div
          className="mt-5 p-4 rounded-xl text-sm text-center"
          style={{ background: 'rgba(227,167,59,0.08)', border: '1px solid rgba(227,167,59,0.2)', color: '#E3A73B' }}
        >
          ⚡ Drafts are saved automatically — publish when you&apos;re ready.
        </div>
      </>
    ),
  },
];

// ─── Employee Steps ───────────────────────────────────────────────────────────

const employeeSteps: Step[] = [
  {
    title: 'Welcome to ShiftSync',
    content: (
      <>
        <StepIcon icon={<Calendar size={32} />} />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          See your published shifts, request leave, and swap shifts with teammates — all in one place. Your manager will be notified of every request.
        </p>
      </>
    ),
  },
  {
    title: 'Your Team',
    content: (
      <>
        <StepIcon icon={<Users size={32} />} color="#3FB876" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          You&apos;ve been assigned to a team. Your manager reviews and approves all leave and swap requests. You&apos;ll receive notifications when they act on your requests.
        </p>
      </>
    ),
  },
  {
    title: 'What You Can Do',
    content: (
      <>
        <StepIcon icon={<ArrowRight size={32} />} color="#E3A73B" />
        <div className="grid grid-cols-1 gap-3 mt-2">
          {[
            { icon: <Calendar size={16} />, label: 'View My Shifts', desc: 'See your published schedule for the week', color: '#7A7CD6' },
            { icon: <FileText size={16} />, label: 'Request Leave',  desc: 'Submit leave for any future date range', color: '#3FB876' },
            { icon: <ArrowLeftRight size={16} />, label: 'Request a Swap', desc: 'Swap a shift with a teammate on your team', color: '#E3A73B' },
          ].map(({ icon, label, desc, color }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#232130', border: '1px solid #322F3D' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>{label}</p>
                <p className="text-xs" style={{ color: '#6B687A' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
];

// ─── Admin Steps ──────────────────────────────────────────────────────────────

const adminSteps: Step[] = [
  {
    title: 'Welcome to ShiftSync',
    content: (
      <>
        <StepIcon icon={<Shield size={32} />} color="#7A7CD6" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          Configure labor rules, oversee every team&apos;s roster, and audit every change across your organization — full visibility and control.
        </p>
      </>
    ),
  },
  {
    title: 'Labor Rules',
    content: (
      <>
        <StepIcon icon={<Settings size={32} />} color="#3FB876" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          Labor rules define maximum weekly hours and minimum staff per shift. These drive the conflict-detection engine that flags violations before rosters are published.
        </p>
        <div className="mt-5 p-4 rounded-xl text-sm text-center" style={{ background: 'rgba(63,184,118,0.08)', border: '1px solid rgba(63,184,118,0.2)', color: '#3FB876' }}>
          A &quot;DEFAULT&quot; rule is already configured. Add region-specific rules from Labor Rules.
        </div>
      </>
    ),
  },
  {
    title: 'Audit Log',
    content: (
      <>
        <StepIcon icon={<BookOpen size={32} />} color="#E3A73B" />
        <p className="text-center text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
          Every change to rosters, shifts, leave requests, and swap requests is logged with who did it and when. The audit log is immutable — no entries can be deleted.
        </p>
        <div className="mt-5 p-4 rounded-xl text-sm text-center" style={{ background: 'rgba(227,167,59,0.08)', border: '1px solid rgba(227,167,59,0.2)', color: '#E3A73B' }}>
          Accessible from the Audit Log page in the sidebar.
        </div>
      </>
    ),
  },
];

// Needed for the admin steps icon import
function Settings({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

// ─── Onboarding Wizard Shell ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, setUser, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  if (!user) return null;

  const steps =
    user.role === 'MANAGER' ? managerSteps :
    user.role === 'EMPLOYEE' ? employeeSteps :
    adminSteps;

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      await apiClient.patch(`/users/${user.id}`, { hasOnboarded: true });
      await refreshUser();
      // Redirect to role home
      if (user.role === 'EMPLOYEE') router.replace('/my-shifts');
      else router.replace('/dashboard');
    } catch {
      // Even if patch fails, redirect — user can re-onboard next login
      if (user.role === 'EMPLOYEE') router.replace('/my-shifts');
      else router.replace('/dashboard');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) completeOnboarding();
    else setCurrentStep((s) => s + 1);
  };

  const homeRoute = user.role === 'EMPLOYEE' ? '/my-shifts' : '/dashboard';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#121016' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(122,124,214,0.1) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7A7CD6 0%, #9092E0 100%)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="3" rx="1.5" fill="white" />
                <rect x="3" y="10.5" width="11" height="3" rx="1.5" fill="white" opacity="0.8" />
                <rect x="3" y="17" width="7" height="3" rx="1.5" fill="white" opacity="0.6" />
              </svg>
            </div>
            <span className="font-semibold" style={{ color: '#F2F1F7' }}>ShiftSync</span>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{ background: '#1B1922', borderColor: '#322F3D', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
        >
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === currentStep ? '20px' : '6px',
                  height: '6px',
                  background: i === currentStep ? '#7A7CD6' : i < currentStep ? '#3FB876' : '#322F3D',
                }}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs mb-6" style={{ color: '#6B687A' }}>
            Step {currentStep + 1} of {totalSteps}
          </p>

          {/* Step title */}
          <h1 className="text-xl font-semibold text-center mb-6" style={{ color: '#F2F1F7' }}>
            {steps[currentStep].title}
          </h1>

          {/* Step content */}
          <div className="mb-8">
            {steps[currentStep].content}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleNext}
              disabled={isCompleting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150"
              style={{ background: '#7A7CD6', color: '#fff', opacity: isCompleting ? 0.7 : 1, cursor: isCompleting ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!isCompleting) (e.currentTarget).style.background = '#9092E0'; }}
              onMouseLeave={(e) => { if (!isCompleting) (e.currentTarget).style.background = '#7A7CD6'; }}
            >
              {isCompleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading…
                </>
              ) : isLastStep ? 'Get started' : (
                <>Next <ArrowRight size={14} /></>
              )}
            </button>

            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: '#6B687A' }}
              >
                Back
              </button>
            )}

            <a
              href={homeRoute}
              onClick={async (e) => {
                e.preventDefault();
                await apiClient.patch(`/users/${user.id}`, { hasOnboarded: true }).catch(() => {});
                await refreshUser();
                router.replace(homeRoute);
              }}
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: '#6B687A' }}
            >
              Skip for now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
