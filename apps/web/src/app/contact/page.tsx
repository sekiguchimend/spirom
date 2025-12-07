'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Tag,
  Package,
  RotateCcw,
  MessageCircle,
  Clock,
  Zap,
  BookOpen,
  Instagram,
  Twitter,
  MessageSquare,
  Check,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InquiryType {
  value: string;
  label: string;
  icon: LucideIcon;
}

const inquiryTypes: InquiryType[] = [
  { value: 'order', label: 'ORDER', icon: ShoppingCart },
  { value: 'product', label: 'PRODUCT', icon: Tag },
  { value: 'shipping', label: 'SHIPPING', icon: Package },
  { value: 'return', label: 'RETURNS', icon: RotateCcw },
  { value: 'other', label: 'OTHER', icon: MessageCircle },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: '',
    orderNumber: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FFFFF5] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-[#7dff3a] border-4 border-black rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <Check size={48} strokeWidth={3} />
          </div>
          <h1
            className="text-5xl md:text-6xl font-black mb-4 uppercase"
            style={{
              fontFamily: 'var(--font-anton), sans-serif',
              textShadow: '3px 3px 0px #7dff3a',
            }}
          >
            SENT!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            お問い合わせを受け付けました。<br />
            <span className="font-bold">2〜3営業日以内</span>にご返信いたします。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-black uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
          >
            <ArrowLeft size={20} strokeWidth={3} />
            BACK TO HOME
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFF5]">
      {/* ヒーロー */}
      <section className="py-20 px-4" aria-labelledby="page-title">
        <header className="max-w-4xl mx-auto text-center">
          <h1
            id="page-title"
            className="text-6xl md:text-8xl font-black tracking-tighter mb-6"
            style={{
              fontFamily: 'var(--font-anton), sans-serif',
              textShadow: '4px 4px 0px #ff2d78',
            }}
          >
            CONTACT
          </h1>
          <p className="text-xl font-bold uppercase tracking-wider bg-black text-white px-6 py-3 inline-block border-3 border-black">
            DROP US A LINE!
          </p>
        </header>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* フォーム */}
          <div className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="bg-white border-4 border-black rounded-2xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            >
              {/* お名前 */}
              <div className="mb-6">
                <label htmlFor="name" className="block font-black text-sm uppercase tracking-wider mb-2">
                  NAME <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">（必須）</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder="山田 太郎"
                />
              </div>

              {/* メール */}
              <div className="mb-6">
                <label htmlFor="email" className="block font-black text-sm uppercase tracking-wider mb-2">
                  EMAIL <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">（必須）</span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder="your@email.com"
                />
              </div>

              {/* お問い合わせ種別 */}
              <fieldset className="mb-6">
                <legend className="block font-black text-sm uppercase tracking-wider mb-3">
                  WHAT&apos;S UP? <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">（必須）</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {inquiryTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                        className={`px-4 py-2 font-bold text-sm border-3 border-black rounded-lg transition-all flex items-center gap-2 ${
                          formData.type === type.value
                            ? 'bg-black text-white shadow-none'
                            : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.5} />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* 注文番号 */}
              <div className="mb-6">
                <label htmlFor="orderNumber" className="block font-black text-sm uppercase tracking-wider mb-2">
                  ORDER # <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="orderNumber"
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder="SP-XXXX-XXXX"
                />
              </div>

              {/* メッセージ */}
              <div className="mb-8">
                <label htmlFor="message" className="block font-black text-sm uppercase tracking-wider mb-2">
                  MESSAGE <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">（必須）</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder="お問い合わせ内容をお書きください..."
                />
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.type}
                className="w-full py-4 bg-black text-white font-black text-xl uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'SENDING...' : (
                  <>
                    SEND MESSAGE
                    <ArrowRight size={24} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* サイドバー */}
          <aside className="lg:col-span-2 space-y-6">
            {/* 営業時間 */}
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-4">
                <Clock size={24} strokeWidth={2.5} />
                <h2 className="font-black text-lg uppercase tracking-tight">HOURS</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b-2 border-gray-200">
                  <span className="font-bold">MON - FRI</span>
                  <span className="bg-black text-white px-3 py-1 font-bold rounded">10:00 - 18:00</span>
                </div>
                <div className="flex justify-between items-center py-2 text-gray-400">
                  <span className="font-bold">SAT - SUN</span>
                  <span>CLOSED</span>
                </div>
              </div>
            </div>

            {/* レスポンス */}
            <div className="bg-[#7dff3a] border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <Zap size={28} strokeWidth={2.5} />
                <div>
                  <h2 className="font-black text-lg uppercase">FAST REPLY</h2>
                  <p className="text-sm mt-1">
                    通常<span className="font-black text-xl mx-1">2-3</span>営業日以内
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ誘導 */}
            <div className="bg-[#ffd93d] border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={24} strokeWidth={2.5} />
                <h2 className="font-black text-lg uppercase">FAQ</h2>
              </div>
              <p className="text-sm mb-4">
                よくある質問はこちら
              </p>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 font-black text-sm uppercase hover:underline"
              >
                READ NOW
                <ArrowRight size={16} strokeWidth={3} />
              </Link>
            </div>

            {/* SNS */}
            <div className="bg-[#323232] text-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="font-black text-lg uppercase mb-4 text-center">FOLLOW US</h2>
              <div className="flex justify-center gap-4">
                <a
                  href="#"
                  className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center hover:scale-110 transition-transform bg-[#ff2d78]"
                >
                  <Instagram size={24} strokeWidth={2} />
                </a>
                <a
                  href="#"
                  className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center hover:scale-110 transition-transform bg-[#00d4ff]"
                >
                  <Twitter size={24} strokeWidth={2} />
                </a>
                <a
                  href="#"
                  className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center hover:scale-110 transition-transform bg-[#7dff3a]"
                >
                  <MessageSquare size={24} strokeWidth={2} />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
