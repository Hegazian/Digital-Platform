import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { Key, Plus, Trash, Copy, CheckCircle2 } from 'lucide-react';

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function TokenList() {
  const { token } = useAppStore();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Token State
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetchApi('/developer/tokens', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setTokens(res.data);
    } catch (error) {
      console.error('Failed to fetch tokens', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/developer/tokens', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newTokenName })
      });
      if (res.success) {
        setCreatedToken(res.data.token); // The full raw token
        setNewTokenName('');
        fetchTokens();
      }
    } catch (error) {
      console.error('Failed to create token', error);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this token?')) return;
    try {
      const res = await fetchApi(`/developer/tokens/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) fetchTokens();
    } catch (error) {
      console.error('Failed to revoke token', error);
    }
  };

  const copyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">API Tokens</h3>
          <p className="text-sm text-slate-400">Manage your programmatic access tokens.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="glass-button px-4 py-2 flex items-center gap-2 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          Generate New Token
        </button>
      </div>

      {showCreate && !createdToken && (
        <form onSubmit={handleCreateToken} className="glass-panel p-4 rounded-2xl flex items-end gap-3 border border-indigo-500/30">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Token Name</label>
            <input
              type="text"
              required
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="e.g. Zapier Integration"
              className="glass-input w-full text-sm"
            />
          </div>
          <button type="submit" className="glass-button px-4 py-2.5 rounded-xl text-sm bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30">
            Create
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
        </form>
      )}

      {createdToken && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <h4 className="text-sm font-semibold text-emerald-400 mb-1">Token Created Successfully!</h4>
          <p className="text-xs text-slate-300 mb-3">Copy this token now. You won&apos;t be able to see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-mono text-emerald-200">
              {createdToken}
            </code>
            <button 
              onClick={copyToken}
              className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <button 
            onClick={() => { setCreatedToken(null); setShowCreate(false); }}
            className="mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            I have copied the token
          </button>
        </div>
      )}

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
              <Key className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No active API tokens found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {tokens.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.tokenPrefix}...</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(t.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Revoke Token"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
