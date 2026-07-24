'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { Bell, CheckCheck, Circle, Clock } from 'lucide-react';

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { success } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: NotificationItem[] }>('/notifications');
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      success('All notifications marked as read.');
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Notifications Center
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            Stay updated on roster publications, leave responses, and swap requests.
          </p>
        </div>

        <button
          onClick={() => markAllReadMutation.mutate()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
          style={{ borderColor: '#322F3D', color: '#9092E0', background: 'rgba(122,124,214,0.1)' }}
        >
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading notifications...
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center space-y-2"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <Bell size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No notifications
            </p>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              You are all caught up!
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              className="rounded-xl border p-4 transition-all flex items-start justify-between gap-4 cursor-pointer"
              style={{
                background: n.isRead ? '#1B1922' : '#232130',
                borderColor: n.isRead ? '#322F3D' : '#7A7CD6',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-2 h-2 rounded-full mt-2 shrink-0"
                  style={{ background: n.isRead ? 'transparent' : '#7A7CD6' }}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium" style={{ color: n.isRead ? '#A6A3B5' : '#F2F1F7' }}>
                    {n.message}
                  </p>
                  <p className="text-[11px] flex items-center gap-1" style={{ color: '#6B687A' }}>
                    <Clock size={12} /> {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
