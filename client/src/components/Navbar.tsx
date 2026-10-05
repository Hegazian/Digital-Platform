'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../lib/store';
import { useSiteName, useHomeContent } from '../lib/configStore';
import { fetchApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  User as UserIcon,
  LogOut,
  Sparkles,
  BookOpen,
  GraduationCap,
  Briefcase,
  Shield,
  ShieldCheck
} from 'lucide-react';
import AuthModal from './AuthModal';
import MfaSetupModal from './settings/MfaSetupModal';
import { LogoMark } from './brand/Logo';

export default function Navbar() {
  const { lang, setLang, user, setUser, t } = useAppStore();
  const siteName = useSiteName();
  const homeContent = useHomeContent();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ar' : 'en');
  };

  const navItems: { href: string; label: string; icon: any }[] = [
    { href: '/', label: t('navHome'), icon: BookOpen },
  ];

  // Only show the public courses tab to students and guests
  if (!user || user.role === 'STUDENT') {
    navItems.push({ href: '/courses', label: t('navCourses'), icon: GraduationCap });
  }

  if (user?.role === 'STUDENT') {
    navItems.push({ href: '/student/dashboard', label: t('navStudentDash'), icon: GraduationCap });
  } else if (user?.role === 'TEACHER') {
    navItems.push({ href: '/teacher/dashboard', label: t('navTeacherDash'), icon: Briefcase });
  } else if (user?.role === 'ADMIN') {
    navItems.push({
      href: '/admin/dashboard',
      label: lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel',
      icon: Shield,
    });
  }

  const isNavItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.includes('#')) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group text-left focus:outline-none"
          >
            <span className="group-hover:scale-105 transition-transform duration-300 drop-shadow-lg drop-shadow-indigo-500/25">
              <LogoMark size={42} />
            </span>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                {siteName}
              </span>
              <span className="block text-xs text-slate-400 font-medium">
                {lang === 'ar' ? homeContent.navbar.subtitleAr : homeContent.navbar.subtitleEn}
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              id="lang-toggle-btn"
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition-all"
              title="Toggle Language"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Auth / User */}
            {user ? (
              <div className="flex items-center gap-3">
                <div
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all"
                  title="Edit profile"
                >
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                  <div className="text-xs">
                    <span className="block font-bold text-slate-200">{user.name}</span>
                    <span className="block text-[10px] text-indigo-400 font-semibold">{user.role}</span>
                  </div>
                </div>
                {!user.mfaEnabled && (
                  <button
                    onClick={() => setShowMfaModal(true)}
                    className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-2"
                    title="Enable 2FA"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-semibold">Enable 2FA</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    // Revoke the server session (httpOnly refresh cookie),
                    // then clear local state AND cached server data so a
                    // different user on this device can never see the
                    // previous user's orders/attempts/notifications.
                    try {
                      await fetchApi('/auth/logout', { method: 'POST' });
                    } catch {
                      // Local logout proceeds regardless
                    }
                    localStorage.removeItem('accessToken');
                    setUser(null, null);
                    queryClient.clear();
                    router.push('/');
                  }}
                  className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowAuthModal(true)}
                className="glass-button px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showMfaModal && (
        <MfaSetupModal
          onClose={() => setShowMfaModal(false)}
          onEnabled={() => {
            if (user) {
              setUser({ ...user, mfaEnabled: true }, useAppStore.getState().token);
            }
          }}
        />
      )}
    </>
  );
}
