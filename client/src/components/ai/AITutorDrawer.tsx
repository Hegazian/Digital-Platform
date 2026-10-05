"use client";

import React, { useState } from 'react';
import { Bot, Send, Sparkles, X, User } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function AITutorDrawer({ courseContext }: { courseContext?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'مرحباً! أنا معلم الذكاء الاصطناعي الخاص بك. كيف يمكنني مساعدتك اليوم في هذا الدرس؟ (Hi! I am your AI Tutor. How can I help you with this lesson?)' },
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetchApi('/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({ prompt: userMsg, courseContext }),
      });

      if (res.success && res.data?.answer) {
        setMessages((prev) => [...prev, { sender: 'ai', text: res.data.answer }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, I could not generate an answer right now.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Error connecting to AI Tutor service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 font-bold text-xs"
      >
        <Sparkles size={18} className="animate-spin" />
        <span>Ask AI Tutor</span>
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>EduPlatform AI Tutor</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">Gemini</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Contextual Learning Assistant</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1">
                      <Bot size={12} />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-1">
                      <User size={12} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-purple-400 p-2">
                  <Sparkles size={14} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask any physics, math, or coding question..."
                className="glass-input flex-1 text-xs"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
