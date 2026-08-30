import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import type { MediaItem } from '../types/media';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  icon?: React.ReactNode;
  onOpenDetails?: (item: MediaItem) => void;
}

export default function MediaRow({ title, items, icon, onOpenDetails }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-8 px-4 sm:px-6 lg:px-8 relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h2>
        </div>
      </div>

      {/* Row Container with Navigation Arrows */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md border border-zinc-700/60 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-0"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Horizontal Scrolling Shelf */}
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1"
        >
          {items.map((item) => (
            <div key={item.id} className="w-36 sm:w-44 md:w-52 shrink-0">
              <MediaCard item={item} onOpenDetails={onOpenDetails} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-white flex items-center justify-center backdrop-blur-md border border-zinc-700/60 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}

