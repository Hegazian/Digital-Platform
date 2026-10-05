'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { errorMessage } from '@/lib/apiTypes';
import { useAppStore } from '@/lib/store';
import Modal from '@/components/ui/Modal';
import { useT } from '@/lib/useT';
import { X, Smartphone, Wallet, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface CheckoutModalProps {
  course: {
    id: string;
    titleEn: string;
    titleAr: string;
    priceEgp?: number;
    priceUsd?: number;
  };
  onClose: () => void;
  onAccessGranted: () => void;
}

type Phase = 'details' | 'submitting' | 'pending' | 'granted';

const PAYMENT_METHODS = [
  { id: 'VODAFONE_CASH', label: 'Vodafone Cash', icon: Smartphone },
  { id: 'INSTAPAY', label: 'InstaPay', icon: Wallet },
] as const;

/**
 * Student checkout for paid courses:
 * course product -> PENDING order (idempotency key) -> admin verifies the
 * manual transfer -> entitlement granted. Polls own order history while open.
 */
export default function CheckoutModal({ course, onClose, onAccessGranted }: CheckoutModalProps) {
  const lang = useAppStore((s) => s.lang);
  const t = useT();

  const [phase, setPhase] = useState<Phase>('details');
  const [method, setMethod] = useState<string>('VODAFONE_CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = lang === 'ar' ? course.titleAr : course.titleEn;

  const checkOrderStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetchApi('/commerce/orders/me');
      const mine = (res.data || []).find((o: any) => o.id === orderId);
      if (!mine) return;
      if (mine.status === 'PAID') {
        setPhase('granted');
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(onAccessGranted, 1500);
      }
      // FAILED stays visible as pending-with-error; admin can re-verify later.
    } catch {
      // transient polling errors are non-fatal
    }
  }, [orderId, onAccessGranted]);

  useEffect(() => {
    if (phase === 'pending' && orderId) {
      pollRef.current = setInterval(checkOrderStatus, 8000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [phase, orderId, checkOrderStatus]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  const handleSubmit = async () => {
    setError('');
    setPhase('submitting');
    try {
      // Find this course's active product
      const productsRes = await fetchApi('/commerce/products');
      const products = productsRes.data || [];
      const product = products.find(
        (p: any) => p.productType === 'COURSE' && p.resourceId === course.id && Number(p.priceEgp) > 0
      );

      if (!product) {
        throw new Error(t('This course is not open for purchase yet.', 'هذه الدورة غير متاحة للشراء بعد.'));
      }

      const res = await fetchApi('/commerce/orders', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          paymentMethod: 'MANUAL',
          idempotencyKey: crypto.randomUUID(),
          transactionRef,
        }),
      });

      setOrderId(res.data.id);
      setPhase('pending');
    } catch (err: unknown) {
      setError(errorMessage(err, t('Checkout failed', 'فشل عملية الشراء')));
      setPhase('details');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      label={title}
      panelClassName="glass-panel w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-5"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">{t('Unlock Course', 'فتح الدورة')}</h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{title}</p>
          </div>
          <button onClick={onClose} aria-label={t('Close', 'إغلاق')} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'details' && (
          <>
            <div className="flex items-baseline justify-between rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
              <span className="text-xs text-slate-400 font-semibold">{t('Total', 'الإجمالي')}</span>
              <span className="text-emerald-400 font-bold">
                {course.priceEgp ?? 150} EGP{' '}
                <span className="text-slate-500 text-xs">(${course.priceUsd ?? 10})</span>
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                {t('Payment method', 'طريقة الدفع')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setMethod(pm.id)}
                      aria-pressed={method === pm.id}
                      className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                        method === pm.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-3 text-[11px] text-slate-400 leading-relaxed">
              {method === 'VODAFONE_CASH'
                ? t(
                    'Send the exact amount by Vodafone Cash, then enter the transaction number below. Access unlocks after admin verification.',
                    'أرسل المبلغ عبر فودافون كاش ثم أدخل رقم العملية. يتم تفعيل الوصول بعد مراجعة الإدارة.'
                  )
                : t(
                    'Transfer via InstaPay to the platform account, then enter the reference below. Access unlocks after admin verification.',
                    'حوّل عبر انستاباي لحساب المنصة ثم أدخل رقم المرجع. يتم التفعيل بعد مراجعة الإدارة.'
                  )}
            </div>

            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder={t('Transaction number / reference', 'رقم العملية / المرجع')}
              className="glass-input w-full text-xs"
              required
            />

            {error && (
              <p role="alert" className="text-xs text-rose-400">{error}</p>
            )}

            <button
              type="button"
              disabled={!transactionRef.trim()}
              onClick={handleSubmit}
              className="glass-button w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
            >
              {t('Submit payment proof', 'إرسال إثبات الدفع')}
            </button>
          </>
        )}

        {phase === 'submitting' && (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {(phase === 'pending' || phase === 'granted') && (
          <div className="space-y-4 py-4 text-center">
            {phase === 'granted' ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">
                  {t('Payment verified — course unlocked!', 'تم تأكيد الدفع - تم فتح الدورة!')}
                </p>
              </>
            ) : (
              <>
                <Clock className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
                <p className="text-sm font-bold text-white">
                  {t('Payment submitted for review', 'تم إرسال الدفعة للمراجعة')}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    'We are verifying your transfer with the payment team. This usually takes a few hours. You can close this window — we will unlock the course automatically once approved.',
                    'نقوم بالتحقق من تحويلك مع فريق المدفوعات. عادة يستغرق ذلك بضع ساعات. يمكنك إغلاق النافذة وسيتم فتح الدورة تلقائياً بعد الموافقة.'
                  )}
                </p>
              </>
            )}
            <button onClick={onClose} className="glass-button w-full py-2.5 rounded-2xl text-xs font-bold">
              {t('Done', 'تم')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
