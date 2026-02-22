/**
 * 国リスト（送料計算用）
 * コードはISO 3166-1 alpha-2
 * 地帯区分は日本郵便EMSに基づく
 */

import type { ShippingRegion } from '@/lib/i18n/geo';

export interface Country {
  code: string;
  name: {
    ja: string;
    en: string;
    zh: string;
    ko: string;
  };
  region: ShippingRegion;
}

export const COUNTRIES: Country[] = [
  // 国内
  { code: 'JP', name: { ja: '日本', en: 'Japan', zh: '日本', ko: '일본' }, region: 'domestic' },

  // 第1地帯: 東アジア（中国・韓国・台湾・香港）
  { code: 'CN', name: { ja: '中国', en: 'China', zh: '中国', ko: '중국' }, region: 'zone1_east_asia' },
  { code: 'KR', name: { ja: '韓国', en: 'South Korea', zh: '韩国', ko: '한국' }, region: 'zone1_east_asia' },
  { code: 'TW', name: { ja: '台湾', en: 'Taiwan', zh: '台湾', ko: '대만' }, region: 'zone1_east_asia' },
  { code: 'HK', name: { ja: '香港', en: 'Hong Kong', zh: '香港', ko: '홍콩' }, region: 'zone1_east_asia' },

  // 第2地帯: その他アジア
  { code: 'SG', name: { ja: 'シンガポール', en: 'Singapore', zh: '新加坡', ko: '싱가포르' }, region: 'zone2_asia' },
  { code: 'TH', name: { ja: 'タイ', en: 'Thailand', zh: '泰国', ko: '태국' }, region: 'zone2_asia' },
  { code: 'MY', name: { ja: 'マレーシア', en: 'Malaysia', zh: '马来西亚', ko: '말레이시아' }, region: 'zone2_asia' },
  { code: 'ID', name: { ja: 'インドネシア', en: 'Indonesia', zh: '印度尼西亚', ko: '인도네시아' }, region: 'zone2_asia' },
  { code: 'PH', name: { ja: 'フィリピン', en: 'Philippines', zh: '菲律宾', ko: '필리핀' }, region: 'zone2_asia' },
  { code: 'VN', name: { ja: 'ベトナム', en: 'Vietnam', zh: '越南', ko: '베트남' }, region: 'zone2_asia' },
  { code: 'IN', name: { ja: 'インド', en: 'India', zh: '印度', ko: '인도' }, region: 'zone2_asia' },

  // 第4地帯: アメリカ
  { code: 'US', name: { ja: 'アメリカ', en: 'United States', zh: '美国', ko: '미국' }, region: 'zone4_usa' },

  // 第3地帯: ヨーロッパ・オセアニア・カナダ・中近東
  { code: 'AU', name: { ja: 'オーストラリア', en: 'Australia', zh: '澳大利亚', ko: '호주' }, region: 'zone3' },
  { code: 'NZ', name: { ja: 'ニュージーランド', en: 'New Zealand', zh: '新西兰', ko: '뉴질랜드' }, region: 'zone3' },
  { code: 'CA', name: { ja: 'カナダ', en: 'Canada', zh: '加拿大', ko: '캐나다' }, region: 'zone3' },
  { code: 'MX', name: { ja: 'メキシコ', en: 'Mexico', zh: '墨西哥', ko: '멕시코' }, region: 'zone3' },
  { code: 'GB', name: { ja: 'イギリス', en: 'United Kingdom', zh: '英国', ko: '영국' }, region: 'zone3' },
  { code: 'DE', name: { ja: 'ドイツ', en: 'Germany', zh: '德国', ko: '독일' }, region: 'zone3' },
  { code: 'FR', name: { ja: 'フランス', en: 'France', zh: '法国', ko: '프랑스' }, region: 'zone3' },
  { code: 'IT', name: { ja: 'イタリア', en: 'Italy', zh: '意大利', ko: '이탈리아' }, region: 'zone3' },
  { code: 'ES', name: { ja: 'スペイン', en: 'Spain', zh: '西班牙', ko: '스페인' }, region: 'zone3' },
  { code: 'NL', name: { ja: 'オランダ', en: 'Netherlands', zh: '荷兰', ko: '네덜란드' }, region: 'zone3' },
  { code: 'BE', name: { ja: 'ベルギー', en: 'Belgium', zh: '比利时', ko: '벨기에' }, region: 'zone3' },
  { code: 'AT', name: { ja: 'オーストリア', en: 'Austria', zh: '奥地利', ko: '오스트리아' }, region: 'zone3' },
  { code: 'CH', name: { ja: 'スイス', en: 'Switzerland', zh: '瑞士', ko: '스위스' }, region: 'zone3' },
  { code: 'SE', name: { ja: 'スウェーデン', en: 'Sweden', zh: '瑞典', ko: '스웨덴' }, region: 'zone3' },
  { code: 'NO', name: { ja: 'ノルウェー', en: 'Norway', zh: '挪威', ko: '노르웨이' }, region: 'zone3' },
  { code: 'DK', name: { ja: 'デンマーク', en: 'Denmark', zh: '丹麦', ko: '덴마크' }, region: 'zone3' },
  { code: 'FI', name: { ja: 'フィンランド', en: 'Finland', zh: '芬兰', ko: '핀란드' }, region: 'zone3' },
  { code: 'IE', name: { ja: 'アイルランド', en: 'Ireland', zh: '爱尔兰', ko: '아일랜드' }, region: 'zone3' },
  { code: 'PT', name: { ja: 'ポルトガル', en: 'Portugal', zh: '葡萄牙', ko: '포르투갈' }, region: 'zone3' },
  { code: 'PL', name: { ja: 'ポーランド', en: 'Poland', zh: '波兰', ko: '폴란드' }, region: 'zone3' },
  { code: 'AE', name: { ja: 'アラブ首長国連邦', en: 'United Arab Emirates', zh: '阿联酋', ko: '아랍에미리트' }, region: 'zone3' },

  // 第5地帯: 南米・アフリカ等（その他）
  { code: 'BR', name: { ja: 'ブラジル', en: 'Brazil', zh: '巴西', ko: '브라질' }, region: 'zone5' },
];

/**
 * 国コードから国情報を取得
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

/**
 * ロケールに応じた国名を取得
 */
export function getCountryName(code: string, locale: string): string {
  const country = getCountryByCode(code);
  if (!country) return code;

  const lang = locale as keyof Country['name'];
  return country.name[lang] || country.name.en;
}
