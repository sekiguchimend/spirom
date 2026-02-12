import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ROUTES } from '@/lib/routes';
import { formatDate, formatPrice } from '@/lib/utils';
import { getServerOrder, isAuthenticated } from '@/lib/server-api';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/orderStatus';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '注文詳細',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { id } = await params;
  const order = await getServerOrder(id);
  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-primary" />
            <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
              Order
            </p>
            <div className="h-0.5 w-8 bg-primary" />
          </div>
          <h1
            className="text-center text-2xl text-text-dark"
            style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}
          >
            注文詳細
          </h1>
          <p className="text-center text-sm text-gray-600 mt-2">
            注文内容と配送状況をご確認いただけます。
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* サマリー */}
            <div className="bg-primary/5 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 font-bold">注文番号</p>
                  <p className="text-lg font-black text-text-dark">{order.order_number}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    注文日: {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusBadgeClass(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>
                  <p className="text-2xl font-black text-primary mt-2">
                    {formatPrice(order.total, order.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* 進捗 */}
            <OrderProgress order={order} />

            {/* 商品明細 */}
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">
                  注文内容
                </h2>
                <div className="divide-y divide-gray-100 border-2 border-gray-100 rounded-xl overflow-hidden">
                  {order.items.map((item) => (
                    <div key={item.product_id} className="p-4 flex items-start justify-between gap-4 bg-white">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-dark truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          数量: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-text-dark">
                          {formatPrice(item.subtotal, order.currency)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatPrice(item.price, order.currency)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 金額内訳 */}
            <div className="bg-bg-light rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">
                お支払い内訳
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">小計</dt>
                  <dd className="font-bold text-text-dark">
                    {formatPrice(order.subtotal ?? 0, order.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">送料</dt>
                  <dd className="font-bold text-text-dark">
                    {formatPrice(order.shipping_fee ?? 0, order.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">税</dt>
                  <dd className="font-bold text-text-dark">
                    {formatPrice(order.tax ?? 0, order.currency)}
                  </dd>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <dt className="font-bold text-text-dark">合計</dt>
                  <dd className="text-xl font-black text-primary">
                    {formatPrice(order.total, order.currency)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={ROUTES.ORDERS.INDEX}
                className="flex-1 px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-sm text-center"
              >
                注文履歴に戻る
              </Link>
              <Link
                href={ROUTES.PRODUCTS.INDEX}
                className="flex-1 px-6 py-3 text-sm font-bold border-2 border-gray-200 text-text-dark rounded-xl hover:bg-gray-50 transition-colors text-center"
              >
                買い物を続ける
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


