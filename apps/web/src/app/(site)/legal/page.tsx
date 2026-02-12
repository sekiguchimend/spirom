import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/ui';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: 'Spiromの特定商取引法に基づく表記。販売業者情報、支払方法、配送、返品等に関する情報を掲載しています。',
  alternates: {
    canonical: '/legal',
  },
};

export default function LegalNoticePage() {
  return (
    <LegalPageLayout
      title="LEGAL"
      subtitle="特定商取引法に基づく表記"
      lastUpdated="2024年1月1日"
    >
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">販売業者</h2>
          <p className="text-base text-black font-medium">SPIROM INC.</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">運営統括責任者</h2>
          <p className="text-base text-black font-medium">関口 太郎</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">所在地</h2>
          <p className="text-base text-black font-medium">
            〒100-0001<br />
            東京都千代田区千代田1-1-1
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">電話番号</h2>
          <p className="text-base text-black font-medium">03-0000-0000</p>
          <p className="text-sm text-gray-500 mt-1">受付時間：平日 10:00〜18:00（土日祝日を除く）</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">メールアドレス</h2>
          <p className="text-base text-black font-medium">support@spirom.com</p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">販売価格</h2>
          <p className="text-base text-black font-medium">
            各商品ページに表示された価格（税込）
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">商品代金以外の必要料金</h2>
          <p className="text-base text-black font-medium">
            送料：全国一律 無料<br />
            ※振込手数料はお客様負担となります
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">支払方法</h2>
          <p className="text-base text-black font-medium">
            クレジットカード決済（VISA、Mastercard、American Express、JCB）
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">支払時期</h2>
          <p className="text-base text-black font-medium">
            クレジットカード決済：ご注文時に決済
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">商品の引渡時期</h2>
          <p className="text-base text-black font-medium">
            ご注文確認後、3〜7営業日以内に発送いたします。<br />
            ※在庫状況や配送地域により、お届けまでの日数が異なる場合がございます。
          </p>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-sm font-bold text-gray-500 mb-2">返品・交換について</h2>
          <p className="text-base text-black font-medium mb-2">
            商品到着後7日以内に限り、未使用・未開封の商品に限り返品・交換を承ります。
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>不良品・誤送品の場合：送料当社負担にて交換いたします</li>
            <li>お客様都合の場合：送料はお客様負担となります</li>
            <li>セール品・受注生産品は返品・交換不可</li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2">返品連絡先</h2>
          <p className="text-base text-black font-medium">
            メール：support@spirom.com<br />
            電話：03-0000-0000
          </p>
        </div>
      </div>
    </LegalPageLayout>
  );
}
