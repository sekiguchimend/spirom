import Link from 'next/link';
import type { Metadata } from 'next';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { formatDate, formatPrice } from '@/lib/utils';
import { getServerOrder, isAuthenticated } from '@/lib/server-api';
import { getGuestOrderAction } from '@/lib/actions';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/orderStatus';
import { ClearLocalCart } from './ClearLocalCart';
import type { Order } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ご注文ありがとうございます',
  description: '決済が完了しました。ご注文内容をご確認ください。',
};

export default async function CheckoutCompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ order_id?: string; guest?: string; token?: string }>;
}) {
  const { lang } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const { order_id: orderId, guest, token: guestToken } = await searchParams;
  const isGuestOrder = guest === 'true' && guestToken;

  let order: Order | null = null;

  if (orderId) {
    if (isGuestOrder && guestToken) {
      // ゲスト注文の場合
      const result = await getGuestOrderAction(orderId, guestToken);
      if (result.success && result.data) {
        order = result.data;
      }
    } else {
      // 認証済みユーザーの場合
      const authed = await isAuthenticated();
      if (authed) {
        order = await getServerOrder(orderId);
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-14 px-4 sm:px-6 lg:px-8">
      {/* 完了ページ到達時にローカルカートをクリア（ページ内のみ副作用） */}
      <ClearLocalCart />

      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-primary" />
            <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
              Payment Complete
            </p>
            <div className="h-0.5 w-8 bg-primary" />
          </div>

          <h1
            className="text-2xl sm:text-3xl text-text-dark"
            style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}
          >
            ご注文ありがとうございます
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            決済が完了しました。ご注文内容をご確認ください。
          </p>
          <p className="text-sm text-primary font-bold mt-2">
            お届けまで約2週間かかります。
          </p>
          {isGuestOrder && (
            <p className="text-xs text-gray-500 mt-2">
              ゲスト購入でご注文いただきました
            </p>
          )}
        </div>

        {/* 本文カード */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* 注文IDが無い/取得できない場合 */}
            {!orderId && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                <p className="font-bold text-text-dark">注文情報が見つかりません</p>
                <p className="text-sm text-gray-700 mt-1">
                  URLに注文IDが含まれていないため、注文内容を表示できませんでした。
                </p>
              </div>
            )}

            {/* 未ログインなどで注文取得できない場合 */}
            {orderId && !order && (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6">
                <p className="font-bold text-text-dark">注文内容を読み込めませんでした</p>
                <p className="text-sm text-gray-700 mt-1">
                  {isGuestOrder
                    ? 'ゲスト注文のリンクが無効または期限切れです。'
                    : 'しばらくしてから「注文履歴」でご確認ください。'}
                </p>
              </div>
            )}

            {order && (
              <div className="space-y-6">
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

                {/* ゲスト注文の場合の案内 */}
                {isGuestOrder && guestToken && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="font-bold text-text-dark text-sm">注文確認リンク</p>
                    <p className="text-xs text-gray-700 mt-1">
                      このページのURLをブックマークしておくと、後から注文状況を確認できます。
                      リンクの有効期限は7日間です。
                    </p>
                  </div>
                )}

                {/* 進捗（認証済みユーザーのみ） */}
                {!isGuestOrder && <OrderProgress order={order} />}

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
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {!isGuestOrder && (
                <Link
                  href={routes.ORDERS.INDEX}
                  className="flex-1 px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-sm text-center"
                >
                  注文履歴へ
                </Link>
              )}
              <Link
                href={routes.PRODUCTS.INDEX}
                className={`${isGuestOrder ? 'flex-1' : 'flex-1'} px-6 py-3 text-sm font-bold ${
                  isGuestOrder
                    ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                    : 'border-2 border-gray-200 text-text-dark hover:bg-gray-50'
                } rounded-xl transition-colors text-center`}
              >
                買い物を続ける
              </Link>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              ご不明点があれば「お問い合わせ」からご連絡ください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
