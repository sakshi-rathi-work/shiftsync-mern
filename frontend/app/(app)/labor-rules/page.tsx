'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { Shield, Plus, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LaborRuleItem {
  id: string;
  region: string;
  maxWeeklyHours: number;
  minStaffPerShift: number;
}

export default function LaborRulesPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [editingRule, setEditingRule] = useState<LaborRuleItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [region, setRegion] = useState('DEFAULT');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(48);
  const [minStaffPerShift, setMinStaffPerShift] = useState(1);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['labor-rules'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LaborRuleItem[] }>('/labor-rules');
      return res.data;
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: async () => {
      if (editingRule) {
        await apiClient.patch(`/labor-rules/${editingRule.id}`, {
          maxWeeklyHours,
          minStaffPerShift,
        });
      } else {
        await apiClient.post('/labor-rules', {
          region,
          maxWeeklyHours,
          minStaffPerShift,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-rules'] });
      setEditingRule(null);
      setIsCreateModalOpen(false);
      success(editingRule ? 'Labor rule updated.' : 'Labor rule created.');
    },
    onError: (err: Error) => error(err.message || 'Failed to save labor rule.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            Labor Rules Engine
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            Configure regional labor standards and shift compliance parameters.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              setEditingRule(null);
              setRegion('');
              setMaxWeeklyHours(48);
              setMinStaffPerShift(1);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg"
            style={{ background: '#7A7CD6', color: '#fff' }}
          >
            <Plus size={18} /> Add Regional Rule
          </button>
        )}
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading labor rules...
          </div>
        ) : (
          rules?.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border p-6 space-y-4 relative overflow-hidden"
              style={{ background: '#1B1922', borderColor: '#322F3D' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(122,124,214,0.15)', color: '#7A7CD6' }}>
                    <Shield size={18} />
                  </div>
                  <h3 className="font-bold text-base" style={{ color: '#F2F1F7' }}>
                    {rule.region}
                  </h3>
                </div>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setRegion(rule.region);
                      setMaxWeeklyHours(rule.maxWeeklyHours);
                      setMinStaffPerShift(rule.minStaffPerShift);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: '#A6A3B5' }}
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#322F3D' }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: '#A6A3B5' }}>Max Weekly Hours</span>
                  <span className="font-bold text-sm" style={{ color: '#F2F1F7' }}>
                    {rule.maxWeeklyHours} hrs / week
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: '#A6A3B5' }}>Min Staff per Shift</span>
                  <span className="font-bold text-sm" style={{ color: '#F2F1F7' }}>
                    {rule.minStaffPerShift} employees
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              {editingRule ? `Edit Rule: ${editingRule.region}` : 'New Regional Labor Rule'}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveRuleMutation.mutate();
              }}
              className="space-y-4"
            >
              {!editingRule && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                    Region Identifier
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-CA, UK, DEFAULT"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Maximum Weekly Hours
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={168}
                  value={maxWeeklyHours}
                  onChange={(e) => setMaxWeeklyHours(parseInt(e.target.value) || 48)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Minimum Required Staff per Shift
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={minStaffPerShift}
                  onChange={(e) => setMinStaffPerShift(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveRuleMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
