'use client';

import React, { useState } from 'react';
import { Search, UserPlus, Edit2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  teacherStatus: string | null;
  gradeId?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { courses?: number; subscriptions?: number };
}

interface UserDirectoryProps {
  users: UserRow[];
  totalUsers: number;
  userPage: number;
  roleFilter: string;
  searchQuery: string;
  actionLoading: string | null;
  onPageChange: (page: number) => void;
  onRoleFilterChange: (role: string) => void;
  onSearchChange: (query: string) => void;
  onToggleActive: (userId: string, isActive: boolean) => void;
  onRefresh?: () => void;
}

export default function UserDirectory({
  users,
  totalUsers,
  userPage,
  roleFilter,
  searchQuery,
  actionLoading,
  onPageChange,
  onRoleFilterChange,
  onSearchChange,
  onToggleActive,
  onRefresh,
}: UserDirectoryProps) {
  const totalPages = Math.ceil(totalUsers / 10) || 1;

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<string>('STUDENT');
  const [editLoading, setEditLoading] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setFeedback(null);

    try {
      const res = await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'User account created successfully!' });
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        if (onRefresh) onRefresh();
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: errorMessage(err, 'Failed to create user') });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditLoading(true);
    setFeedback(null);

    try {
      const res = await fetchApi(`/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
        }),
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'User updated successfully!' });
        setEditingUser(null);
        if (onRefresh) onRefresh();
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: errorMessage(err, 'Failed to update user') });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 animate-fadeIn">
      {feedback && (
        <div
          className={`mx-5 mt-5 p-4 rounded-2xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="glass-input w-full pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="glass-input text-xs"
          >
            <option value="">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Admins</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-6">User</th>
              <th className="py-3 px-6">Role</th>
              <th className="py-3 px-6">Account Status</th>
              <th className="py-3 px-6">Joined Date</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/40 transition">
                <td className="py-4 px-6">
                  <p className="font-semibold text-white">{u.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      u.role === 'ADMIN'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : u.role === 'TEACHER'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      u.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setEditName(u.name);
                        setEditEmail(u.email);
                        setEditRole(u.role);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Edit User"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const verb = u.isActive ? 'suspend' : 'activate';
                        if (
                          confirm(
                            `Are you sure you want to ${verb} "${u.name}" (${u.email})?` +
                              (u.isActive ? ' They will immediately lose access to the platform.' : '')
                          )
                        ) {
                          onToggleActive(u.id, !u.isActive);
                        }
                      }}
                      disabled={actionLoading === u.id || u.role === 'ADMIN'}
                      className={`py-1 px-3 rounded-lg text-[11px] font-semibold transition ${
                        u.isActive
                          ? 'bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {u.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing page <span className="text-white font-bold">{userPage}</span> of{' '}
          <span className="text-white font-bold">{totalPages}</span> ({totalUsers} total users)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(userPage - 1)}
            disabled={userPage <= 1}
            className="py-1 px-3 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 font-semibold"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(userPage + 1)}
            disabled={userPage >= totalPages}
            className="py-1 px-3 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 font-semibold"
          >
            Next
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New User</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ahmed Mahmoud"
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (min 8 characters)"
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="glass-input w-full text-xs"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md"
              >
                {createLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleEditUser}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit User Profile</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="glass-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="glass-input w-full text-xs"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
