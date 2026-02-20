import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getServerOrders } from '@/lib/server-api';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  // Server Componentで認証チェック
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect(routes.AUTH.LOGIN);
  }

  // Server ComponentからBFFを直接叩く（Route Handler経由しない）
  const orders = await getServerOrders();

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-12 px-4 sm:px-6 lg:px-8">
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
                <div className="h-0.5 w-8 bg-primary" />
                <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
                  Orders
                </p>
                <div className="h-0.5 w-8 bg-primary" />
              </div>
              <h1 className="text-center text-2xl text-text-dark" style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}>
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
                      <h3 className="text-lg font-bold text-text-dark mb-1">
                        注文番号: {order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        注文日: {formatDate(order.created_at)}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-text-dark">
                      {formatPrice(order.total)}
                    </p>
                  </div>

                  {/* 進捗状況 */}
                  <div className="mb-6">
                    <OrderProgress order={order} />
                  </div>

                  {/* 注文詳細リンク */}
                  <div className="flex justify-end">
                    <Link
                      href={routes.ORDERS.DETAIL(order.id)}
                      className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors"
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
