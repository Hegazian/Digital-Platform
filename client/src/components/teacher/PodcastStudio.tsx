'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import {
  Mic,
  Plus,
  Trash2,
  Loader2,
  ListMusic,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Episode {
  id: string;
  titleEn: string;
  titleAr: string;
  audioUrl: string;
  durationSec: number;
}

interface PodcastShow {
  id: string;
  titleEn: string;
  titleAr: string;
  description?: string | null;
  coverImage?: string | null;
  episodes: Episode[];
}

const emptyShow = { titleEn: '', titleAr: '', description: '' };
const emptyEpisode = { titleEn: '', titleAr: '', audioUrl: '', durationSec: 0 };

/**
 * Teacher podcast studio: create shows, append episodes (ordered
 * server-side), delete episodes. Student player consumes the public list.
 */
export default function PodcastStudio() {
  const queryClient = useQueryClient();
  const [newShow, setNewShow] = useState({ ...emptyShow });
  const [selectedId, setSelectedId] = useState('');
  const [episodeDraft, setEpisodeDraft] = useState({ ...emptyEpisode });
  const [feedback, setFeedback] = useState('');

  const mineQuery = useQuery({
    queryKey: ['podcasts', 'mine'],
    queryFn: () => fetchApi('/podcasts/mine'),
  });
  const myShows: PodcastShow[] = mineQuery.data?.data ?? [];
  const selected = myShows.find((p) => p.id === selectedId) ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['podcasts'] });
  };

  const createShow = useMutation({
    mutationFn: () =>
      fetchApi('/podcasts', { method: 'POST', body: JSON.stringify(newShow) }),
    onSuccess: (res) => {
      setNewShow({ ...emptyShow });
      setSelectedId(res.data.id);
      setFeedback('Show created');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const addEpisode = useMutation({
    mutationFn: () =>
      fetchApi(`/podcasts/${selectedId}/episodes`, {
        method: 'POST',
        body: JSON.stringify(episodeDraft),
      }),
    onSuccess: () => {
      setEpisodeDraft({ ...emptyEpisode });
      setFeedback('Episode added');
      invalidate();
    },
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const deleteEpisode = useMutation({
    mutationFn: (episodeId: string) =>
      fetchApi(`/podcasts/${selectedId}/episodes/${episodeId}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => setFeedback(errorMessage(e)),
  });

  const fmtDuration = (sec: number) => `${Math.round(sec / 60)} min`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── Shows ── */}
      <div className="space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-400" /> Create a Show
          </h3>
          <input
            value={newShow.titleEn}
            onChange={(e) => setNewShow({ ...newShow, titleEn: e.target.value })}
            placeholder="Show title (English)"
            className="glass-input w-full text-xs"
          />
          <input
            value={newShow.titleAr}
            onChange={(e) => setNewShow({ ...newShow, titleAr: e.target.value })}
            placeholder="عنوان العرض"
            dir="rtl"
            className="glass-input w-full text-xs"
          />
          <textarea
            rows={2}
            value={newShow.description}
            onChange={(e) => setNewShow({ ...newShow, description: e.target.value })}
            placeholder="Description (optional)"
            className="glass-input w-full text-xs"
          />
          <button
            onClick={() => newShow.titleEn.trim() && createShow.mutate()}
            disabled={createShow.isPending || !newShow.titleEn.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {createShow.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Create Show
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <h4 className="text-xs font-bold text-slate-300">My Shows ({myShows.length})</h4>
          {mineQuery.isLoading ? (
            <div className="flex justify-center py-3 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : myShows.length === 0 ? (
            <p className="text-[11px] text-slate-500">No shows yet — create your first above.</p>
          ) : (
            myShows.map((show) => (
              <button
                key={show.id}
                onClick={() => setSelectedId(show.id)}
                aria-pressed={selectedId === show.id}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition ${
                  selectedId === show.id
                    ? 'border-indigo-500 bg-indigo-600/15 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="font-bold block truncate">{show.titleEn}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ListMusic className="w-3 h-3" />
                  {show.episodes.length} episodes
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Episodes ── */}
      <div className="space-y-4">
        {selected ? (
          <>
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-emerald-400" />
                Episodes — “{selected.titleEn}”
              </h3>

              <input
                value={episodeDraft.titleEn}
                onChange={(e) => setEpisodeDraft({ ...episodeDraft, titleEn: e.target.value })}
                placeholder="Episode title (English)"
                className="glass-input w-full text-xs"
              />
              <input
                value={episodeDraft.titleAr}
                onChange={(e) => setEpisodeDraft({ ...episodeDraft, titleAr: e.target.value })}
                placeholder="عنوان الحلقة"
                dir="rtl"
                className="glass-input w-full text-xs"
              />
              <input
                value={episodeDraft.audioUrl}
                onChange={(e) => setEpisodeDraft({ ...episodeDraft, audioUrl: e.target.value })}
                placeholder="Audio URL or /uploads/… path"
                className="glass-input w-full text-xs font-mono"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={episodeDraft.durationSec}
                  onChange={(e) =>
                    setEpisodeDraft({ ...episodeDraft, durationSec: Number(e.target.value) || 0 })
                  }
                  placeholder="Duration (seconds)"
                  aria-label="Duration in seconds"
                  className="glass-input w-40 text-xs"
                />
                <button
                  onClick={() =>
                    episodeDraft.titleEn.trim() &&
                    episodeDraft.audioUrl.trim() &&
                    addEpisode.mutate()
                  }
                  disabled={
                    addEpisode.isPending ||
                    !episodeDraft.titleEn.trim() ||
                    !episodeDraft.audioUrl.trim()
                  }
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {addEpisode.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add Episode
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {selected.episodes.map((ep, i) => (
                <div
                  key={ep.id}
                  className="flex items-center justify-between gap-3 glass-panel px-3 py-2.5 rounded-xl border border-slate-800"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{ep.titleEn}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDuration(ep.durationSec)}
                        <span className="truncate ml-1">{ep.audioUrl}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEpisode.mutate(ep.id)}
                    aria-label={`Delete ${ep.titleEn}`}
                    className="shrink-0 p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {selected.episodes.length === 0 && (
                <p className="text-[11px] text-slate-500 px-1">No episodes yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-2 h-fit">
            <Mic className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-white">Select or create a show</p>
            <p className="text-xs text-slate-500">
              Episodes you add appear instantly in the student player.
            </p>
          </div>
        )}

        {feedback && (
          <p role="status" className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
