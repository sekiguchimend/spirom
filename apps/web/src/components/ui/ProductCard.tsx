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
  NEW: 'bg-[#7dff3a] text-black',
  SALE: 'bg-[#ff2d78] text-white',
  HOT: 'bg-[#ff9500] text-black',
};

export function ProductCard({ slug, name, price, image, tag }: ProductCardProps) {
  return (
    <article itemScope itemType="https://schema.org/Product" className="group">
      <Link href={`/products/${slug}`} className="block">
        <div className="relative bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200">
          <figure className="relative aspect-[3/4] bg-gray-50 border-b-4 border-black overflow-hidden">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            {tag && (
              <span className={`absolute top-3 left-3 px-3 py-1.5 text-xs font-black border-3 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider ${tagStyles[tag]}`}>
                {tag}
              </span>
            )}
          </figure>
          <div className="p-4">
            <h3 className="text-sm font-black text-black uppercase tracking-tight truncate" itemProp="name">
              {name}
            </h3>
            <p className="text-lg font-black text-black mt-1">
              ¥{price.toLocaleString()}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
