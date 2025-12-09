import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: '利用規約',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-20">
        {/* ページヘッダー */}
        <header className="text-center mb-8 sm:mb-16">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-2 sm:mb-4 tracking-wide text-black"
            style={{ fontFamily: 'var(--font-anton), sans-serif' }}
          >
            TERMS
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 font-bold uppercase tracking-wider">
            利用規約
          </p>
        </header>

        {/* コンテンツ */}
        <div className="bg-white border-3 sm:border-4 border-black rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="prose prose-sm sm:prose max-w-none">
            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第1条（適用）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                本規約は、当サイト（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーの皆様には、本規約に同意いただいた上で、本サービスをご利用いただきます。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第2条（購入）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                本サービスにおける商品の購入契約は、お客様が注文を行い、当サイトが注文確認メールを送信した時点で成立するものとします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第3条（支払い）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                商品代金のお支払いは、クレジットカード決済、その他当サイトが指定する方法によるものとします。お支払いに関する詳細は、購入手続き画面にてご確認ください。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第4条（配送）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                商品の配送は、日本国内に限ります。配送日数は地域により異なりますが、通常ご注文から3〜7営業日以内に発送いたします。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第5条（返品・交換）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                商品の返品・交換は、商品到着後7日以内に限り、未使用・未開封の場合に限りお受けいたします。ただし、お客様都合による返品の場合、送料はお客様のご負担となります。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第6条（禁止事項）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                本サービスの利用に際し、以下の行為を禁止します。
              </p>
              <ul className="text-sm sm:text-base text-gray-700 space-y-2 list-disc list-inside">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>他のユーザーに迷惑をかける行為</li>
                <li>不正アクセスを試みる行為</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第7条（免責事項）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                当サイトは、本サービスに関して、その完全性、正確性、確実性、有用性等について、いかなる保証も行いません。本サービスの利用により生じた損害について、当サイトは一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-black mb-4 text-black">第8条（規約の変更）</h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                当サイトは、必要と判断した場合には、ユーザーに通知することなく本規約を変更することがあります。変更後の規約は、本サイトに掲載した時点で効力を生じるものとします。
              </p>
            </section>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mt-8 pt-6 border-t-2 border-black">
            最終更新日: 2024年1月1日
          </p>
        </div>
      </div>
    </div>
  );
}
