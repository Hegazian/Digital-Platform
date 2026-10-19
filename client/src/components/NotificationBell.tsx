'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { fetchApi } from '../lib/api';

interface NotificationItem {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user, dir } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetchApi('/notifications/me');
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {
      // Background notifications failure should be silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Ignored
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) =>
        fetchApi(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(dir === 'rtl' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center"
      >
        <Bell className="w-4 h-4 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-80 sm:w-96 glass-panel bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col ${
            dir === 'rtl' ? 'left-0 sm:left-auto sm:right-auto' : 'right-0'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {dir === 'rtl' ? 'الإشعارات' : 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {unreadCount} {dir === 'rtl' ? 'جديد' : 'new'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{dir === 'rtl' ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  dir === 'rtl' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'
                )}
              </div>
            ) : (
              notifications.map((item) => {
                const title = dir === 'rtl' ? item.titleAr || item.titleEn : item.titleEn || item.titleAr;
                const message = dir === 'rtl' ? item.messageAr || item.messageEn : item.messageEn || item.messageAr;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.isRead) {
                        markAsRead(item.id);
                      }
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      item.isRead
                        ? 'bg-transparent hover:bg-slate-800/40 text-slate-400'
                        : 'bg-indigo-950/20 hover:bg-indigo-900/30 text-slate-200'
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {!item.isRead ? (
                        <span className="block w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            item.isRead ? 'text-slate-300' : 'text-white font-bold'
                          }`}
                        >
                          {title}
                        </h4>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {message}
                      </p>
                    </div>
                    {!item.isRead && (
                      <button
                        onClick={(e) => markAsRead(item.id, e)}
                        title={dir === 'rtl' ? 'تحديد كمقروء' : 'Mark as read'}
                        className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
