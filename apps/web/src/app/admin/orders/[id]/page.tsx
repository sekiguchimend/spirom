'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

interface OrderAddress {
  name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone?: string;
}

interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_id?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  tax: number;
  total: number;
  currency: string;
  shipping_address: OrderAddress;
  billing_address?: OrderAddress;
  notes?: string;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '作成待ち', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '作成済み', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '処理中', color: 'bg-purple-100 text-purple-700' },
  shipped: { label: '発送済み', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: '配達済み', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: 'クレジットカード',
  paypay: 'PayPay',
  rakuten_pay: '楽天ペイ',
  konbini: 'コンビニ払い',
  bank_transfer: '銀行振込',
};

// 進捗状況の遷移定義（adminが手動で更新）
// OrderProgressの流れに合わせる: 作成待ち → 作成済み → 処理中 → 発送済み → 配達済み
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function fetchOrder() {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/admin/orders/${orderId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('注文が見つかりません');
        } else {
          setError('注文の取得に失敗しました');
        }
        return;
      }
      const data = await res.json();
      setOrder(data.data);
    } catch {
      setError('注文の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!order) return;

    try {
      setIsUpdating(true);
      setUpdateSuccess(null);
      setError(null);

      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '進捗状況の更新に失敗しました');
      }

      const data = await res.json();
      setOrder(data.data);
      setUpdateSuccess('進捗状況を更新しました');

      // 3秒後にメッセージをクリア
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '進捗状況の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  }

  // ハイドレーションエラー防止: マウント後のみ日付をフォーマット
  const formatDate = (dateString: string) => {
    if (!isMounted) return ''; // SSR時は空文字
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4">
          {error}
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          注文一覧に戻る
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
  const availableTransitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="p-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          注文一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">注文 #{order.order_number}</h1>
            <p className="text-gray-600 mt-1">
              {formatDate(order.created_at)}
            </p>
          </div>
          <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* エラー/成功メッセージ */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}
      {updateSuccess && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6">
          {updateSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: 注文内容と配送先 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 注文アイテム */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">注文内容</h2>
            <div className="divide-y">
              {order.items.map((item, index) => (
                <div key={item.product_id || index} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={!item.image_url.includes('sanity.io') && !item.image_url.includes('spirom.com')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{item.product_name}</h3>
                    <p className="text-sm text-gray-600">SKU: {item.product_sku || '-'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">{formatPrice(item.price)} x {item.quantity}</p>
                    <p className="text-sm text-gray-600">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">小計</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">送料</span>
                <span>{formatPrice(order.shipping_fee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">消費税</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>合計</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* 配送先情報 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">配送先</h2>
            <div className="text-gray-700">
              <p className="font-bold">{order.shipping_address.name}</p>
              <p className="mt-1">〒{order.shipping_address.postal_code}</p>
              <p>{order.shipping_address.prefecture} {order.shipping_address.city}</p>
              <p>{order.shipping_address.address_line1}</p>
              {order.shipping_address.address_line2 && (
                <p>{order.shipping_address.address_line2}</p>
              )}
              {order.shipping_address.phone && (
                <p className="mt-2">TEL: {order.shipping_address.phone}</p>
              )}
            </div>
          </div>

          {/* 備考 */}
          {order.notes && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">備考</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 右カラム: ステータス更新 */}
        <div className="space-y-6">
          {/* 進捗状況 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">進捗状況</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">現在の状況</p>
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            {availableTransitions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-2">進捗を更新</p>
                {availableTransitions.map((status) => {
                  const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <button
                      key={status}
                      onClick={() => updateStatus(status)}
                      disabled={isUpdating}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        status === 'cancelled' || status === 'refunded'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isUpdating ? '更新中...' : `${info.label}に変更`}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                これ以上の進捗更新はありません
              </p>
            )}
          </div>

          {/* 決済情報 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">決済情報</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">支払い方法</dt>
                <dd className="font-bold">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}</dd>
              </div>
              {order.payment_id && (
                <div>
                  <dt className="text-sm text-gray-600">決済ID</dt>
                  <dd className="text-sm font-mono break-all">{order.payment_id}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* タイムスタンプ */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">履歴</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">注文日時</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">最終更新</dt>
                <dd>{formatDate(order.updated_at)}</dd>
              </div>
              {order.shipped_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">発送日時</dt>
                  <dd>{formatDate(order.shipped_at)}</dd>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">配達日時</dt>
                  <dd>{formatDate(order.delivered_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* ユーザーID */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">顧客情報</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-600">ユーザーID</dt>
                <dd className="font-mono text-xs break-all">{order.user_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
