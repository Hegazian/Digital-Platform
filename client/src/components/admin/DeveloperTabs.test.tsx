import React, { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeveloperTabs from './DeveloperTabs';
import { useConfigStore, type AppConfig } from '@/lib/configStore';
import { useAppStore } from '@/lib/store';
import { fetchApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));
describe('staged developer controls', () => {
  beforeEach(() => {
    vi.mocked(fetchApi).mockReset();
    useAppStore.setState({ lang: 'en' });
    useConfigStore.setState({ config: null });
  });
  it.each(['en', 'ar'] as const)('does not mount token/webhook requests or controls in %s, including Strict Mode', (lang) => {
    useAppStore.setState({ lang });
    useConfigStore.setState({ config: { capabilities: { developerIntegrations: false } } as AppConfig });
    render(<StrictMode><DeveloperTabs /></StrictMode>);
    expect(screen.getByRole('status')).toHaveTextContent(lang === 'ar' ? 'غير متاحة' : 'not available yet');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(fetchApi).not.toHaveBeenCalled();
  });
  it('fails closed while config is loading or an old response lacks capabilities', () => {
    const { rerender } = render(<DeveloperTabs />);
    expect(screen.getByRole('status')).toBeVisible();
    useConfigStore.setState({ config: {} as AppConfig });
    rerender(<DeveloperTabs />);
    expect(screen.getByRole('status')).toBeVisible();
    expect(fetchApi).not.toHaveBeenCalled();
  });
});
