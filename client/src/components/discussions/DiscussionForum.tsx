"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Send, User, CornerDownRight } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface Reply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface Thread {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  replies?: Reply[];
}

interface DiscussionForumProps {
  courseId?: string;
  lessonId?: string;
}

export default function DiscussionForum({ courseId = 'demo-course-id' }: DiscussionForumProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyText, setReplyText] = useState<{ [threadId: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetchApi(`/discussions/courses/${courseId}`);
      if (res.success && Array.isArray(res.data)) {
        setThreads(res.data);
      }
    } catch (err) {
      console.warn('Failed to load discussion threads:', err);
    }
  }, [courseId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchApi('/discussions/threads', {
        method: 'POST',
        body: JSON.stringify({ courseId, title: newTitle, content: newContent }),
      });
      if (res.success) {
        setNewTitle('');
        setNewContent('');
        setShowCreateModal(false);
        await loadThreads();
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReply = async (threadId: string) => {
    const text = replyText[threadId];
    if (!text) return;
    try {
      const res = await fetchApi(`/discussions/threads/${threadId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      if (res.success) {
        setReplyText((prev) => ({ ...prev, [threadId]: '' }));
        await loadThreads();
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };

  return (
    <div className="space-y-6 my-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Community Discussions & Q&A</span>
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Plus size={16} /> New Question
        </button>
      </div>

      {/* Thread List */}
      <div className="space-y-4">
        {threads.length > 0 ? (
          threads.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <User size={14} className="text-indigo-400" />
                  <span>Author: {t.authorId.substring(0, 8)}</span>
                  <span>•</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="text-base font-bold text-white mb-1">{t.title}</h4>
                <p className="text-xs text-slate-300">{t.content}</p>
              </div>

              {/* Replies List */}
              {t.replies && t.replies.length > 0 && (
                <div className="pl-4 border-l-2 border-slate-800 space-y-2 mt-3">
                  {t.replies.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 flex gap-2 items-start">
                      <CornerDownRight size={14} className="text-slate-500 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-400 mr-2">{r.authorId.substring(0, 8)}:</span>
                        <span>{r.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyText[t.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [t.id]: e.target.value })}
                  className="glass-input flex-1 text-xs"
                />
                <button
                  onClick={() => handlePostReply(t.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Send size={14} /> Reply
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center glass-card rounded-2xl border border-slate-800 text-slate-400 text-xs">
            No questions asked yet for this course. Be the first to start a conversation!
          </div>
        )}
      </div>

      {/* New Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-indigo-500/30 space-y-4">
            <h3 className="text-lg font-bold text-white">Ask a Question</h3>
            <form onSubmit={handleCreateThread} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Question regarding Newton's Law"
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Details</label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe your question or difficulty..."
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold py-2"
                >
                  {loading ? 'Posting...' : 'Post Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
