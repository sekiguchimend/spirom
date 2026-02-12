'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  user_id: string;
  item_count?: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '処理待ち', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '確認済み', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '処理中', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: '発送済み', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: '配達完了', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未払い', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '支払済', color: 'bg-green-100 text-green-700' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-700' },
  refunded: { label: '返金済', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/v1/admin/orders?limit=100');
        if (res.ok) {
          const data = await res.json();
          setOrders(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">注文管理</h1>
          <p className="text-gray-600 mt-1">{filteredOrders.length} 件の注文</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-600 mr-2">ステータス:</span>
          {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                statusFilter === status
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'すべて' : STATUS_LABELS[status]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-gray-500">注文がありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">注文番号</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">日時</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">ステータス</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">支払い</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-600">金額</th>
                <th className="text-right px-6 py-4 text-sm font-bold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                const paymentInfo = PAYMENT_STATUS_LABELS[order.payment_status] || { label: order.payment_status, color: 'bg-gray-100 text-gray-600' };

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${paymentInfo.color}`}>
                        {paymentInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold">{formatPrice(order.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        詳細
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
