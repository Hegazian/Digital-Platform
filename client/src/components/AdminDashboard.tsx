'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, TrendingUp, Webhook, ShieldAlert, CheckCircle, BookOpen, Tag, Settings, ShoppingBag, Library } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import PlatformMetrics from './admin/PlatformMetrics';
import TeacherApprovalQueue from './admin/TeacherApprovalQueue';
import OfflinePaymentQueue from './admin/OfflinePaymentQueue';
import UserDirectory from './admin/UserDirectory';
import DeveloperTabs from './admin/DeveloperTabs';
import AuditLogsTable from './admin/AuditLogsTable';
import CourseApprovalQueue from './admin/CourseApprovalQueue';
import PendingOrdersManager from './admin/PendingOrdersManager';
import CollectionsManager from './admin/CollectionsManager';
import VoucherManager from './admin/VoucherManager';
import PlatformSettings from './admin/PlatformSettings';
import AcademicStructureManager from './admin/AcademicStructureManager';
import { GraduationCap } from 'lucide-react';

/** Delays a rapidly-changing value so query keys stay stable while typing. */
function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'academic' | 'courses' | 'collections' | 'orders' | 'vouchers' | 'teachers' | 'payments' | 'users' | 'settings' | 'developers' | 'audit'
  >('overview');

  // User directory controls (search is debounced -> no refetch per keystroke)
  const [userPage, setUserPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);

  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => fetchApi('/admin/stats'),
  });

  const pendingTeachersQuery = useQuery({
    queryKey: ['admin', 'teachers', 'pending'],
    queryFn: () => fetchApi('/admin/teachers/pending'),
  });

  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses', 'overview'],
    queryFn: async () => {
      const res = await fetchApi('/courses?limit=200');
      const list = res.data?.courses || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const pendingSubscriptionsQuery = useQuery({
    queryKey: ['admin', 'subscriptions', 'pending'],
    queryFn: () => fetchApi('/subscriptions/pending'),
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { page: userPage, role: roleFilter, search: debouncedSearch }],
    queryFn: () => {
      let url = `/admin/users?page=${userPage}&limit=10`;
      if (roleFilter) url += `&role=${roleFilter}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      return fetchApi(url);
    },
    placeholderData: (prev: any) => prev,
  });

  const stats = statsQuery.data?.data ?? null;
  const pendingTeachers: any[] = pendingTeachersQuery.data?.data ?? [];
  const courseList: any[] = coursesQuery.data ?? [];
  const totalCoursesCount = courseList.length;
  const pendingCoursesCount = courseList.filter((c: any) => c.status === 'UNDER_REVIEW').length;
  const pendingSubscriptions: any[] = pendingSubscriptionsQuery.data?.data ?? [];
  const users: any[] = usersQuery.data?.data?.users ?? [];
  const totalUsers = usersQuery.data?.data?.pagination?.total ?? 0;

  const invalidateAfter = (...keys: unknown[][]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const handleTeacherAction = useMutation({
    mutationFn: ({ teacherId, status }: { teacherId: string; status: 'APPROVED' | 'REJECTED' }) =>
      fetchApi(`/admin/teachers/${teacherId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () =>
      invalidateAfter(['admin', 'teachers'], ['admin', 'stats'], ['admin', 'users']),
    onError: (e: unknown) => alert(errorMessage(e, 'Failed to update teacher status')),
  });

  const handleSubscriptionAction = useMutation({
    mutationFn: ({ subId, action }: { subId: string; action: 'approve' | 'reject' }) =>
      fetchApi(`/subscriptions/${subId}/${action}`, { method: 'PATCH' }),
    onSuccess: () => invalidateAfter(['admin', 'subscriptions'], ['admin', 'stats']),
    onError: (e: unknown) => alert(errorMessage(e, 'Failed to process subscription')),
  });

  const handleToggleActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      fetchApi(`/admin/users/${userId}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => invalidateAfter(['admin', 'users'], ['admin', 'stats']),
    onError: (e: unknown) => alert(errorMessage(e, 'Failed to toggle user status')),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-600/10 px-3 py-1 rounded-full border border-rose-500/20">
            System Administration
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-2">Platform Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Global governance of secondary school curriculums, educator verifications, payments, and system security.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingCoursesCount > 0 && (
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
              {pendingCoursesCount} Courses for Review
            </span>
          )}
          {pendingTeachers.length > 0 && (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              {pendingTeachers.length} Pending Teachers
            </span>
          )}
          {pendingSubscriptions.length > 0 && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              {pendingSubscriptions.length} Pending Payments
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'overview', label: 'Platform Metrics', icon: TrendingUp },
          { id: 'academic', label: 'Academic Structure', icon: GraduationCap },
          { id: 'courses', label: `Course Management (${totalCoursesCount})`, icon: BookOpen },
          { id: 'collections', label: 'Collections', icon: Library },
          { id: 'orders', label: 'Course Orders', icon: ShoppingBag },
          { id: 'vouchers', label: 'Promo Codes', icon: Tag },
          { id: 'teachers', label: `Teacher Approvals (${pendingTeachers.length})`, icon: Shield },
          { id: 'payments', label: `Offline Payments (${pendingSubscriptions.length})`, icon: CheckCircle },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'settings', label: 'Platform & Domain', icon: Settings },
          { id: 'developers', label: 'API & Webhooks', icon: Webhook },
          { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      {activeTab === 'overview' && (
        <PlatformMetrics stats={stats} />
      )}

      {activeTab === 'academic' && (
        <AcademicStructureManager />
      )}

      {activeTab === 'courses' && (
        <CourseApprovalQueue
          onCourseReviewed={() => invalidateAfter(['admin', 'courses'], ['admin', 'stats'])}
        />
      )}

      {activeTab === 'collections' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <CollectionsManager />
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <PendingOrdersManager />
        </div>
      )}

      {activeTab === 'vouchers' && (
        <VoucherManager />
      )}

      {activeTab === 'teachers' && (
        <TeacherApprovalQueue
          pendingTeachers={pendingTeachers}
          actionLoading={handleTeacherAction.variables?.teacherId ?? null}
          onAction={(teacherId, status) => handleTeacherAction.mutate({ teacherId, status })}
        />
      )}

      {activeTab === 'payments' && (
        <OfflinePaymentQueue
          pendingSubscriptions={pendingSubscriptions}
          actionLoading={handleSubscriptionAction.variables?.subId ?? null}
          onAction={(subId, action) => handleSubscriptionAction.mutate({ subId, action })}
        />
      )}

      {activeTab === 'users' && (
        <UserDirectory
          users={users}
          totalUsers={totalUsers}
          userPage={userPage}
          roleFilter={roleFilter}
          searchQuery={searchQuery}
          actionLoading={
            handleToggleActive.variables?.userId ?? null
          }
          onPageChange={setUserPage}
          onRoleFilterChange={setRoleFilter}
          onSearchChange={setSearchQuery}
          onToggleActive={(userId, isActive) => handleToggleActive.mutate({ userId, isActive })}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
        />
      )}

      {activeTab === 'settings' && (
        <PlatformSettings />
      )}

      {activeTab === 'developers' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <DeveloperTabs />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <AuditLogsTable />
        </div>
      )}
    </div>
  );
}
