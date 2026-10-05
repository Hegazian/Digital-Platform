import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { fetchApi } from '../../lib/api';
import { Database, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  entityId: string | null;
  entityType: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    name?: string;
    email?: string;
  } | null;
}

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function AuditLogsTable() {
  const { token } = useAppStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetchApi('/audit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const detailsStr = formatDetails(log.details).toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.user?.name || '').toLowerCase().includes(q) ||
      (log.user?.email || '').toLowerCase().includes(q) ||
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.entityId || '').toLowerCase().includes(q) ||
      detailsStr.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">System Audit Trails</h3>
          <p className="text-sm text-slate-400">Immutable record of all critical administrative and system events.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-9 text-sm"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No logs match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.map((log) => {
                  const detailsText = formatDetails(log.details);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors text-slate-300">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono font-medium tracking-wider text-indigo-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{log.user?.name || 'System / Anonymous'}</div>
                        <div className="text-[10px] text-slate-500">{log.user?.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.entityType ? (
                          <div>
                            <span className="text-slate-400">{log.entityType}:</span> {log.entityId}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" title={detailsText}>
                        {detailsText ? (
                          <span className={typeof log.details === 'object' ? 'font-mono text-[11px] text-slate-400' : ''}>
                            {detailsText}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {log.ipAddress || 'unknown'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
