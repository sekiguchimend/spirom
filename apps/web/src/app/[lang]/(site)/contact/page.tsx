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
  Check,
  ArrowLeft,
  AlertCircle,
  Send,
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
    minChars: string;
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`${routes.AUTH.LOGIN}?redirect=${routes.CONTACT}`);
    }
  }, [user, authLoading, router, routes.AUTH.LOGIN, routes.CONTACT]);

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
        headers: { 'Content-Type': 'application/json' },
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

  if (authLoading || !user || !dict) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{dict?.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-dark mb-3">
            {dict.success.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {dict.success.message}<br />
            <span className="font-medium">{dict.success.replyTime}</span>{dict.success.replyText}
          </p>
          <Link
            href={routes.HOME}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            <ArrowLeft size={18} />
            {dict.success.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-dark mb-2">
            {dict.hero.title}
          </h1>
          <p className="text-gray-600">
            {dict.hero.tagline}
          </p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* ハニーポット */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* ユーザー情報 */}
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{dict.form.loggedInAs}</p>
              <p className="font-medium text-text-dark">{user.name || dict.form.nameNotSet}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            {/* お問い合わせ種別 */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-3">
                {dict.form.whatsUp} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {inquiryTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={16} />
                      {dict.inquiryTypes[type.labelKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 注文番号 */}
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-text-dark mb-2">
                {dict.form.orderNumber}
                <span className="text-gray-400 font-normal ml-1">({dict.form.optional})</span>
              </label>
              <input
                id="orderNumber"
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                maxLength={50}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder={dict.form.orderPlaceholder}
              />
            </div>

            {/* メッセージ */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-text-dark mb-2">
                {dict.form.message} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-text-dark placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder={dict.form.messagePlaceholder}
              />
              <div className="flex justify-between mt-1.5">
                <p className={`text-xs ${formData.message.length < 10 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {dict.form.minChars}
                </p>
                <p className="text-xs text-gray-400">
                  {formData.message.length} / 5000
                </p>
              </div>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.type || formData.message.length < 10}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {dict.form.sending}
                </>
              ) : (
                <>
                  <Send size={18} />
                  {dict.form.sendMessage}
                </>
              )}
            </button>
          </form>
        </div>

        {/* 補足情報 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            {dict.sidebar.fastReply.text}
            <span className="font-medium text-text-dark">{dict.sidebar.fastReply.days}{dict.sidebar.fastReply.unit}</span>
          </p>
          <p className="mt-2">
            <Link href={routes.FAQ} className="text-primary hover:underline">
              {dict.sidebar.faq.link}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
