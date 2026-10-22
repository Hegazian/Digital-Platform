import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationBell from '../NotificationBell';
import { useAppStore } from '../../lib/store';
import * as apiModule from '../../lib/api';

describe('NotificationBell Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.setState({
      user: null,
      token: null,
      dir: 'ltr',
    });
  });

  it('renders nothing when user is not authenticated', () => {
    const { container } = render(<NotificationBell />);
    expect(container.firstChild).toBeNull();
  });

  it('renders bell with unread badge and displays notifications on click', async () => {
    useAppStore.setState({
      user: { id: 'u1', name: 'Student', email: 's@test.com', role: 'STUDENT' },
      token: 'valid-token',
    });

    const mockNotifications = [
      {
        id: 'n1',
        titleEn: 'Course Updated',
        titleAr: 'تحديث الدورة',
        messageEn: 'New lesson available',
        messageAr: 'درس جديد متاح',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        titleEn: 'Exam Reminder',
        titleAr: 'تذكير بالامتحان',
        messageEn: 'Exam starts at 10 AM',
        messageAr: 'يبدأ الامتحان في 10 صباحا',
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const fetchApiSpy = vi.spyOn(apiModule, 'fetchApi').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/notifications/me') {
        return { success: true, data: mockNotifications };
      }
      return { success: true };
    });

    render(<NotificationBell />);

    // Bell button should exist with badge showing "1"
    const bellBtn = await screen.findByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(bellBtn);

    // Dropdown items should be displayed
    expect(await screen.findByText('Course Updated')).toBeInTheDocument();
    expect(screen.getByText('Exam Reminder')).toBeInTheDocument();
    expect(screen.getByText('New lesson available')).toBeInTheDocument();

    // Click on unread notification to mark as read
    fireEvent.click(screen.getByText('Course Updated'));
    await waitFor(() => {
      expect(fetchApiSpy).toHaveBeenCalledWith('/notifications/n1/read', { method: 'PATCH' });
    });
  });

  it('marks all notifications as read when clicking mark all read button', async () => {
    useAppStore.setState({
      user: { id: 'u1', name: 'Student', email: 's@test.com', role: 'STUDENT' },
      token: 'valid-token',
    });

    const mockNotifications = [
      {
        id: 'n1',
        titleEn: 'Notice 1',
        titleAr: 'إشعار 1',
        messageEn: 'Msg 1',
        messageAr: 'رسالة 1',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const fetchApiSpy = vi.spyOn(apiModule, 'fetchApi').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/notifications/me') {
        return { success: true, data: mockNotifications };
      }
      return { success: true };
    });

    render(<NotificationBell />);

    const bellBtn = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    const markAllBtn = await screen.findByText(/mark all read/i);
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(fetchApiSpy).toHaveBeenCalledWith('/notifications/n1/read', { method: 'PATCH' });
    });
  });
});
