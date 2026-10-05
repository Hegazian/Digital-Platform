'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, ShoppingBag } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';

interface PendingOrder {
  id: string;
  status: string;
  totalAmountEgp: string;
  paymentMethod: string;
  transactionRef: string | null;
  createdAt: string;
  student: { name: string; email: string };
  product: { nameEn: string; nameAr: string };
}

/**
 * Admin queue for manual course purchases (Vodafone Cash / InstaPay).
 * Approving atomically flips the order to PAID and grants the entitlement
 * (same fulfillment path as the Paymob/Fawry webhooks).
 */
export default function PendingOrdersManager() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/commerce/admin/orders?status=PENDING');
      setOrders(res.data || []);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleAction = async (orderId: string, action: 'approve' | 'reject') => {
    setActionLoading(orderId);
    setError('');
    try {
      await fetchApi(`/commerce/admin/orders/${orderId}/${action}`, { method: 'PATCH' });
      await loadOrders();
    } catch (e: unknown) {
      setError(errorMessage(e, `Failed to ${action} order`));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            Course Purchase Orders
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Verify each transfer with your payment provider before approving. Approval unlocks the
            course for the student immediately.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

      {loading ? (
        <div className="glass-panel p-8 rounded-3xl text-center text-sm text-slate-500">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold text-white">No pending purchase orders</p>
          <p className="text-xs text-slate-500">New manual payments will appear here for verification.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white truncate">{o.product?.nameEn}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> PENDING
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {o.student?.name} · <span className="text-slate-500">{o.student?.email}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {o.paymentMethod} · Ref:{' '}
                  <span className={o.transactionRef ? 'text-slate-300 font-mono' : 'text-rose-400'}>
                    {o.transactionRef || 'MISSING'}
                  </span>{' '}
                  · {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-emerald-400 mr-2">
                  {Number(o.totalAmountEgp)} EGP
                </span>
                <button
                  onClick={() => handleAction(o.id, 'approve')}
                  disabled={actionLoading === o.id}
                  aria-label={`Approve order for ${o.student?.name}`}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleAction(o.id, 'reject')}
                  disabled={actionLoading === o.id}
                  aria-label={`Reject order for ${o.student?.name}`}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-600/80 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
