import Link from 'next/link';
import Image from 'next/image';

interface ContentCardProps {
  href: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  category?: string;
}

export function ContentCard({ href, title, description, image, date, category }: ContentCardProps) {
  return (
    <article className="group">
      <Link href={href} className="block">
        {image && (
          <div className="relative aspect-[16/9] bg-white border-3 border-black rounded-xl overflow-hidden mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-all duration-200">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {category && (
              <span className="absolute top-3 left-3 px-3 py-1.5 text-xs font-black bg-[#629e5b] text-white border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                {category}
              </span>
            )}
          </div>
        )}
        <div className="px-2">
          {date && (
            <time className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              {date}
            </time>
          )}
          <h3 className="text-xl font-black text-black mb-2 leading-tight group-hover:text-[#446e87] transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 font-medium line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

