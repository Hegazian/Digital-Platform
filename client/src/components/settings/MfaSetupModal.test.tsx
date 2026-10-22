import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MfaSetupModal from './MfaSetupModal';
import { fetchApi } from '@/lib/api';
vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

it('closing the enabled-factor view never starts factor replacement', () => {
  const close = vi.fn();
  render(<MfaSetupModal isOpen isAlreadyEnabled onClose={close} />);
  expect(screen.getByText('Two-factor authentication is enabled. Your current authenticator remains active.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
  expect(close).toHaveBeenCalled();
  expect(fetchApi).not.toHaveBeenCalled();
});
