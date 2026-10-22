"use client";

import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, BookOpen } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useAppStore } from '../../lib/store';

interface Collection {
  id: string;
  titleEn: string;
  titleAr: string;
  description: string;
  courses?: any[];
}

export default function CollectionCard() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const { lang } = useAppStore();

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetchApi('/collections');
        if (res.success && Array.isArray(res.data)) {
          setCollections(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch collections:', err);
      }
    }
    loadCollections();
  }, []);

  return (
    <div className="space-y-6 my-6">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-400" />
        <h3 className="text-xl font-bold text-white">Curated Learning Tracks & Bundles</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.length > 0 ? (
          collections.map((coll) => (
            <div key={coll.id} className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-indigo-500/50 transition-all group">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 w-fit text-indigo-400">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-white group-hover:text-indigo-400 transition-colors">
                  {lang === 'ar' ? coll.titleAr : coll.titleEn}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{coll.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {coll.courses?.length || 3} Courses Included
                </span>
                <button className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 text-xs font-bold hover:bg-indigo-600/40 inline-flex items-center gap-1">
                  Explore Track <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 glass-card rounded-3xl border border-slate-800 col-span-3">
            No curated learning tracks published yet.
          </div>
        )}
      </div>
    </div>
  );
}
