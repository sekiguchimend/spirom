import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  slug: string;
  name: string;
  price: number;
  image: string;
  tag?: 'NEW' | 'SALE' | 'HOT';
}

const tagStyles = {
  NEW: 'bg-[#629e5b] text-white', // ブランドカラー
  SALE: 'bg-[#ff6b6b] text-white', // ソフトな赤
  HOT: 'bg-[#ff9f43] text-white', // ソフトなオレンジ
};

export function ProductCard({ slug, name, price, image, tag }: ProductCardProps) {
  return (
    <article itemScope itemType="https://schema.org/Product" className="group">
      <Link href={`/products/${slug}`} className="block relative">
        <div className="relative aspect-[3/4] bg-white border-3 border-black rounded-xl overflow-hidden mb-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-all duration-200">
          <Image
            src={image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {tag && (
            <span className={`absolute top-3 left-3 px-3 py-1.5 text-xs font-black border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider ${tagStyles[tag]}`}>
              {tag}
            </span>
          )}
        </div>
        <div className="pl-1">
          <h3 className="text-base font-bold text-black truncate" itemProp="name">{name}</h3>
          <p className="text-lg font-black text-black mt-1">¥{price.toLocaleString()}</p>
        </div>
      </Link>
    </article>
  );
}
