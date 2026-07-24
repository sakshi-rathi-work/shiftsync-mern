'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import {
  ChevronLeft, ChevronRight, Plus, Download, AlertTriangle, CheckCircle2,
  Calendar, Clock, Trash2, Edit2, ShieldAlert, FileSpreadsheet
} from 'lucide-react';

interface TeamItem {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
}

interface ShiftItem {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  positionLabel: string;
  employee?: { name: string };
}

interface RosterData {
  id: string;
  teamId: string;
  weekStart: string;
  status: 'DRAFT' | 'PUBLISHED';
  version: number;
  shifts: ShiftItem[];
}

interface ConflictItem {
  shiftId?: string;
  employeeId?: string;
  reason: string;
  severity: 'BLOCKING' | 'WARNING';
}

// Helpers for Week Start (Monday)
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

export default function RosterPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);

  // Shift Form State
  const [employeeId, setEmployeeId] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Mon, 6 = Sun
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('17:00');
  const [positionLabel, setPositionLabel] = useState('Cashier');

  // Fetch teams available to this user
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TeamItem[] }>('/teams');
      if (res.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(res.data[0].id);
      }
      return res.data;
    },
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', selectedTeamId],
    enabled: !!selectedTeamId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserItem[] }>(`/teams/${selectedTeamId}/members`);
      return res.data;
    },
  });

  // Fetch Roster
  const weekStartISO = formatDateLocal(currentWeekStart);
  const { data: roster, isLoading: isRosterLoading } = useQuery({
    queryKey: ['roster', selectedTeamId, weekStartISO],
    enabled: !!selectedTeamId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: RosterData | null }>(
        `/rosters?teamId=${selectedTeamId}&weekStart=${weekStartISO}`
      );
      return res.data;
    },
  });

  // Fetch Roster Conflicts
  const { data: conflicts } = useQuery({
    queryKey: ['roster-conflicts', roster?.id],
    enabled: !!roster?.id,
    queryFn: async () => {
      const res = await apiClient.get<{ data: ConflictItem[] }>(`/rosters/${roster!.id}/conflicts`);
      return res.data;
    },
  });

  // Create Draft Roster Mutation
  const createRosterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: RosterData }>('/rosters', {
        teamId: selectedTeamId,
        weekStart: weekStartISO,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', selectedTeamId, weekStartISO] });
      success('Draft roster created.');
    },
    onError: (err: Error) => error(err.message || 'Failed to create roster.'),
  });

  // Save Shifts Mutation
  const saveShiftsMutation = useMutation({
    mutationFn: async (updatedShifts: ShiftItem[]) => {
      if (!roster) return;
      await apiClient.patch<{ data: { roster: RosterData; conflicts: ConflictItem[] } }>(
        `/rosters/${roster.id}/shifts`,
        {
          version: roster.version,
          shifts: updatedShifts.map((s) => ({
            id: s.id?.startsWith('temp-') ? undefined : s.id,
            employeeId: s.employeeId,
            startTime: s.startTime,
            endTime: s.endTime,
            positionLabel: s.positionLabel,
          })),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', selectedTeamId, weekStartISO] });
      queryClient.invalidateQueries({ queryKey: ['roster-conflicts', roster?.id] });
      setIsShiftModalOpen(false);
      success('Shifts updated.');
    },
    onError: (err: Error) => error(err.message || 'Failed to save shifts. Conflict or stale version.'),
  });

  // Publish Roster Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!roster) return;
      await apiClient.post(`/rosters/${roster.id}/publish`, { version: roster.version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', selectedTeamId, weekStartISO] });
      success('Roster published! Notifications sent to team members.');
    },
    onError: (err: Error) => error(err.message || 'Cannot publish roster due to blocking conflicts.'),
  });

  // Days array (Monday to Sunday)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Handle shift save
  const handleSaveShift = () => {
    if (!employeeId || !roster) return;

    const shiftDay = new Date(days[selectedDayIndex]);
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startTime = new Date(shiftDay);
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date(shiftDay);
    endTime.setHours(endH, endM, 0, 0);

    const newShiftItem: ShiftItem = {
      id: editingShift ? editingShift.id : `temp-${Date.now()}`,
      employeeId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      positionLabel,
    };

    let updatedShifts = [...(roster.shifts || [])];
    if (editingShift) {
      updatedShifts = updatedShifts.map((s) => (s.id === editingShift.id ? newShiftItem : s));
    } else {
      updatedShifts.push(newShiftItem);
    }

    saveShiftsMutation.mutate(updatedShifts);
  };

  // Handle shift delete
  const handleDeleteShift = (shiftId: string) => {
    if (!roster) return;
    const updatedShifts = roster.shifts.filter((s) => s.id !== shiftId);
    saveShiftsMutation.mutate(updatedShifts);
  };

  const handleExportCsv = async () => {
    if (!roster) return;
    try {
      const csvText = await apiClient.getText(`/rosters/${roster.id}/export.csv`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timesheet-roster-${roster.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success('Timesheet CSV downloaded.');
    } catch (err: any) {
      error(err.message || 'Failed to export CSV.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Roster & Shift Builder
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            Interactive matrix layout (Days as columns, Employees as rows).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Team Selector */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold border outline-none"
            style={{ background: '#1B1922', borderColor: '#322F3D', color: '#F2F1F7' }}
          >
            {(teams || []).map((t) => (
              <option key={t.id} value={t.id}>
                Team: {t.name}
              </option>
            ))}
          </select>

          {/* Week Selector */}
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ background: '#1B1922', borderColor: '#322F3D' }}>
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

          {/* Export CSV */}
          {roster?.status === 'PUBLISHED' && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
              style={{ background: '#232130', borderColor: '#322F3D', color: '#3FB876' }}
            >
              <Download size={14} /> Export CSV
            </button>
          )}

          {/* Publish Roster Button */}
          {roster?.status === 'DRAFT' && (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg"
              style={{ background: '#3FB876' }}
            >
              <CheckCircle2 size={16} />
              {publishMutation.isPending ? 'Publishing...' : 'Publish Roster'}
            </button>
          )}
        </div>
      </div>

      {/* Conflict Warnings Banner */}
      {conflicts && conflicts.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-2"
          style={{ background: 'rgba(225,88,79,0.08)', borderColor: 'rgba(225,88,79,0.3)' }}
        >
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <ShieldAlert size={18} />
            Rule Engine Compliance Warnings ({conflicts.length})
          </div>
          <ul className="text-xs space-y-1 list-disc list-inside text-rose-300">
            {conflicts.map((c, i) => (
              <li key={i}>
                <strong>[{c.severity}]</strong> {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Roster Grid */}
      {!selectedTeamId || isRosterLoading ? (
        <div className="p-16 text-center text-sm" style={{ color: '#A6A3B5' }}>
          Loading roster grid...
        </div>
      ) : !roster ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-4"
          style={{ background: '#1B1922', borderColor: '#322F3D' }}
        >
          <Calendar size={40} className="mx-auto" style={{ color: '#6B687A' }} />
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#F2F1F7' }}>
              No Roster Created for This Week
            </h3>
            <p className="text-xs mt-1" style={{ color: '#A6A3B5' }}>
              Create a draft roster to begin scheduling shifts for your team.
            </p>
          </div>
          <button
            onClick={() => createRosterMutation.mutate()}
            disabled={createRosterMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#7A7CD6' }}
          >
            <Plus size={18} /> Create Draft Roster
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={roster.status} />
              <span className="text-xs font-mono text-slate-500">v{roster.version}</span>
            </div>

            {roster.status === 'DRAFT' && (
              <button
                onClick={() => {
                  setEditingShift(null);
                  setEmployeeId((teamMembers || [])[0]?.id || '');
                  setIsShiftModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#7A7CD6' }}
              >
                <Plus size={14} /> Add Shift
              </button>
            )}
          </div>

          {/* Grid Table */}
          <div
            className="rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-slate-400" style={{ background: '#232130', borderColor: '#322F3D' }}>
                    <th className="p-4 font-bold border-r w-48 sticky left-0 z-20" style={{ background: '#232130', borderColor: '#322F3D' }}>
                      Employee
                    </th>
                    {days.map((d, index) => (
                      <th key={index} className="p-3 text-center border-r min-w-[140px]" style={{ borderColor: '#322F3D' }}>
                        <div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: '#7A7CD6' }}>
                          {d.toLocaleDateString(undefined, { weekday: 'short' })}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#322F3D' }}>
                  {(teamMembers || []).map((emp) => (
                    <tr key={emp.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* Employee Row Header */}
                      <td className="p-4 border-r font-medium sticky left-0 z-10" style={{ background: '#1B1922', borderColor: '#322F3D', color: '#F2F1F7' }}>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{emp.email}</div>
                      </td>

                      {/* Shift Cells for each day */}
                      {days.map((dayDate, dayIdx) => {
                        const dayISO = formatDateLocal(dayDate);
                        const empShifts = roster.shifts.filter((s) => {
                          const sDate = formatDateLocal(new Date(s.startTime));
                          return s.employeeId === emp.id && sDate === dayISO;
                        });

                        return (
                          <td key={dayIdx} className="p-2 border-r align-top text-center" style={{ borderColor: '#322F3D' }}>
                            {empShifts.length === 0 ? (
                              <div className="h-14 flex items-center justify-center text-[10px] text-slate-600 border border-dashed rounded-lg border-slate-800">
                                —
                              </div>
                            ) : (
                              empShifts.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-2 rounded-xl text-left border space-y-1 relative group transition-all"
                                  style={{
                                    background: '#232130',
                                    borderColor: '#7A7CD6',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[11px]" style={{ color: '#F2F1F7' }}>
                                      {s.positionLabel}
                                    </span>
                                    {roster.status === 'DRAFT' && (
                                      <button
                                        onClick={() => handleDeleteShift(s.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-indigo-300 flex items-center gap-1 font-mono">
                                    <Clock size={10} />
                                    {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                    {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Assign Shift
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Select Employee
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  {(teamMembers || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Day of Week
                </label>
                <select
                  value={selectedDayIndex}
                  onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  {days.map((d, i) => (
                    <option key={i} value={i}>
                      {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Position Label
                </label>
                <input
                  type="text"
                  required
                  value={positionLabel}
                  onChange={(e) => setPositionLabel(e.target.value)}
                  placeholder="Cashier, Nurse, Barista..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveShift}
                  disabled={saveShiftsMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {saveShiftsMutation.isPending ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
