import Link from 'next/link';
import type { Metadata } from 'next';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import { formatDate, formatPrice } from '@/lib/utils';
import { getGuestOrderAction } from '@/lib/actions';
import { getOrderStatusBadgeClass, getOrderStatusLabel } from '@/lib/orderStatus';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '注文詳細',
  description: 'ゲスト注文の詳細を確認できます。',
};

export default async function GuestOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { lang, id: orderId } = await params;
  const locale = (lang as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const { token: guestToken } = await searchParams;

  if (!guestToken) {
    return (
      <div className="min-h-screen bg-bg-light pt-24 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-xl font-bold text-text-dark mb-4">アクセスできません</h1>
            <p className="text-sm text-gray-600 mb-6">
              このページにアクセスするには、注文確認リンクに含まれるトークンが必要です。
            </p>
            <Link
              href={routes.PRODUCTS.INDEX}
              className="inline-block px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all"
            >
              商品一覧へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const result = await getGuestOrderAction(orderId, guestToken);
  const order = result.success ? result.data : null;

  if (!order) {
    return (
      <div className="min-h-screen bg-bg-light pt-24 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-xl font-bold text-text-dark mb-4">注文が見つかりません</h1>
            <p className="text-sm text-gray-600 mb-6">
              注文が見つからないか、リンクの有効期限が切れています。
              ゲスト注文のリンクは7日間有効です。
            </p>
            <Link
              href={routes.PRODUCTS.INDEX}
              className="inline-block px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all"
            >
              商品一覧へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-primary" />
            <p className="text-xs tracking-[0.2em] text-primary uppercase font-bold">
              Guest Order
            </p>
            <div className="h-0.5 w-8 bg-primary" />
          </div>
          <h1
            className="text-center text-2xl text-text-dark"
            style={{ fontWeight: 900, WebkitTextStroke: '0.5px currentColor' }}
          >
            注文詳細
          </h1>
          <p className="text-center text-xs text-gray-500 mt-2">
            ゲスト購入でご注文いただきました
          </p>
        </div>

        {/* 本文カード */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
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

              {/* リンク有効期限の案内 */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="font-bold text-text-dark text-sm">注文確認リンクについて</p>
                <p className="text-xs text-gray-700 mt-1">
                  このページのURLをブックマークしておくと、後から注文状況を確認できます。
                  リンクの有効期限は注文から7日間です。
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8">
              <Link
                href={routes.PRODUCTS.INDEX}
                className="w-full block px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-sm text-center"
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
