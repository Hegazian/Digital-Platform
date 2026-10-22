"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Headphones, Radio, Volume2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface Episode {
  id: string;
  titleEn: string;
  titleAr: string;
  audioUrl: string;
  durationSec: number;
}

interface Podcast {
  id: string;
  titleEn: string;
  titleAr: string;
  description: string;
  episodes: Episode[];
}

export default function PodcastPlayer() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadPodcasts() {
      try {
        const res = await fetchApi('/podcasts');
        if (res.success && Array.isArray(res.data)) {
          setPodcasts(res.data);
          if (res.data.length > 0 && res.data[0].episodes?.length > 0) {
            setCurrentEpisode(res.data[0].episodes[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch podcasts:', err);
      }
    }
    loadPodcasts();
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !currentEpisode) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const playEpisode = (ep: Episode) => {
    setCurrentEpisode(ep);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = ep.audioUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="space-y-6 my-6">
      <div className="flex items-center gap-2">
        <Headphones className="w-5 h-5 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Audio Podcasts & Learning Series</h3>
      </div>

      {currentEpisode && (
        <audio
          ref={audioRef}
          src={currentEpisode.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Active Audio Bar */}
      {currentEpisode && (
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{currentEpisode.titleEn}</h4>
              <p className="text-xs text-slate-400">{currentEpisode.titleAr}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-transform active:scale-95 shadow-lg"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <Volume2 size={18} className="text-slate-400 hidden sm:block" />
          </div>
        </div>
      )}

      {/* Podcast Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {podcasts.length > 0 ? (
          podcasts.map((pod) => (
            <div key={pod.id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-base font-bold text-white">{pod.titleEn}</h4>
              <p className="text-xs text-slate-400">{pod.description}</p>
              
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Episodes</span>
                {pod.episodes && pod.episodes.length > 0 ? (
                  pod.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => playEpisode(ep)}
                      className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                        currentEpisode?.id === ep.id
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-semibold">{ep.titleEn}</span>
                      <Play size={12} className="text-purple-400" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No episodes added yet.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 glass-card rounded-2xl border border-slate-800 col-span-2">
            No audio podcasts published yet.
          </div>
        )}
      </div>
    </div>
  );
}
