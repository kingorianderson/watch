import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Compass } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import MediaCard from '../components/MediaCard';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  usePageTitle(query ? `Search "${query}"` : 'Explore');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function doSearch() {
      try {
        const data = await tmdbService.searchMulti(query);
        if (isMounted) {
          setResults(data);
        }
      } catch (err) {
        console.error('Explore search failed', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    doSearch();

    return () => {
      isMounted = false;
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-6">
        <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white m-0">
            {query ? `Search Results for "${query}"` : 'Explore & Search'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {results.length} results found matching your query.
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {results.map((item) => (
            <MediaCard key={item.id} item={item} onOpenDetails={(item) => setModalItem(item)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-4">
          <Compass className="w-16 h-16 text-zinc-700 mx-auto animate-bounce" />
          <h3 className="text-xl font-bold text-zinc-300">No matching titles found</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Try searching for a different movie title, TV show, actor name, or franchise.
          </p>
        </div>
      )}

      {/* Modal */}
      {modalItem && (
        <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}

