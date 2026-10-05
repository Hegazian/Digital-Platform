import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { Webhook, Plus, Trash, Link2, Activity } from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export default function WebhookList() {
  const { token } = useAppStore();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Webhook State
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['user.created']);

  const availableEvents = ['user.created', 'course.completed', 'payment.success', 'enrollment.created'];

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetchApi('/developer/webhooks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setEndpoints(res.data);
    } catch (error) {
      console.error('Failed to fetch webhooks', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/developer/webhooks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ url, events: selectedEvents })
      });
      if (res.success) {
        setUrl('');
        setSelectedEvents(['user.created']);
        setShowCreate(false);
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to create webhook', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      const res = await fetchApi(`/developer/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook', error);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Webhook Endpoints</h3>
          <p className="text-sm text-slate-400">Receive real-time HTTP requests to your services.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="glass-button px-4 py-2 flex items-center gap-2 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Endpoint
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateWebhook} className="glass-panel p-5 rounded-2xl space-y-4 border border-indigo-500/30">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Payload URL</label>
            <div className="relative">
              <Link2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://my-domain.com/webhook-receiver"
                className="glass-input w-full pl-9 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Events to send</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableEvents.map(event => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                    selectedEvents.includes(event)
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={selectedEvents.length === 0} className="glass-button px-6 py-2 rounded-xl text-sm bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-50">
              Create Endpoint
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading webhooks...</div>
        ) : endpoints.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
              <Webhook className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No webhooks configured.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Events</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${ep.isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    {ep.url}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ep.events.map(ev => (
                        <span key={ev} className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(ep.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Webhook"
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
