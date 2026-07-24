'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Calendar, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ShiftItem {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  positionLabel: string;
  roster: {
    weekStart: string;
    status: string;
  };
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MyShiftsPage() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));

  const weekStartISO = formatDateLocal(currentWeekStart);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['my-shifts', user?.teamId, weekStartISO],
    enabled: !!user?.teamId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: { shifts?: ShiftItem[] } | null }>(
        `/rosters?teamId=${user!.teamId}&weekStart=${weekStartISO}`
      );
      if (!res.data || !res.data.shifts) return [];
      return res.data.shifts.filter((s) => s.employeeId === user?.id);
    },
  });

  const myShiftsList = shifts || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            My Shift Schedule
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            View your official published shift assignments.
          </p>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-1 rounded-xl border p-1 self-start sm:self-auto" style={{ background: '#1B1922', borderColor: '#322F3D' }}>
          <button
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold px-2" style={{ color: '#F2F1F7' }}>
            Week of {currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const next = new Date(currentWeekStart);
              next.setDate(next.getDate() + 7);
              setCurrentWeekStart(next);
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Shifts Card List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading your shifts...
          </div>
        ) : myShiftsList.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center space-y-2"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <Calendar size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No published shifts for this week
            </p>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              Your manager has not published shifts or you are off this week.
            </p>
          </div>
        ) : (
          myShiftsList.map((s) => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);
            const hours = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);

            return (
              <div
                key={s.id}
                className="rounded-2xl border p-5 transition-all flex items-center justify-between gap-4"
                style={{ background: '#1B1922', borderColor: '#7A7CD6' }}
              >
                <div className="space-y-1">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold"
                    style={{ background: 'rgba(122,124,214,0.15)', color: '#9092E0' }}
                  >
                    {s.positionLabel}
                  </span>
                  <h3 className="font-bold text-base pt-1" style={{ color: '#F2F1F7' }}>
                    {start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <p className="text-xs flex items-center gap-1" style={{ color: '#A6A3B5' }}>
                    <Clock size={14} />
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({hours} hrs)
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
