import React, { useState } from 'react';
import { Key, Webhook } from 'lucide-react';
import TokenList from './TokenList';
import WebhookList from './WebhookList';

export default function DeveloperTabs() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'webhooks'>('tokens');

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
