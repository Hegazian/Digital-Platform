import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlatformSettings from './PlatformSettings';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

const initialConfig = {
  version: 1,
  siteNameEn: 'EduPlatform',
  siteNameAr: 'إديوبلاتفورم',
  siteDescriptionEn: 'Egyptian educational platform',
  siteDescriptionAr: 'منصة تعليمية مصرية',
  sloganEn: '',
  sloganAr: '',
  hostDomain: 'localhost:3000',
  supportEmail: 'support@example.test',
  currency: 'EGP',
  exchangeRateUsdToEgp: 48,
  requireCourseApproval: true,
  allowTeacherRegistration: true,
  enableCodePlaygrounds: false,
  enableCollaborativeBoards: false,
  primaryColor: '#4f46e5',
};

describe('PlatformSettings exchange-rate workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setLang('en');
    vi.mocked(fetchApi).mockImplementation(async (_endpoint, options) => {
      if (options?.method === 'PUT') return { success: true, data: { version: 2 } } as never;
      return { success: true, data: initialConfig } as never;
    });
  });

  it.each([
    {
      locale: 'en' as const,
      rateLabel: 'Indicative display rate — 1 USD = ? EGP',
      saveLabel: 'Save Platform Settings',
      confirmation: 'Platform configuration and home page content saved successfully!',
      direction: 'ltr',
    },
    {
      locale: 'ar' as const,
      rateLabel: 'سعر الصرف الإرشادي — ١ دولار أمريكي = ؟ جنيه مصري',
      saveLabel: 'حفظ إعدادات المنصة',
      confirmation: 'تم حفظ إعدادات المنصة ومحتوى الصفحة الرئيسية بنجاح.',
      direction: 'rtl',
    },
  ])('saves the versioned EGP configuration in $locale', async ({ locale, rateLabel, saveLabel, confirmation, direction }) => {
    useAppStore.getState().setLang(locale);
    render(<PlatformSettings />);

    const rate = await screen.findByRole('spinbutton', { name: rateLabel });
    fireEvent.change(rate, { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));

    await screen.findByText(confirmation);
    const saveCall = vi.mocked(fetchApi).mock.calls.find(([endpoint, options]) => endpoint === '/config' && options?.method === 'PUT');
    expect(saveCall).toBeDefined();
    const payload = JSON.parse(String(saveCall?.[1]?.body));
    expect(payload).toEqual(expect.objectContaining({
      expectedVersion: 1,
      currency: 'EGP',
      exchangeRateUsdToEgp: 60,
    }));
    expect(payload).not.toHaveProperty('priceUsd');
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', direction));
  });

  it('localizes a stale configuration conflict in Arabic', async () => {
    useAppStore.getState().setLang('ar');
    vi.mocked(fetchApi).mockImplementation(async (_endpoint, options) => {
      if (options?.method === 'PUT') {
        throw Object.assign(new Error('Configuration changed since it was loaded. Reload and try again.'), {
          code: 'CONFIG_VERSION_CONFLICT',
        });
      }
      return { success: true, data: initialConfig } as never;
    });

    render(<PlatformSettings />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: 'سعر الصرف الإرشادي — ١ دولار أمريكي = ؟ جنيه مصري' }), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ إعدادات المنصة' }));

    expect(await screen.findByText('تم تغيير الإعدادات في جلسة أخرى. أعد تحميل الإعدادات ثم حاول مرة أخرى.')).toBeVisible();
  });
});
