'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createLocalizedRoutes } from '@/lib/routes';
import { type Locale, defaultLocale } from '@/lib/i18n/config';

interface ProductCardProps {
  slug: string;
  name: string;
  price: number;
  image: string;
  tag?: 'NEW' | 'SALE' | 'HOT';
}

const tagStyles = {
  NEW: 'bg-[#7dff3a] text-black',
  SALE: 'bg-[#ff2d78] text-white',
  HOT: 'bg-[#ff9500] text-black',
};

export function ProductCard({ slug, name, price, image, tag }: ProductCardProps) {
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] as Locale) || defaultLocale;
  const routes = createLocalizedRoutes(locale);

  return (
    <article itemScope itemType="https://schema.org/Product" className="group">
      <Link href={routes.PRODUCTS.DETAIL(slug)} className="block">
        <div className="relative bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
          <figure className="relative aspect-square bg-gray-50 border-b-4 border-black overflow-hidden">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 40vw, 20vw"
              loading="lazy"
            />
            {tag && (
              <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider ${tagStyles[tag]}`}>
                {tag}
              </span>
            )}
          </figure>
          <div className="p-3">
            <h3 className="text-xs font-black text-black uppercase tracking-tight truncate" itemProp="name">
              {name}
            </h3>
            <p className="text-base font-black text-black mt-1">
              ¥{price.toLocaleString()}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
