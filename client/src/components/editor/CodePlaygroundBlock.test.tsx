import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CodePlaygroundBlock from './CodePlaygroundBlock';
import { useAppStore } from '@/lib/store';
import { fetchApi } from '@/lib/api';
vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));
vi.mock('@uiw/react-codemirror', () => ({ default: () => null }));
describe('uploaded code in a staged runner', () => {
  it.each(['en', 'ar'] as const)('keeps the exact supplied code readable in %s without exposing execution', (lang) => {
    useAppStore.setState({ lang });
    const code = 'print("<script>sample only</script>")';
    render(<CodePlaygroundBlock initialCode={code} />);
    expect(screen.getByText(code)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(lang === 'ar' ? 'غير متاح' : 'not available yet');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(fetchApi).not.toHaveBeenCalled();
  });
});
