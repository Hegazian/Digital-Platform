'use client';

import { useCallback, useEffect, useRef, useState, type RefObject, type SyntheticEvent } from 'react';
import { fetchApi } from './api';

/** Renew the short delivery credential without restarting or unpausing a lesson. */
export function usePlaybackSource(video: RefObject<HTMLVideoElement | null>, videoId?: string, legacyUrl?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const restore = useRef<{ time: number; paused: boolean; rate: number } | null>(null);
  const renew = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let pending = false;
    let refreshAt = 0;
    restore.current = null;
    setUrl(null);
    setError(null);
    if (!videoId) {
      if (legacyUrl && /^https?:\/\//i.test(legacyUrl)) setUrl(legacyUrl);
      return;
    }
    const load = async (preserve: boolean) => {
      if (pending || cancelled) return;
      pending = true;
      clearTimeout(timer);
      try {
        const response = await fetchApi(`/videos/${videoId}/playback-url`);
        if (cancelled) return;
        if (!response.data?.playbackUrl) throw new Error('Playback URL unavailable');
        const element = video.current;
        restore.current = preserve && element ? { time: element.currentTime, paused: element.paused, rate: element.playbackRate } : null;
        setUrl(response.data.playbackUrl);
        setError(null);
        const expiresAt = Date.parse(response.data.expiresAt) || Date.now() + 120_000;
        refreshAt = expiresAt - 30_000;
        timer = setTimeout(() => { void load(true); }, Math.max(5_000, refreshAt - Date.now()));
      } catch {
        if (!cancelled) {
          setUrl(null);
          setError('Playback access could not be renewed. Select the lesson again to retry.');
        }
      } finally {
        pending = false;
      }
    };
    renew.current = () => { void load(true); };
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() >= refreshAt) void load(true); };
    document.addEventListener('visibilitychange', onVisible);
    void load(false);
    return () => { cancelled = true; clearTimeout(timer); renew.current = null; document.removeEventListener('visibilitychange', onVisible); };
  }, [videoId, legacyUrl, video]);

  const onLoadedMetadata = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const state = restore.current;
    const element = event.currentTarget;
    if (!state || !element) return;
    restore.current = null;
    element.currentTime = state.time;
    element.playbackRate = state.rate;
    if (!state.paused) void element.play().catch(() => {});
  }, []);
  return { url, error, onLoadedMetadata, retry: () => renew.current?.() };
}
