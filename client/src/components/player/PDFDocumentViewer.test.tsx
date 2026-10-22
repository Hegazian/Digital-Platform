import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PDFDocumentViewer from './PDFDocumentViewer';
import { fetchApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));
describe('protected PDF presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => `blob:document-${vi.mocked(fetchApi).mock.calls.length}`);
    URL.revokeObjectURL = vi.fn();
    vi.mocked(fetchApi).mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
  });

  it('authenticates the selected PDF and releases the blob on lesson change', async () => {
    const { rerender, unmount } = render(<PDFDocumentViewer materials={[{ id: 'm1', title: 'First PDF', fileType: 'application/pdf', fileUrl: '/api/v1/materials/m1/content' }]} />);
    await waitFor(() => expect(screen.getByTitle('First PDF')).toHaveAttribute('src', expect.stringContaining('blob:document-1')));
    expect(fetchApi).toHaveBeenCalledWith('/materials/m1/content', expect.objectContaining({ responseType: 'blob' }));
    rerender(<PDFDocumentViewer materials={[{ id: 'm2', title: 'Second PDF', fileType: 'application/pdf', fileUrl: '/api/v1/materials/m2/content' }]} />);
    expect(await screen.findByTitle('Second PDF')).toHaveAttribute('src', expect.stringContaining('blob:document-2'));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document-1');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document-2');
  });

  it('shows an error when the server denies document delivery', async () => {
    vi.mocked(fetchApi).mockRejectedValue(new Error('Forbidden'));
    render(<PDFDocumentViewer materials={[{ id: 'm1', title: 'PDF', fileType: 'pdf', fileUrl: '/api/v1/materials/m1/content' }]} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable|تعذر/);
    expect(screen.queryByTitle('PDF')).not.toBeInTheDocument();
  });
});
