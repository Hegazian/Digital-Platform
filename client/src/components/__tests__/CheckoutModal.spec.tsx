import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutModal from '../commerce/CheckoutModal';
import { useAppStore } from '../../lib/store';
import * as apiModule from '../../lib/api';

describe('CheckoutModal Component', () => {
  const mockCourse = {
    id: 'course-123',
    titleEn: 'Calculus 1st Secondary',
    titleAr: 'تفاضل وتكامل الصف الأول الثانوي',
    priceEgp: 250,
    priceUsd: 15,
  };

  const onCloseMock = vi.fn();
  const onAccessGrantedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    useAppStore.getState().setLang('en');
  });

  it.each([
    { locale: 'en' as const, title: 'Calculus 1st Secondary', total: 'Total', direction: 'ltr' },
    { locale: 'ar' as const, title: 'تفاضل وتكامل الصف الأول الثانوي', total: 'الإجمالي', direction: 'rtl' },
  ])('shows the same EGP charge in $locale', ({ locale, title, total, direction }) => {
    useAppStore.getState().setLang(locale);
    render(
      <CheckoutModal
        course={mockCourse}
        onClose={onCloseMock}
        onAccessGranted={onAccessGrantedMock}
      />
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(total)).toBeInTheDocument();
    expect(screen.getByText('250 EGP')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', direction);
    expect(screen.getByRole('button', { name: /vodafone cash/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /instapay/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voucher code/i })).toBeInTheDocument();
  });

  it('redeems voucher directly and grants access on success', async () => {
    const fetchApiSpy = vi.spyOn(apiModule, 'fetchApi').mockImplementation(async (endpoint) => ({
      success: true, data: endpoint.includes('check-course') ? { hasAccess: true } : { entitlementId: 'ent-123' },
    }));

    render(
      <CheckoutModal
        course={mockCourse}
        onClose={onCloseMock}
        onAccessGranted={onAccessGrantedMock}
      />
    );

    // Switch to Voucher Code
    fireEvent.click(screen.getByRole('button', { name: /voucher code/i }));

    const input = screen.getByPlaceholderText(/SCHOLAR2026/i);
    fireEvent.change(input, { target: { value: 'TEST-VOUCHER-100' } });

    const redeemBtn = screen.getByRole('button', { name: /activate with voucher/i });
    fireEvent.click(redeemBtn);

    await waitFor(() => {
      expect(fetchApiSpy).toHaveBeenCalledWith('/commerce/vouchers/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: 'TEST-VOUCHER-100', expectedCourseId: mockCourse.id }),
      });
      expect(onAccessGrantedMock).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('keeps checkout open when a voucher does not apply to the course', async () => {
    vi.spyOn(apiModule, 'fetchApi').mockRejectedValue(new Error('This voucher does not apply to the selected course'));
    render(<CheckoutModal course={mockCourse} onClose={onCloseMock} onAccessGranted={onAccessGrantedMock} />);
    fireEvent.click(screen.getByRole('button', { name: /voucher code/i }));
    fireEvent.change(screen.getByPlaceholderText(/SCHOLAR2026/i), { target: { value: 'OTHER-COURSE' } });
    fireEvent.click(screen.getByRole('button', { name: /activate with voucher/i }));
    expect(await screen.findByText('This voucher does not apply to the selected course')).toBeVisible();
    expect(onAccessGrantedMock).not.toHaveBeenCalled();
  });

  it('submits manual order with transaction reference and transitions to pending phase', async () => {
    const fetchApiSpy = vi.spyOn(apiModule, 'fetchApi').mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith('/commerce/products')) {
        return {
          success: true,
          data: [
            {
              id: 'prod-456',
              productType: 'COURSE',
              resourceId: 'course-123',
              priceEgp: 250,
            },
          ],
        };
      }
      if (endpoint === '/commerce/orders') {
        return {
          success: true,
          data: { id: 'order-789', status: 'PENDING' },
        };
      }
      if (endpoint === '/commerce/orders/me') {
        return { success: true, data: [] };
      }
      return { success: true };
    });

    render(
      <CheckoutModal
        course={mockCourse}
        onClose={onCloseMock}
        onAccessGranted={onAccessGrantedMock}
      />
    );

    const refInput = screen.getByPlaceholderText(/transaction number/i);
    fireEvent.change(refInput, { target: { value: 'WALLET-TRANSFER-REF-99' } });

    const submitBtn = screen.getByRole('button', { name: /submit payment proof/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchApiSpy).toHaveBeenCalledWith('/commerce/orders', expect.objectContaining({
        method: 'POST',
      }));
      expect(screen.getByText(/payment submitted for review/i)).toBeInTheDocument();
    });
  });
});
