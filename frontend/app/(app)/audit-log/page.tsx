'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { BookOpen, Search, User, FileJson, Clock } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: object | null;
  afterState: object;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', entityTypeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      const res = await apiClient.get<{ data: AuditLogEntry[]; meta: { totalCount: number } }>(`/audit-log?${params}`);
      return res;
    },
  });

  const entries = data?.data || [];
  const totalCount = data?.meta?.totalCount || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
          Immutable Audit Log
        </h1>
        <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
          Comprehensive security and operational history of all roster, shift, and request mutations.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border"
        style={{ background: '#1B1922', borderColor: '#322F3D' }}
      >
        <span className="text-xs font-semibold text-slate-400 pl-2">Filter by Entity:</span>
        {['', 'Roster', 'LeaveRequest', 'SwapRequest', 'LaborRule', 'User'].map((e) => (
          <button
            key={e}
            onClick={() => { setEntityTypeFilter(e); setPage(1); }}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: entityTypeFilter === e ? '#7A7CD6' : '#232130',
              color: entityTypeFilter === e ? '#fff' : '#A6A3B5',
              border: '1px solid',
              borderColor: entityTypeFilter === e ? '#7A7CD6' : '#322F3D',
            }}
          >
            {e || 'All Entities'}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: '#1B1922', borderColor: '#322F3D' }}
      >
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading audit log entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <BookOpen size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No audit log entries found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs border-b uppercase" style={{ background: '#232130', borderColor: '#322F3D', color: '#A6A3B5' }}>
                <tr>
                  <th className="px-5 py-3.5 font-medium">Timestamp</th>
                  <th className="px-5 py-3.5 font-medium">Actor</th>
                  <th className="px-5 py-3.5 font-medium">Action</th>
                  <th className="px-5 py-3.5 font-medium">Target Entity</th>
                  <th className="px-5 py-3.5 font-medium">State Mutation</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#322F3D' }}>
                {entries.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-xs shrink-0 whitespace-nowrap" style={{ color: '#A6A3B5' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} style={{ color: '#7A7CD6' }} />
                        <div>
                          <p className="font-semibold text-xs" style={{ color: '#F2F1F7' }}>
                            {log.actor.name}
                          </p>
                          <p className="text-[10px]" style={{ color: '#6B687A' }}>
                            {log.actor.role}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                        style={{ background: 'rgba(122,124,214,0.15)', color: '#9092E0' }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs font-mono" style={{ color: '#A6A3B5' }}>
                      {log.entityType} ({(log.entityId || '').slice(0, 8)}...)
                    </td>

                    <td className="px-5 py-4">
                      <details className="cursor-pointer text-xs">
                        <summary className="text-indigo-400 font-medium hover:underline inline-flex items-center gap-1">
                          <FileJson size={14} /> View Payload
                        </summary>
                        <div
                          className="mt-2 p-2.5 rounded-lg border font-mono text-[11px] overflow-x-auto max-w-md"
                          style={{ background: '#232130', borderColor: '#322F3D', color: '#3FB876' }}
                        >
                          <pre>{JSON.stringify({ before: log.beforeState, after: log.afterState }, null, 2)}</pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
