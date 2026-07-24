'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Users, Calendar, Clock, ArrowLeftRight, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardMetrics {
  totalEmployees: number;
  totalTeams: number;
  pendingLeaveRequests: number;
  pendingSwapRequests: number;
  activeShiftsThisWeek: number;
  publishedRostersCount: number;
  weekStart: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardMetrics }>('/dashboard/metrics');
      return res.data;
    },
  });

  const metrics = data || {
    totalEmployees: 0,
    totalTeams: 0,
    pendingLeaveRequests: 0,
    pendingSwapRequests: 0,
    activeShiftsThisWeek: 0,
    publishedRostersCount: 0,
    weekStart: new Date().toISOString(),
  };

  const statCards = [
    {
      title: 'Active Employees',
      value: metrics.totalEmployees,
      icon: <Users size={20} />,
      color: '#7A7CD6',
      sub: 'Enrolled in organization',
    },
    {
      title: 'Active Teams',
      value: metrics.totalTeams,
      icon: <Calendar size={20} />,
      color: '#3FB876',
      sub: 'Managed roster groups',
    },
    {
      title: 'Shifts Scheduled',
      value: metrics.activeShiftsThisWeek,
      icon: <Clock size={20} />,
      color: '#9092E0',
      sub: 'Published for this week',
    },
    {
      title: 'Pending Approvals',
      value: metrics.pendingLeaveRequests + metrics.pendingSwapRequests,
      icon: <FileText size={20} />,
      color: '#E3A73B',
      sub: `${metrics.pendingLeaveRequests} Leave · ${metrics.pendingSwapRequests} Swaps`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 sm:p-8 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B1922 0%, #232130 100%)',
          borderColor: '#322F3D',
        }}
      >
        <div
          className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(122,124,214,0.15) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 space-y-2 max-w-xl">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(122,124,214,0.15)', color: '#9092E0' }}
          >
            <CheckCircle2 size={14} /> Organization Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#A6A3B5' }}>
            Here is your live workforce overview. You have{' '}
            <strong className="text-amber-400 font-semibold">
              {metrics.pendingLeaveRequests + metrics.pendingSwapRequests}
            </strong>{' '}
            pending requests requiring attention.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border p-5 space-y-3 transition-all duration-150"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: '#A6A3B5' }}>
                {card.title}
              </span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}15`, color: card.color }}
              >
                {card.icon}
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: '#F2F1F7' }}>
                {isLoading ? '...' : card.value}
              </div>
              <p className="text-xs mt-1" style={{ color: '#6B687A' }}>
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/roster"
          className="rounded-2xl border p-6 space-y-3 transition-all hover:border-[#7A7CD6] group"
          style={{ background: '#1B1922', borderColor: '#322F3D' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(122,124,214,0.15)', color: '#7A7CD6' }}>
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: '#F2F1F7' }}>
              Weekly Rosters
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: '#7A7CD6' }} />
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#A6A3B5' }}>
              Build weekly shift schedules, check labor compliance rules, and publish to team.
            </p>
          </div>
        </Link>

        <Link
          href="/leave-requests"
          className="rounded-2xl border p-6 space-y-3 transition-all hover:border-[#E3A73B] group"
          style={{ background: '#1B1922', borderColor: '#322F3D' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(227,167,59,0.15)', color: '#E3A73B' }}>
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: '#F2F1F7' }}>
              Leave Requests
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: '#E3A73B' }} />
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#A6A3B5' }}>
              Review employee time-off requests and maintain optimal staffing levels.
            </p>
          </div>
        </Link>

        <Link
          href="/swap-requests"
          className="rounded-2xl border p-6 space-y-3 transition-all hover:border-[#3FB876] group"
          style={{ background: '#1B1922', borderColor: '#322F3D' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(63,184,118,0.15)', color: '#3FB876' }}>
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: '#F2F1F7' }}>
              Shift Swaps
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: '#3FB876' }} />
            </h3>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#A6A3B5' }}>
              Approve peer-accepted shift trade requests before final roster mutation.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
