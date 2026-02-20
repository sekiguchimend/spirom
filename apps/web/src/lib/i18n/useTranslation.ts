'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { type Locale, defaultLocale, isValidLocale } from './config';

// 翻訳ファイルを静的インポート
import jaAuth from '@/locales/ja/auth.json';
import enAuth from '@/locales/en/auth.json';
import zhAuth from '@/locales/zh/auth.json';
import koAuth from '@/locales/ko/auth.json';
import jaAccount from '@/locales/ja/account.json';
import enAccount from '@/locales/en/account.json';
import zhAccount from '@/locales/zh/account.json';
import koAccount from '@/locales/ko/account.json';
import jaCommon from '@/locales/ja/common.json';
import enCommon from '@/locales/en/common.json';
import zhCommon from '@/locales/zh/common.json';
import koCommon from '@/locales/ko/common.json';

type DictionaryType = 'auth' | 'account' | 'common';

const dictionaries: Record<Locale, Record<DictionaryType, Record<string, unknown>>> = {
  ja: {
    auth: jaAuth,
    account: jaAccount,
    common: jaCommon,
  },
  en: {
    auth: enAuth,
    account: enAccount,
    common: enCommon,
  },
  zh: {
    auth: zhAuth,
    account: zhAccount,
    common: zhCommon,
  },
  ko: {
    auth: koAuth,
    account: koAccount,
    common: koCommon,
  },
};

/**
 * ネストされたオブジェクトからドット記法でアクセス
 * 例: get(obj, 'login.title') -> obj.login.title
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // フォールバック: キーをそのまま返す
    }
  }

  return typeof result === 'string' ? result : path;
}

/**
 * クライアントコンポーネント用の翻訳フック
 */
export function useTranslation(namespace: DictionaryType) {
  const pathname = usePathname();

  const locale = useMemo(() => {
    const langFromPath = pathname?.split('/')[1];
    if (langFromPath && isValidLocale(langFromPath)) {
      return langFromPath;
    }
    return defaultLocale;
  }, [pathname]);

  const dictionary = useMemo(() => {
    return dictionaries[locale]?.[namespace] ?? dictionaries[defaultLocale][namespace];
  }, [locale, namespace]);

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(dictionary, key);

      // パラメータ置換
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }

      return value;
    };
  }, [dictionary]);

  return { t, locale };
}

/**
 * 現在の言語を取得するフック
 */
export function useLocale(): Locale {
  const pathname = usePathname();

  const locale = useMemo(() => {
    const langFromPath = pathname?.split('/')[1];
    if (langFromPath && isValidLocale(langFromPath)) {
      return langFromPath;
    }
    return defaultLocale;
  }, [pathname]);

  return locale;
}
