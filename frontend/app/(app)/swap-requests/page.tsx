'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeftRight, Check, X, Clock, User, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface SwapItem {
  id: string;
  status: 'PENDING_PEER' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerComment: string | null;
  createdAt: string;
  requester: { id: string; name: string; email: string };
  targetEmployee: { id: string; name: string; email: string };
  requesterShift: { id: string; startTime: string; endTime: string; positionLabel: string };
  targetShift: { id: string; startTime: string; endTime: string; positionLabel: string };
}

interface ShiftItem {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  positionLabel: string;
  employee?: { name: string };
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

export default function SwapRequestsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [swapWeekStart, setSwapWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [offeredShiftId, setOfferedShiftId] = useState('');
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [reason, setReason] = useState('Personal schedule conflict');

  const { data: swaps, isLoading } = useQuery({
    queryKey: ['swap-requests', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'ALL' ? '/swap-requests' : `/swap-requests?status=${statusFilter}`;
      const res = await apiClient.get<{ data: SwapItem[] }>(url);
      return res.data;
    },
  });

  // Fetch teams fallback if user.teamId is not set
  const { data: teamsData } = useQuery({
    queryKey: ['teams-for-swaps'],
    enabled: isModalOpen && !user?.teamId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: Array<{ id: string; name: string }> }>('/teams');
      if (res.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(res.data[0].id);
      }
      return res.data;
    },
  });

  const activeTeamId = user?.teamId || selectedTeamId || (teamsData && teamsData[0]?.id) || '';
  const weekStartISO = formatDateLocal(swapWeekStart);

  // Fetch team published roster for the specific week
  const { data: teamRoster, isLoading: isRosterLoading } = useQuery({
    queryKey: ['team-roster-swaps', activeTeamId, weekStartISO],
    enabled: !!activeTeamId && isModalOpen,
    queryFn: async () => {
      const res = await apiClient.get<{ data: { shifts?: ShiftItem[] } | null }>(
        `/rosters?teamId=${activeTeamId}&weekStart=${weekStartISO}`
      );
      return res.data;
    },
  });

  const allShifts = teamRoster?.shifts || [];
  const myShifts = allShifts.filter((s) => s.employeeId === user?.id);
  const requestedShifts = allShifts.filter((s) => s.employeeId !== user?.id);

  const createSwapMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/swap-requests', {
        offeredShiftId,
        requestedShiftId,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      setIsModalOpen(false);
      setOfferedShiftId('');
      setRequestedShiftId('');
      success('Shift swap request submitted! Sent to peer for acceptance.');
    },
    onError: (err: Error) => error(err.message || 'Failed to submit swap request.'),
  });

  const peerApproveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/swap-requests/${id}/peer-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      success('Shift swap accepted! Sent to manager for final approval.');
    },
    onError: (err: Error) => error(err.message || 'Failed to accept swap.'),
  });

  const managerApproveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/swap-requests/${id}/manager-approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      success('Shift swap approved! Shifts have been exchanged.');
    },
    onError: (err: Error) => error(err.message || 'Failed to approve swap.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/swap-requests/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
      success('Shift swap request rejected.');
    },
    onError: (err: Error) => error(err.message || 'Failed to reject swap.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Shift Swap Requests
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            Two-tier approval workflow: Peer Acceptance → Manager Final Approval.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 shadow-lg shrink-0"
          style={{ background: '#7A7CD6', color: '#fff' }}
          onMouseEnter={(e) => { (e.currentTarget).style.background = '#9092E0'; }}
          onMouseLeave={(e) => { (e.currentTarget).style.background = '#7A7CD6'; }}
        >
          <Plus size={18} />
          Request Shift Swap
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: '#322F3D' }}>
        {['ALL', 'PENDING_PEER', 'PENDING_MANAGER', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: statusFilter === s ? 'rgba(122,124,214,0.15)' : 'transparent',
              color: statusFilter === s ? '#9092E0' : '#A6A3B5',
              border: '1px solid',
              borderColor: statusFilter === s ? '#7A7CD6' : 'transparent',
            }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Swaps List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading swap requests...
          </div>
        ) : !swaps || swaps.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center space-y-2"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <ArrowLeftRight size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No swap requests found
            </p>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              There are no shift swap requests matching your filter.
            </p>
          </div>
        ) : (
          swaps.map((s) => {
            const isPeer = user?.id === s.targetEmployee.id;
            const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

            return (
              <div
                key={s.id}
                className="rounded-2xl border p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                style={{ background: '#1B1922', borderColor: '#322F3D' }}
              >
                {/* Swap Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-slate-500">
                      Requested on {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Offered Shift */}
                    <div className="p-3 rounded-xl border" style={{ background: '#232130', borderColor: '#322F3D' }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A7CD6' }}>
                        Offered by {s.requester.name}
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#F2F1F7' }}>
                        {s.requesterShift.positionLabel}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#A6A3B5' }}>
                        {new Date(s.requesterShift.startTime).toLocaleDateString()} (
                        {new Date(s.requesterShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(s.requesterShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </p>
                    </div>

                    {/* Requested Shift */}
                    <div className="p-3 rounded-xl border" style={{ background: '#232130', borderColor: '#322F3D' }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3FB876' }}>
                        Requested from {s.targetEmployee.name}
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#F2F1F7' }}>
                        {s.targetShift.positionLabel}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#A6A3B5' }}>
                        {new Date(s.targetShift.startTime).toLocaleDateString()} (
                        {new Date(s.targetShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(s.targetShift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Peer Acceptance Step */}
                  {isPeer && s.status === 'PENDING_PEER' && (
                    <>
                      <button
                        onClick={() => peerApproveMutation.mutate(s.id)}
                        className="px-3.5 py-2 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5"
                        style={{ background: '#3FB876' }}
                      >
                        <Check size={14} /> Accept Swap
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(s.id)}
                        className="px-3.5 py-2 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5"
                        style={{ background: '#E1584F' }}
                      >
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}

                  {/* Manager Approval Step */}
                  {isManager && s.status === 'PENDING_MANAGER' && (
                    <>
                      <button
                        onClick={() => managerApproveMutation.mutate(s.id)}
                        className="px-3.5 py-2 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5"
                        style={{ background: '#7A7CD6' }}
                      >
                        <Check size={14} /> Approve Swap
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(s.id)}
                        className="px-3.5 py-2 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5"
                        style={{ background: '#E1584F' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Propose Shift Swap Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Propose Shift Swap
            </h2>

            <div className="flex items-center justify-between gap-2 p-2 rounded-xl border" style={{ background: '#232130', borderColor: '#322F3D' }}>
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(swapWeekStart);
                  prev.setDate(prev.getDate() - 7);
                  setSwapWeekStart(prev);
                }}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold" style={{ color: '#F2F1F7' }}>
                Week of {swapWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(swapWeekStart);
                  next.setDate(next.getDate() + 7);
                  setSwapWeekStart(next);
                }}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSwapMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Select Your Offered Shift
                </label>
                <select
                  required
                  value={offeredShiftId}
                  onChange={(e) => setOfferedShiftId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  <option value="">Select a shift you currently hold</option>
                  {myShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.positionLabel} - {new Date(s.startTime).toLocaleDateString()} (
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))}
                </select>
                {myShifts.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    You have no published shifts assigned to swap.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Select Target Shift to Receive
                </label>
                <select
                  required
                  value={requestedShiftId}
                  onChange={(e) => setRequestedShiftId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  <option value="">Select a peer's shift to swap with</option>
                  {requestedShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.employee?.name || 'Teammate'} ({s.positionLabel}) - {new Date(s.startTime).toLocaleDateString()} (
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))}
                </select>
                {requestedShifts.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    No peer shifts available to request for swap.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Reason for Swap
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Personal schedule conflict"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSwapMutation.isPending || !offeredShiftId || !requestedShiftId}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: '#7A7CD6' }}
                >
                  {createSwapMutation.isPending ? 'Submitting...' : 'Submit Swap Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
