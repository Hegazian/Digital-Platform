import React, { useState } from 'react';
import { Key, Webhook } from 'lucide-react';
import TokenList from './TokenList';
import WebhookList from './WebhookList';
import { useConfigStore } from '@/lib/configStore';
import { useAppStore } from '@/lib/store';

export default function DeveloperTabs() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'webhooks'>('tokens');
  const available = useConfigStore((state) => state.config?.capabilities?.developerIntegrations === true);
  const lang = useAppStore((state) => state.lang);

  if (!available) {
    return (
      <section role="status" className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 space-y-2">
        <h3 className="font-semibold text-white">
          {lang === 'ar' ? 'تكاملات المطورين غير متاحة حالياً' : 'Developer integrations are not available yet'}
        </h3>
        <p className="text-sm text-slate-400">
          {lang === 'ar'
            ? 'سيتم تفعيل رموز API وخطافات الويب بعد اكتمال التنفيذ واختبارات الأمان.'
            : 'API tokens and webhooks will be available after implementation and security testing are complete.'}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'tokens' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Key className="w-4 h-4" />
          API Tokens
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'webhooks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Webhook className="w-4 h-4" />
          Webhooks
        </button>
      </div>

      <div className="p-1">
        {activeTab === 'tokens' && <TokenList />}
        {activeTab === 'webhooks' && <WebhookList />}
      </div>
    </div>
  );
}
