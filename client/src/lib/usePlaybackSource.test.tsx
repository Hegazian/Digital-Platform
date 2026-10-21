import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlaybackSource } from './usePlaybackSource';
import { fetchApi } from './api';

vi.mock('./api', () => ({ fetchApi: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
const tick = async () => { await act(async () => {}); };

describe('renewable playback', () => {
  it.each([true, false])('renews before expiry and preserves paused=%s, position and speed', async (paused) => {
    vi.useFakeTimers();
    const element = { currentTime: 41, paused, playbackRate: 1.5, play: vi.fn().mockResolvedValue(undefined) };
    const ref = { current: element as unknown as HTMLVideoElement };
    vi.mocked(fetchApi).mockImplementation(async () => ({ data: { playbackUrl: `/stream/${Date.now()}`, expiresAt: new Date(Date.now() + 120_000).toISOString() } }));
    const { result, unmount } = renderHook(() => usePlaybackSource(ref, 'video-1'));
    await tick();
    const first = result.current.url;
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(fetchApi).toHaveBeenCalledTimes(2);
    expect(result.current.url).not.toBe(first);
    element.currentTime = 0;
    element.playbackRate = 1;
    act(() => result.current.onLoadedMetadata({ currentTarget: element } as any));
    expect(element.currentTime).toBe(41);
    expect(element.playbackRate).toBe(1.5);
    expect(element.play).toHaveBeenCalledTimes(paused ? 0 : 1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops delivery when renewal is denied', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchApi).mockResolvedValueOnce({ data: { playbackUrl: '/stream/one', expiresAt: new Date(Date.now() + 120_000).toISOString() } }).mockRejectedValueOnce(new Error('Revoked'));
    const ref = { current: null };
    const { result } = renderHook(() => usePlaybackSource(ref, 'video-1'));
    await tick();
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(result.current.url).toBeNull();
    expect(result.current.error).toContain('renewed');
  });

  it('ignores a late response from a previously selected lesson', async () => {
    let finishOld: (data: any) => void = () => {};
    vi.mocked(fetchApi).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValue({ data: { playbackUrl: '/stream/new' } });
    const ref = { current: null };
    const { result, rerender } = renderHook(({ id }) => usePlaybackSource(ref, id), { initialProps: { id: 'old' } });
    rerender({ id: 'new' });
    await tick();
    await act(async () => { finishOld({ data: { playbackUrl: '/stream/old' } }); });
    expect(result.current.url).toBe('/stream/new');
  });

  it('supports inert lessons and legacy external videos', async () => {
    const ref = { current: null };
    const { result, rerender } = renderHook(({ legacy }) => usePlaybackSource(ref, undefined, legacy), { initialProps: { legacy: '' } });
    expect(result.current.url).toBeNull();
    rerender({ legacy: 'https://school.example/lesson.mp4' });
    await tick();
    expect(result.current.url).toContain('https://school.example');
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('retries a denied initial URL and renews after returning to a visible tab', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchApi).mockResolvedValueOnce({ data: {} }).mockImplementation(async () => ({ data: { playbackUrl: `/stream/${Date.now()}`, expiresAt: new Date(Date.now() + 120_000).toISOString() } }));
    const ref = { current: null };
    const { result } = renderHook(() => usePlaybackSource(ref, 'video-1'));
    await tick();
    expect(result.current.error).toBeTruthy();
    await act(async () => { result.current.retry(); });
    expect(result.current.url).toContain('/stream/');
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.error).toBeNull();
  });

  it('keeps renewal safe when browser autoplay restoration is refused', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchApi).mockImplementation(async () => ({ data: { playbackUrl: `/stream/${Date.now()}` } }));
    const element = { currentTime: 20, paused: false, playbackRate: 1, play: vi.fn().mockRejectedValue(new Error('Autoplay denied')) };
    const ref = { current: element as unknown as HTMLVideoElement };
    const { result } = renderHook(() => usePlaybackSource(ref, 'video-1'));
    await tick();
    act(() => result.current.onLoadedMetadata({ currentTarget: element } as any));
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    await act(async () => { result.current.onLoadedMetadata({ currentTarget: element } as any); });
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(result.current.url).toBeTruthy();
  });
});
