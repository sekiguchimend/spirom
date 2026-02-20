'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';
import {
  ShoppingCart,
  Tag,
  Package,
  RotateCcw,
  MessageCircle,
  Clock,
  Zap,
  BookOpen,
  Check,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InquiryType {
  value: string;
  labelKey: keyof ContactDict['inquiryTypes'];
  icon: LucideIcon;
}

interface ContactDict {
  hero: { title: string; tagline: string };
  form: {
    loggedInAs: string;
    nameNotSet: string;
    whatsUp: string;
    required: string;
    orderNumber: string;
    optional: string;
    orderPlaceholder: string;
    message: string;
    messagePlaceholder: string;
    sendMessage: string;
    sending: string;
  };
  inquiryTypes: {
    order: string;
    product: string;
    shipping: string;
    return: string;
    other: string;
  };
  sidebar: {
    hours: { title: string; weekdays: string; weekdaysTime: string; weekend: string; closed: string };
    fastReply: { title: string; text: string; days: string; unit: string };
    faq: { title: string; text: string; link: string };
    social: { title: string; comingSoon: string };
  };
  success: { title: string; message: string; replyTime: string; replyText: string; backToHome: string };
  errors: { rateLimited: string; default: string };
  loading: string;
}

const inquiryTypes: InquiryType[] = [
  { value: 'order', labelKey: 'order', icon: ShoppingCart },
  { value: 'product', labelKey: 'product', icon: Tag },
  { value: 'shipping', labelKey: 'shipping', icon: Package },
  { value: 'return', labelKey: 'return', icon: RotateCcw },
  { value: 'other', labelKey: 'other', icon: MessageCircle },
];

export default function ContactPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  const [dict, setDict] = useState<ContactDict | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    orderNumber: '',
    message: '',
    website: '',
  });
  const [formRenderedAt, setFormRenderedAt] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 翻訳を読み込む
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translations = await import(`@/locales/${locale}/contact.json`);
        setDict(translations.default || translations);
      } catch {
        const fallback = await import(`@/locales/${defaultLocale}/contact.json`);
        setDict(fallback.default || fallback);
      }
    };
    loadTranslations();
  }, [locale]);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`${routes.AUTH.LOGIN}?redirect=${routes.CONTACT}`);
    }
  }, [user, authLoading, router, routes.AUTH.LOGIN, routes.CONTACT]);

  // フォーム表示時刻を記録
  useEffect(() => {
    setFormRenderedAt(Date.now());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inquiry_type: formData.type,
          order_number: formData.orderNumber.trim() || null,
          message: formData.message.trim(),
          website: formData.website,
          form_rendered_at: formRenderedAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(dict?.errors.rateLimited || 'Rate limited');
        }
        throw new Error(data.error?.message || data.message || dict?.errors.default);
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict?.errors.default || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ローディング
  if (authLoading || !user || !dict) {
    return (
      <div className="min-h-screen bg-[#FFFFF5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-bold">{dict?.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FFFFF5] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-[#7dff3a] border-4 border-black rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <Check size={48} strokeWidth={3} />
          </div>
          <h1
            className="text-5xl md:text-6xl font-black mb-4 uppercase tracking-wide text-black"
            style={{
              fontFamily: 'var(--font-anton), sans-serif',
              textShadow: '3px 3px 0px #7dff3a',
            }}
          >
            {dict.success.title}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {dict.success.message}<br />
            <span className="font-bold">{dict.success.replyTime}</span>{dict.success.replyText}
          </p>
          <Link
            href={routes.HOME}
            className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-black uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
          >
            <ArrowLeft size={20} strokeWidth={3} />
            {dict.success.backToHome}
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
            className="text-6xl md:text-8xl font-black tracking-wide mb-6 text-black"
            style={{
              fontFamily: 'var(--font-anton), sans-serif',
              textShadow: '4px 4px 0px #ff2d78',
            }}
          >
            {dict.hero.title}
          </h1>
          <p className="text-xl font-bold uppercase tracking-wider bg-black text-white px-6 py-3 inline-block border-3 border-black">
            {dict.hero.tagline}
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
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-3 border-red-500 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 font-bold text-sm">{error}</p>
                </div>
              )}

              {/* ハニーポット */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* ユーザー情報 */}
              <div className="mb-6 p-4 bg-gray-50 border-3 border-gray-300 rounded-xl">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                  {dict.form.loggedInAs}
                </p>
                <p className="font-bold text-black">{user.name || dict.form.nameNotSet}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>

              {/* お問い合わせ種別 */}
              <fieldset className="mb-6">
                <legend className="block font-black text-sm uppercase tracking-wider mb-3 text-black">
                  {dict.form.whatsUp} <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">{dict.form.required}</span>
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
                            : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                        }`}
                      >
                        <Icon size={16} strokeWidth={2.5} />
                        {dict.inquiryTypes[type.labelKey]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* 注文番号 */}
              <div className="mb-6">
                <label htmlFor="orderNumber" className="block font-black text-sm uppercase tracking-wider mb-2 text-black">
                  {dict.form.orderNumber} <span className="text-gray-400 font-normal">{dict.form.optional}</span>
                </label>
                <input
                  id="orderNumber"
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium text-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder={dict.form.orderPlaceholder}
                />
              </div>

              {/* メッセージ */}
              <div className="mb-8">
                <label htmlFor="message" className="block font-black text-sm uppercase tracking-wider mb-2 text-black">
                  {dict.form.message} <span className="text-[#ff2d78]" aria-hidden="true">*</span>
                  <span className="sr-only">{dict.form.required}</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  className="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-medium text-black resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                  placeholder={dict.form.messagePlaceholder}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {formData.message.length} / 5000
                </p>
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.type || formData.message.length < 10}
                className="w-full py-4 bg-black text-white font-black text-xl uppercase tracking-wider border-4 border-black rounded-xl shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] hover:shadow-[8px_8px_0px_0px_rgba(125,255,58,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[5px_5px_0px_0px_rgba(125,255,58,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {isSubmitting ? dict.form.sending : (
                  <>
                    {dict.form.sendMessage}
                    <ArrowRight size={24} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* サイドバー */}
          <aside className="lg:col-span-2 space-y-6">
            {/* 営業時間 */}
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
              <div className="flex items-center gap-3 mb-4">
                <Clock size={24} strokeWidth={2.5} />
                <h2 className="font-black text-lg uppercase tracking-wide">{dict.sidebar.hours.title}</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b-2 border-gray-200">
                  <span className="font-bold">{dict.sidebar.hours.weekdays}</span>
                  <span className="bg-black text-white px-3 py-1 font-bold rounded">{dict.sidebar.hours.weekdaysTime}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-gray-400">
                  <span className="font-bold">{dict.sidebar.hours.weekend}</span>
                  <span>{dict.sidebar.hours.closed}</span>
                </div>
              </div>
            </div>

            {/* レスポンス */}
            <div className="bg-[#7dff3a] border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3">
                <Zap size={28} strokeWidth={2.5} />
                <div>
                  <h2 className="font-black text-lg uppercase tracking-wide">{dict.sidebar.fastReply.title}</h2>
                  <p className="text-sm mt-1">
                    {dict.sidebar.fastReply.text}<span className="font-black text-xl mx-1">{dict.sidebar.fastReply.days}</span>{dict.sidebar.fastReply.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ誘導 */}
            <div className="bg-[#ffd93d] border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={24} strokeWidth={2.5} />
                <h2 className="font-black text-lg uppercase tracking-wide">{dict.sidebar.faq.title}</h2>
              </div>
              <p className="text-sm mb-4">
                {dict.sidebar.faq.text}
              </p>
              <Link
                href={routes.FAQ}
                className="inline-flex items-center gap-2 font-black text-sm uppercase hover:underline"
              >
                {dict.sidebar.faq.link}
                <ArrowRight size={16} strokeWidth={3} />
              </Link>
            </div>

            {/* SNS */}
            <div className="bg-[#323232] text-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="font-black text-lg uppercase mb-4 text-center">{dict.sidebar.social.title}</h2>
              <p className="text-sm text-center text-gray-300">
                {dict.sidebar.social.comingSoon}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
