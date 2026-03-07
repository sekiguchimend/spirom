import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
                <Link
                  key={order.id}
                  href={routes.ORDERS.DETAIL(order.id)}
                  className="block bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* 注文日と合計 */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="text-lg font-bold text-text-dark">
                      {formatPrice(order.total)}
                    </p>
                  </div>

                  {/* 商品一覧 */}
                  <div className="space-y-3 mb-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        {/* 商品画像 */}
                        <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* 商品情報 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-dark truncate">
                            {item.product_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            {item.size && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded">
                                {item.size}
                              </span>
                            )}
                            <span>×{item.quantity}</span>
                          </div>
                        </div>
                        {/* 価格 */}
                        <p className="text-sm font-medium text-text-dark">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 進捗状況 */}
                  <div className="pt-4 border-t border-gray-100">
                    <OrderProgress order={order} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
