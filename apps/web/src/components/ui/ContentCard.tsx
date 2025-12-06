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
        <div className="relative bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all duration-200">
          {image && (
            <figure className="relative aspect-[16/10] bg-gray-100 border-b-4 border-black overflow-hidden">
              <Image
                src={image}
                alt=""
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {category && (
                <span className={`absolute top-4 left-4 px-4 py-2 text-xs font-black uppercase tracking-wider border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${tagColors[tagColor]}`}>
                  {category}
                </span>
              )}
            </figure>
          )}
          <div className="p-5">
            {date && (
              <time className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                {date}
              </time>
            )}
            <h3 className="text-lg font-black text-black uppercase tracking-tight leading-tight mb-2">
              {title}
            </h3>
            {description && (
              <p className="text-gray-500 text-sm font-medium line-clamp-2">
                {description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 text-black font-black text-xs uppercase tracking-widest">
              <span>Read More</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform">
                <path d="M3 7h8M7 3l4 4-4 4"/>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
