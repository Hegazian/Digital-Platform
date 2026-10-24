import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MfaSetupModal from './MfaSetupModal';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';
vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

it('closing the enabled-factor view never starts factor replacement', () => {
  const close = vi.fn();
  render(<MfaSetupModal isOpen isAlreadyEnabled onClose={close} />);
  expect(screen.getByText(/2FA is currently active on your account/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Proceed to new QR code' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
  expect(close).toHaveBeenCalled();
  expect(fetchApi).not.toHaveBeenCalled();
});

it('renders the re-enrollment flow in Arabic', () => {
  const previous = useAppStore.getState().lang;
  useAppStore.setState({ lang: 'ar', dir: 'rtl' });
  render(<MfaSetupModal isOpen isAlreadyEnabled onClose={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'إعادة إعداد المصادقة الثنائية' })).toBeVisible();
  expect(screen.getByLabelText('كلمة المرور الحالية')).toBeVisible();
  useAppStore.setState({ lang: previous, dir: previous === 'ar' ? 'rtl' : 'ltr' });
});
