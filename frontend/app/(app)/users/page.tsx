'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { Plus, UserX, Shield, Users as UsersIcon, Search, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isActive: boolean;
  hasOnboarded: boolean;
  teamId: string | null;
  createdAt: string;
}

interface TeamItem {
  id: string;
  name: string;
  region?: string;
}

interface LaborRuleItem {
  id: string;
  region: string;
  maxWeeklyHours: number;
  minStaffPerShift: number;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DEACTIVATED'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; pass: string } | null>(null);

  // Form state - User
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [teamId, setTeamId] = useState('');

  // Form state - Team
  const [teamName, setTeamName] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [teamRegion, setTeamRegion] = useState('DEFAULT');

  // Queries
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const url = roleFilter === 'ALL' ? '/users' : `/users?role=${roleFilter}`;
      const res = await apiClient.get<{ data: UserItem[] }>(url);
      return res.data;
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TeamItem[] }>('/teams');
      return res.data;
    },
  });

  const { data: laborRulesData } = useQuery({
    queryKey: ['labor-rules'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LaborRuleItem[] }>('/labor-rules');
      return res.data;
    },
  });

  const availableRegions = Array.from(
    new Set([
      'DEFAULT',
      'US-CA',
      'UK',
      'EU',
      ...(laborRulesData || []).map((r) => r.region),
    ])
  );

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: UserItem & { tempPassword?: string } }>('/users', {
        name,
        email,
        role,
        teamId: teamId || undefined,
      });
      return res.data;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setTeamId('');
      if (newUser.tempPassword) {
        setTempPasswordModal({ email: newUser.email, pass: newUser.tempPassword });
      } else {
        success('User created successfully.');
      }
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create user.');
    },
  });

  // Create Team Mutation
  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: TeamItem }>('/teams', {
        name: teamName,
        managerId: selectedManagerId,
        region: teamRegion,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsTeamModalOpen(false);
      setTeamName('');
      setSelectedManagerId('');
      setTeamRegion('DEFAULT');
      success('Team created successfully.');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create team.');
    },
  });

  // Deactivate User Mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.patch(`/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('User account deactivated.');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to deactivate user.');
    },
  });

  // Reactivate User Mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.patch(`/users/${userId}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('User account reactivated.');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to reactivate user.');
    },
  });

  // Assign Team Mutation
  const [assignTeamModalUser, setAssignTeamModalUser] = useState<UserItem | null>(null);
  const [selectedTeamForAssign, setSelectedTeamForAssign] = useState<string>('');

  const assignTeamMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      await apiClient.patch(`/users/${userId}`, { teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAssignTeamModalUser(null);
      setSelectedTeamForAssign('');
      success('Team assigned successfully.');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to assign team.');
    },
  });

  const activeCount = (usersData || []).filter((u) => u.isActive).length;
  const deactivatedCount = (usersData || []).filter((u) => !u.isActive).length;

  const filteredUsers = (usersData || []).filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === 'ACTIVE' ? u.isActive : !u.isActive;
    return matchesSearch && matchesStatus;
  });

  const availableManagers = (usersData || []).filter(
    (u) => (u.role === 'MANAGER' || u.role === 'ADMIN') && u.isActive
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F2F1F7' }}>
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A6A3B5' }}>
            Provision team members, assign managers, and manage account statuses.
          </p>
        </div>

        {currentUser?.role === 'ADMIN' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 border"
              style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = '#2B283A'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = '#232130'; }}
            >
              <UsersIcon size={18} />
              Create Team
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 shadow-lg"
              style={{ background: '#7A7CD6', color: '#fff' }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = '#9092E0'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = '#7A7CD6'; }}
            >
              <Plus size={18} />
              Add User
            </button>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: '#322F3D' }}>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          style={{
            background: activeTab === 'ACTIVE' ? '#7A7CD6' : '#1B1922',
            color: activeTab === 'ACTIVE' ? '#fff' : '#A6A3B5',
            border: '1px solid',
            borderColor: activeTab === 'ACTIVE' ? '#7A7CD6' : '#322F3D',
          }}
        >
          <UserCheck size={15} />
          Active Users ({activeCount})
        </button>

        <button
          onClick={() => setActiveTab('DEACTIVATED')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          style={{
            background: activeTab === 'DEACTIVATED' ? 'rgba(225,88,79,0.15)' : '#1B1922',
            color: activeTab === 'DEACTIVATED' ? '#E1584F' : '#A6A3B5',
            border: '1px solid',
            borderColor: activeTab === 'DEACTIVATED' ? '#E1584F' : '#322F3D',
          }}
        >
          <UserX size={15} />
          Deactivated Users ({deactivatedCount})
        </button>
      </div>

      {/* Filters Bar */}
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border"
        style={{ background: '#1B1922', borderColor: '#322F3D' }}
      >
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B687A' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none"
            style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'ADMIN', 'MANAGER', 'EMPLOYEE'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: roleFilter === r ? '#7A7CD6' : '#232130',
                color: roleFilter === r ? '#fff' : '#A6A3B5',
                border: '1px solid',
                borderColor: roleFilter === r ? '#7A7CD6' : '#322F3D',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: '#1B1922', borderColor: '#322F3D' }}
      >
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: '#A6A3B5' }}>
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UsersIcon size={32} className="mx-auto" style={{ color: '#6B687A' }} />
            <p className="text-sm font-medium" style={{ color: '#F2F1F7' }}>
              No {activeTab.toLowerCase()} users found
            </p>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              {activeTab === 'ACTIVE'
                ? 'Try adjusting your search filter or add a new user.'
                : 'There are currently no deactivated user accounts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs border-b uppercase" style={{ background: '#232130', borderColor: '#322F3D', color: '#A6A3B5' }}>
                <tr>
                  <th className="px-5 py-3.5 font-medium">User</th>
                  <th className="px-5 py-3.5 font-medium">Role</th>
                  <th className="px-5 py-3.5 font-medium">Team</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Onboarded</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#322F3D' }}>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ background: u.isActive ? '#7A7CD6' : '#322F3D', color: '#fff' }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: '#F2F1F7' }}>
                            {u.name}
                          </p>
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#A6A3B5' }}>
                            <Mail size={12} /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
                        style={{
                          background:
                            u.role === 'ADMIN'
                              ? 'rgba(122,124,214,0.15)'
                              : u.role === 'MANAGER'
                              ? 'rgba(227,167,59,0.15)'
                              : 'rgba(63,184,118,0.15)',
                          color:
                            u.role === 'ADMIN'
                              ? '#9092E0'
                              : u.role === 'MANAGER'
                              ? '#E3A73B'
                              : '#3FB876',
                        }}
                      >
                        {u.role === 'ADMIN' && <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium">
                      {u.teamId ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border"
                          style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                        >
                          <UsersIcon size={12} style={{ color: '#7A7CD6' }} />
                          {(teamsData || []).find((t) => t.id === u.teamId)?.name || 'Assigned'}
                        </span>
                      ) : u.role === 'EMPLOYEE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#E3A73B' }}>
                          Unassigned
                        </span>
                      ) : u.role === 'MANAGER' ? (
                        <span className="text-xs" style={{ color: '#6B687A' }}>
                          Team Manager
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#6B687A' }}>
                          System Admin
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: u.isActive ? '#3FB876' : '#E1584F' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: u.isActive ? '#3FB876' : '#E1584F' }}
                        />
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs" style={{ color: '#A6A3B5' }}>
                      {u.hasOnboarded ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <UserCheck size={14} /> Completed
                        </span>
                      ) : (
                        <span style={{ color: '#E3A73B' }}>Pending</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {currentUser?.role === 'ADMIN' && u.id !== currentUser.id && (
                        <div className="flex items-center justify-end gap-2">
                          {/* Assign Team is strictly restricted to unassigned EMPLOYEES */}
                          {u.isActive && !u.teamId && u.role === 'EMPLOYEE' && (
                            <button
                              onClick={() => {
                                setAssignTeamModalUser(u);
                                setSelectedTeamForAssign('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1 cursor-pointer"
                              style={{ borderColor: '#7A7CD6', color: '#9092E0', background: 'rgba(122,124,214,0.1)' }}
                            >
                              <Plus size={13} /> Assign Team
                            </button>
                          )}

                          {u.isActive ? (
                            <button
                              onClick={() => deactivateUserMutation.mutate(u.id)}
                              disabled={deactivateUserMutation.isPending}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1 cursor-pointer"
                              style={{ borderColor: 'rgba(225,88,79,0.3)', color: '#E1584F', background: 'rgba(225,88,79,0.08)' }}
                            >
                              <UserX size={13} /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateUserMutation.mutate(u.id)}
                              disabled={reactivateUserMutation.isPending}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1 cursor-pointer"
                              style={{ borderColor: 'rgba(63,184,118,0.3)', color: '#3FB876', background: 'rgba(63,184,118,0.08)' }}
                            >
                              <UserCheck size={13} /> Reactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Add New User
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'MANAGER' | 'EMPLOYEE')}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              {role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                    Assign to Team (Optional)
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                    style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                  >
                    <option value="">No Team Assigned</option>
                    {(teamsData || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Create New Team
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTeamMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Store Operations, Customer Support"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Assign Manager
                </label>
                <select
                  required
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  <option value="">Select a Manager</option>
                  {availableManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Labor Rule Region / Jurisdiction
                </label>
                <select
                  value={teamRegion}
                  onChange={(e) => setTeamRegion(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  {availableRegions.map((r) => {
                    const rule = (laborRulesData || []).find((lr) => lr.region === r);
                    const ruleDetail = rule ? ` (${rule.maxWeeklyHours}h/wk max, min ${rule.minStaffPerShift} staff)` : '';
                    return (
                      <option key={r} value={r}>
                        {r}{ruleDetail}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] mt-1" style={{ color: '#6B687A' }}>
                  Determines which weekly hour caps and rest period rules apply to this team.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temp Password Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl text-center"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(63,184,118,0.15)', color: '#3FB876' }}>
              <UserCheck size={24} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              User Provisioned Successfully!
            </h2>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              Provide this temporary password to <strong>{tempPasswordModal.email}</strong>. It will not be shown again.
            </p>

            <div
              className="p-3 rounded-xl font-mono text-sm font-bold border select-all"
              style={{ background: '#232130', borderColor: '#7A7CD6', color: '#9092E0' }}
            >
              {tempPasswordModal.pass}
            </div>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white"
              style={{ background: '#7A7CD6' }}
            >
              Got it, close
            </button>
          </div>
        </div>
      )}

      {/* Assign Team Modal */}
      {assignTeamModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl"
            style={{ background: '#1B1922', borderColor: '#322F3D' }}
          >
            <h2 className="text-lg font-bold" style={{ color: '#F2F1F7' }}>
              Assign Team to {assignTeamModalUser.name}
            </h2>
            <p className="text-xs" style={{ color: '#A6A3B5' }}>
              Select an active team to assign to this unassigned member ({assignTeamModalUser.email}).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedTeamForAssign) return;
                assignTeamMutation.mutate({
                  userId: assignTeamModalUser.id,
                  teamId: selectedTeamForAssign,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#A6A3B5' }}>
                  Select Team
                </label>
                <select
                  required
                  value={selectedTeamForAssign}
                  onChange={(e) => setSelectedTeamForAssign(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border outline-none"
                  style={{ background: '#232130', borderColor: '#322F3D', color: '#F2F1F7' }}
                >
                  <option value="">-- Select Team --</option>
                  {(teamsData || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignTeamModalUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignTeamMutation.isPending || !selectedTeamForAssign}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: '#7A7CD6' }}
                >
                  {assignTeamMutation.isPending ? 'Assigning...' : 'Assign Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
