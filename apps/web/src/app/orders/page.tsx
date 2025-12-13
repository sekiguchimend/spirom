import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getServerOrders } from '@/lib/server-api';
import { formatPrice } from '@/lib/utils';
import { OrderProgress } from '@/components/orders/OrderProgress';

export const dynamic = 'force-dynamic';

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending_payment: '支払い待ち',
    paid: '支払い済み',
    processing: '処理中',
    shipped: '発送済み',
    delivered: '配達済み',
    cancelled: 'キャンセル済み',
    refunded: '返金済み',
  };
  return statusMap[status] || status;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function OrdersPage() {
  // Server Componentで認証チェック
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect('/login');
  }

  // Server ComponentからBFFを直接叩く（Route Handler経由しない）
  const orders = await getServerOrders();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">注文履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ヘッダー */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-0.5 w-8 bg-[#4a7c59]" />
                <p className="text-xs tracking-[0.2em] text-[#4a7c59] uppercase font-bold">
                  Orders
                </p>
                <div className="h-0.5 w-8 bg-[#4a7c59]" />
              </div>
              <h1 className="text-center text-2xl text-[#323232]" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
                注文履歴
              </h1>
            </div>

            {/* 注文一覧 */}
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* 注文ヘッダー */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <h3 className="text-lg font-bold text-[#323232] mb-1">
                        注文番号: {order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        注文日: {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="text-xl font-bold text-[#323232]">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>

                  {/* 進捗状況 */}
                  <div className="mb-6">
                    <OrderProgress order={order} />
                  </div>

                  {/* 注文詳細リンク */}
                  <div className="flex justify-end">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-2 text-sm font-bold text-[#4a7c59] hover:text-[#3a6c49] transition-colors"
                    >
                      詳細を見る
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
