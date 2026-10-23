import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoursePricingManager from './CoursePricingManager';
import { fetchApi } from '@/lib/api';
import { useAppStore } from '@/lib/store';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

const subjects = [
  { id: 'science', nameEn: 'Science', nameAr: 'علوم', pricing: [] },
  { id: 'math', nameEn: 'Mathematics', nameAr: 'رياضيات', pricing: [] },
];

function cardFor(subjectName: string) {
  const heading = screen.getByRole('heading', { name: subjectName });
  const card = heading.closest('.glass-panel');
  if (!card) throw new Error(`Missing pricing card for ${subjectName}`);
  return within(card as HTMLElement);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('CoursePricingManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setLang('en');
    vi.mocked(fetchApi).mockResolvedValue({ data: subjects } as never);
  });

  it('keeps other subject drafts and newer edits while reconciling the saved subject', async () => {
    render(<CoursePricingManager />);
    await screen.findByRole('heading', { name: 'Science' });

    const science = cardFor('Science');
    const math = cardFor('Mathematics');
    const scienceMonth = science.getByRole('spinbutton', { name: '1 Month Access EGP price for Science' });
    const mathMonth = math.getByRole('spinbutton', { name: '1 Month Access EGP price for Mathematics' });
    fireEvent.change(scienceMonth, { target: { value: '250' } });

    const pendingSave = deferred<{ data: Array<{ period: string; priceEgp: number; priceUsd: number; isActive: boolean }> }>();
    vi.mocked(fetchApi).mockReturnValueOnce(pendingSave.promise as never);
    fireEvent.click(science.getByRole('button', { name: 'Save Pricing' }));

    fireEvent.change(mathMonth, { target: { value: '375' } });
    fireEvent.change(scienceMonth, { target: { value: '275' } });

    await act(async () => {
      pendingSave.resolve({ data: [
        { period: 'MONTHLY', priceEgp: 250, priceUsd: 5, isActive: true },
        { period: 'SIX_MONTHS', priceEgp: 1000, priceUsd: 20, isActive: true },
        { period: 'YEARLY', priceEgp: 1800, priceUsd: 36, isActive: true },
      ] });
      await pendingSave.promise;
    });

    await waitFor(() => expect(screen.getByText('Pricing for "Science" updated successfully!')).toBeInTheDocument());
    expect(science.getByRole('spinbutton', { name: '1 Month Access EGP price for Science' })).toHaveValue(275);
    expect(math.getByRole('spinbutton', { name: '1 Month Access EGP price for Mathematics' })).toHaveValue(375);
    expect(science.getByText('≈ $20.00 USD')).toBeInTheDocument();
    expect(fetchApi).toHaveBeenLastCalledWith('/subjects/science/pricing', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ pricing: [
        { period: 'MONTHLY', priceEgp: 250, isActive: true },
        { period: 'SIX_MONTHS', priceEgp: 1000, isActive: true },
        { period: 'YEARLY', priceEgp: 1800, isActive: true },
      ] }),
    }));
  });

  it('retains every subject draft when a save fails', async () => {
    render(<CoursePricingManager />);
    await screen.findByRole('heading', { name: 'Science' });

    const science = cardFor('Science');
    const math = cardFor('Mathematics');
    const scienceMonth = science.getByRole('spinbutton', { name: '1 Month Access EGP price for Science' });
    const mathMonth = math.getByRole('spinbutton', { name: '1 Month Access EGP price for Mathematics' });
    fireEvent.change(scienceMonth, { target: { value: '250' } });
    fireEvent.change(mathMonth, { target: { value: '375' } });
    vi.mocked(fetchApi).mockRejectedValueOnce(new Error('Server unavailable'));

    fireEvent.click(science.getByRole('button', { name: 'Save Pricing' }));

    await screen.findByText('Server unavailable');
    expect(scienceMonth).toHaveValue(250);
    expect(mathMonth).toHaveValue(375);
  });

  it('presents pricing controls in Arabic with right-to-left document direction', async () => {
    useAppStore.getState().setLang('ar');
    render(<CoursePricingManager />);
    await screen.findByRole('heading', { name: 'إدارة أسعار المناهج والدورات' });

    const science = cardFor('Science');
    expect(science.getByRole('spinbutton', { name: 'اشتراك شهر واحد بالجنيه المصري لمادة علوم' })).toBeInTheDocument();
    expect(science.getByRole('button', { name: 'حفظ الأسعار' })).toBeInTheDocument();
    expect(science.getAllByText('مدة الاشتراك')).toHaveLength(3);
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('saves the same EGP pricing contract from the Arabic interface', async () => {
    useAppStore.getState().setLang('ar');
    vi.mocked(fetchApi)
      .mockResolvedValueOnce({ data: subjects } as never)
      .mockResolvedValueOnce({ data: [
        { period: 'MONTHLY', priceEgp: 275, priceUsd: 5.5, isActive: true },
        { period: 'SIX_MONTHS', priceEgp: 1000, priceUsd: 20, isActive: true },
        { period: 'YEARLY', priceEgp: 1800, priceUsd: 36, isActive: true },
      ] } as never);

    render(<CoursePricingManager />);
    await screen.findByRole('heading', { name: 'إدارة أسعار المناهج والدورات' });
    const science = cardFor('Science');
    fireEvent.change(science.getByRole('spinbutton', { name: 'اشتراك شهر واحد بالجنيه المصري لمادة علوم' }), { target: { value: '275' } });
    fireEvent.click(science.getByRole('button', { name: 'حفظ الأسعار' }));

    await screen.findByText('تم تحديث أسعار "علوم" بنجاح');
    expect(fetchApi).toHaveBeenLastCalledWith('/subjects/science/pricing', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ pricing: [
        { period: 'MONTHLY', priceEgp: 275, isActive: true },
        { period: 'SIX_MONTHS', priceEgp: 1000, isActive: true },
        { period: 'YEARLY', priceEgp: 1800, isActive: true },
      ] }),
    }));
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});
