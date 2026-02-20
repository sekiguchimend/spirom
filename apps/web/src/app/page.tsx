import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n/config';

/**
 * Root page redirect
 * ミドルウェアでリダイレクトされなかった場合のフォールバック
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
