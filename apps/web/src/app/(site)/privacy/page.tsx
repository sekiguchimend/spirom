import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Spiromのプライバシーポリシー。お客様の個人情報の取り扱いについて、収集・利用・保護の方針を説明しています。',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="PRIVACY"
      subtitle="プライバシーポリシー"
      lastUpdated="2025年2月12日"
    >
      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">1. 個人情報の収集</h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          当サイトでは、お客様からご注文やお問い合わせをいただく際に、お名前、メールアドレス、住所、電話番号などの個人情報をお預かりすることがあります。これらの情報は、ご注文の処理、商品の発送、お問い合わせへの対応など、サービス提供のために使用いたします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">2. 個人情報の利用目的</h2>
        <ul className="text-sm sm:text-base text-gray-700 space-y-2 list-disc list-inside">
          <li>ご注文いただいた商品の発送</li>
          <li>お問い合わせへの回答</li>
          <li>サービスに関する重要なお知らせの送信</li>
          <li>サービスの改善・新サービスの開発</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">3. 個人情報の第三者提供</h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          当サイトでは、以下の場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
        </p>
        <ul className="text-sm sm:text-base text-gray-700 space-y-2 list-disc list-inside mt-4">
          <li>法令に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要な場合</li>
          <li>商品の配送業務を委託する場合</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">4. Cookieの使用</h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          当サイトでは、サービスの向上のためCookieを使用しています。Cookieはお客様のブラウザに保存される小さなデータファイルで、サイトの利用状況の分析やユーザー体験の向上に使用されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">5. セキュリティ</h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          当サイトでは、お客様の個人情報を適切に管理し、不正アクセス、紛失、破壊、改ざん、漏洩などを防止するため、SSL暗号化通信を使用するなど、合理的な安全対策を講じています。
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">6. お問い合わせ</h2>
        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
          本プライバシーポリシーに関するお問い合わせは、お問い合わせページよりご連絡ください。
        </p>
      </section>
    </LegalPageLayout>
  );
}
