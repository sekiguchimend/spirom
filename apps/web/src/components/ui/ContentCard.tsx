import Link from 'next/link';
import Image from 'next/image';

interface ContentCardProps {
  href: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  category?: string;
  tagColor?: 'green' | 'pink' | 'orange' | 'blue';
}

const tagColors = {
  green: 'bg-[#7dff3a] text-black',
  pink: 'bg-[#ff2d78] text-white',
  orange: 'bg-[#ff9500] text-black',
  blue: 'bg-[#00d4ff] text-black',
};

export function ContentCard({ href, title, description, image, date, category, tagColor = 'green' }: ContentCardProps) {
  return (
    <article className="group">
      <Link href={href} className="block">
        <div className="relative bg-white border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200">
          {image && (
            <figure className="relative aspect-[16/9] bg-gray-100 border-b-3 border-black overflow-hidden">
              <Image
                src={image}
                alt=""
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
              />
              {category && (
                <span className={`absolute top-3 left-3 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${tagColors[tagColor]}`}>
                  {category}
                </span>
              )}
            </figure>
          )}
          <div className="p-4">
            {date && (
              <time className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                {date}
              </time>
            )}
            <h3 className="text-base font-black text-black uppercase tracking-tight leading-tight mb-1.5">
              {title}
            </h3>
            {description && (
              <p className="text-gray-500 text-xs font-medium line-clamp-2">
                {description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-black font-black text-[10px] uppercase tracking-widest">
              <span>Read More</span>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform">
                <path d="M2 6h8M6 2l4 4-4 4"/>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
