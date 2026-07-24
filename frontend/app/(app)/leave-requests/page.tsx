'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { Calendar, Plus, Check, X, FileText, User } from 'lucide-react';

interface LeaveRequestItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerComment: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [actionCommentModal, setActionCommentModal] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [managerComment, setManagerComment] = useState('');

  // Submit Leave State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'ALL' ? '/leave-requests' : `/leave-requests?status=${statusFilter}`;
      const res = await apiClient.get<{ data: LeaveRequestItem[] }>(url);
      return res.data;
    },
  });

  const submitLeaveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/leave-requests', {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setIsSubmitModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      success('Leave request submitted.');
    },
    onError: (err: Error) => error(err.message || 'Failed to submit leave request.'),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, type, comment }: { id: string; type: 'approve' | 'reject'; comment?: string }) => {
      await apiClient.post(`/leave-requests/${id}/${type}`, { comment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setActionCommentModal(null);
      setManagerComment('');
      success(`Leave request ${variables.type === 'approve' ? 'approved' : 'rejected'}.`);
    },
    onError: (err: Error) => error(err.message || 'Action failed.'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/leave-requests/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      success('Leave request cancelled.');
    },
    onError: (err: Error) => error(err.message || 'Failed to cancel request.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Leave Requests
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            {user?.role === 'EMPLOYEE'
              ? 'Submit time-off requests and track approval statuses.'
              : 'Review and manage employee leave requests.'}
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg"
          style={{ background: '#7A7CD6', color: '#fff' }}
          onMouseEnter={(e) => { (e.currentTarget).style.background = '#9092E0'; }}
          onMouseLeave={(e) => { (e.currentTarget).style.background = '#7A7CD6'; }}
        >
          <Plus size={18} />
          Request Leave
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: '#322F3D' }}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => (
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
            {s}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading leave requests...
          </div>
        ) : !requests || requests.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center space-y-2"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <FileText size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No leave requests found
            </p>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              There are no leave requests under the selected filter.
            </p>
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ background: '#1B1922', borderColor: '#322F3D' }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#7A7CD6', color: '#fff' }}>
                    {r.employee.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#F2F1F7' }}>
                      {r.employee.name}
                    </h3>
                    <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: '#A6A3B5' }}>
                      <Calendar size={12} />
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p className="text-xs italic pl-11" style={{ color: '#F2F1F7' }}>
                  &ldquo;{r.reason}&rdquo;
                </p>

                {r.managerComment && (
                  <p className="text-xs pl-11 text-amber-400">
                    Manager Note: {r.managerComment}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <StatusBadge status={r.status} />

                {/* Manager Actions */}
                {user?.role !== 'EMPLOYEE' && r.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActionCommentModal({ id: r.id, type: 'approve' })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                      style={{ background: '#3FB876' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => setActionCommentModal({ id: r.id, type: 'reject' })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1"
                      style={{ background: '#E1584F' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}

                {/* Employee Cancel */}
                {user?.role === 'EMPLOYEE' && r.employee.id === user.id && ['PENDING', 'APPROVED'].includes(r.status) && (
                  <button
                    onClick={() => cancelMutation.mutate(r.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ borderColor: 'rgba(225,88,79,0.3)', color: '#E1584F', background: 'rgba(225,88,79,0.08)' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submit Leave Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Submit Leave Request
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLeaveMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Annual vacation leave..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {submitLeaveMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Comment Modal */}
      {actionCommentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              {actionCommentModal.type === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </h2>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                Manager Comment (Optional)
              </label>
              <textarea
                rows={3}
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                placeholder="Optional notes for employee..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionCommentModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  actionMutation.mutate({
                    id: actionCommentModal.id,
                    type: actionCommentModal.type,
                    comment: managerComment,
                  })
                }
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{
                  background: actionCommentModal.type === 'approve' ? '#3FB876' : '#E1584F',
                }}
              >
                Confirm {actionCommentModal.type === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
