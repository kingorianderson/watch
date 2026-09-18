import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Layers,
  Sparkles,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { getFranchiseBySlug } from '../data/franchises';
import { tmdbService } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import MediaCard from '../components/MediaCard';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMetaTags } from '../hooks/useMetaTags';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const franchise = useMemo(() => (id ? getFranchiseBySlug(id) : undefined), [id]);

  usePageTitle(
    franchise
      ? `${franchise.name} - Chronological Watch Order`
      : 'Franchise Chronological Order'
  );

  useMetaTags({
    title: franchise ? `${franchise.name} - Chronological Watch Order` : 'Cinematic Universes',
    description: franchise?.description || 'Watch movies in their true chronological story order on WATCHD.',
    image: franchise?.backdropUrl || franchise?.posterUrl,
    url: window.location.href,
    type: 'website',
  });

  const [orderMode, setOrderMode] = useState<'chronological' | 'release'>('chronological');
  const [mediaMap, setMediaMap] = useState<Map<number, MediaItem>>(new Map());
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  // Fetch TMDB media details for all items in the franchise in parallel
  useEffect(() => {
    if (!franchise) return;
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const allItems = (franchise.phases || []).flatMap((p) => p.items || []);
    const uniqueItems = Array.from(new Map(allItems.map((item) => [item.tmdbId, item])).values());

    const fetchPromises = uniqueItems.map(async (item) => {
      try {
        if (item.type === 'tv') {
          return await tmdbService.getTvDetails(item.tmdbId);
        } else {
          return await tmdbService.getMovieDetails(item.tmdbId);
        }
      } catch {
        // Fallback placeholder item
        const fallback: MediaItem = {
          id: item.tmdbId,
          title: item.title,
          overview: item.chronologicalNote || 'Part of the franchise universe.',
          poster_path: null,
          backdrop_path: null,
          media_type: item.type,
          vote_average: 7.5,
          vote_count: 100,
          release_date: `${item.year}-01-01`,
        };
        return fallback;
      }
    });

    Promise.all(fetchPromises).then((results) => {
      if (!isMounted) return;
      const map = new Map<number, MediaItem>();
      results.forEach((res) => {
        if (res && res.id) {
          map.set(res.id, res);
        }
      });
      setMediaMap(map);
    });

    return () => {
      isMounted = false;
    };
  }, [franchise]);

  // Flattened items for sequence calculation & sorting
  const allChronologicalItems = useMemo(() => {
    if (!franchise) return [];
    return (franchise.phases || []).flatMap((p) =>
      (p.items || []).map((item) => ({
        ...item,
        phaseTitle: p.phaseTitle,
      }))
    );
  }, [franchise]);

  const releaseOrderedItems = useMemo(() => {
    return [...allChronologicalItems].sort((a, b) => {
      const yearDiff = a.year - b.year;
      if (yearDiff !== 0) return yearDiff;
      return a.order - b.order;
    });
  }, [allChronologicalItems]);

  if (!franchise) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-20 px-4 text-center max-w-lg mx-auto">
        <Layers className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Franchise Universe Not Found</h2>
        <p className="text-zinc-400 text-sm mb-6">
          The cinematic universe you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/collections"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Universes</span>
        </Link>
      </div>
    );
  }

  const firstItem = allChronologicalItems[0];
  const firstPlayUrl = firstItem
    ? `/watch/${firstItem.type}/${firstItem.tmdbId}`
    : '/collections';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Backdrop Banner */}
      <div className="relative w-full h-[450px] sm:h-[520px] overflow-hidden">
        <img
          src={franchise.backdropUrl}
          alt={franchise.name}
          className="w-full h-full object-cover object-top filter brightness-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />

        {/* Hero Content */}
        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 z-10">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/collections"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Universes</span>
            </Link>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase backdrop-blur-md bg-black/60 border border-white/10 text-white"
              style={{
                borderColor: franchise.accentColor ? `${franchise.accentColor}80` : undefined,
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Chronological Watch Order</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">
            {franchise.name}
          </h1>

          <p className="text-base sm:text-xl text-zinc-300 font-medium max-w-3xl mb-4 leading-relaxed">
            {franchise.tagline}
          </p>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl mb-6 line-clamp-3 leading-relaxed">
            {franchise.description}
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to={firstPlayUrl}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 transition"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start from Step #1</span>
            </Link>

            {/* Order Mode Toggle */}
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setOrderMode('chronological')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  orderMode === 'chronological'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Chronological Story
              </button>
              <button
                onClick={() => setOrderMode('release')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  orderMode === 'release'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Release Date
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Mode Notice Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              {orderMode === 'chronological'
                ? 'Showing titles ordered by in-universe timeline events and eras.'
                : 'Showing titles ordered by theatrical & television release dates.'}
            </span>
          </div>
          <span className="font-semibold text-zinc-200">
            {allChronologicalItems.length} Total Titles
          </span>
        </div>

        {/* Chronological View (Phased) */}
        {orderMode === 'chronological' ? (
          <div className="space-y-12">
            {(franchise.phases || []).map((phase, phaseIdx) => (
              <div key={phase.phaseTitle} className="space-y-6">
                {/* Phase Header */}
                <div className="border-b border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                      Phase {phaseIdx + 1}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {phase.phaseTitle}
                    </h2>
                  </div>
                  {phase.description && (
                    <p className="text-zinc-400 text-sm mt-1">{phase.description}</p>
                  )}
                </div>

                {/* Phase Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {(phase.items || []).map((item) => {
                    const media = mediaMap.get(item.tmdbId) || {
                      id: item.tmdbId,
                      title: item.title,
                      overview: item.chronologicalNote || '',
                      poster_path: null,
                      backdrop_path: null,
                      media_type: item.type,
                      vote_average: 8.0,
                      vote_count: 100,
                      release_date: `${item.year}-01-01`,
                    };

                    return (
                      <div key={item.tmdbId} className="relative flex flex-col space-y-2 group">
                        {/* Timeline Step Badge */}
                        <div className="flex items-center justify-between px-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Step #{item.order}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {item.year}
                          </span>
                        </div>

                        {/* Card Container */}
                        <div className="relative">
                          <MediaCard
                            item={media}
                            onSelect={(selected) => setModalItem(selected)}
                          />
                        </div>

                        {/* Chronological Note Snippet */}
                        {item.chronologicalNote && (
                          <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 line-clamp-1 group-hover:text-zinc-200 transition">
                            <span className="text-red-400 font-semibold">Note: </span>
                            {item.chronologicalNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Release Date Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {releaseOrderedItems.map((item, idx) => {
              const media = mediaMap.get(item.tmdbId) || {
                id: item.tmdbId,
                title: item.title,
                overview: item.chronologicalNote || '',
                poster_path: null,
                backdrop_path: null,
                media_type: item.type,
                vote_average: 8.0,
                vote_count: 100,
                release_date: `${item.year}-01-01`,
              };

              return (
                <div key={item.tmdbId} className="relative flex flex-col space-y-2 group">
                  <div className="flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400">
                      Release #{idx + 1}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">{item.year}</span>
                  </div>

                  <div className="relative">
                    <MediaCard
                      item={media}
                      onSelect={(selected) => setModalItem(selected)}
                    />
                  </div>

                  {item.chronologicalNote && (
                    <div className="px-2 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 line-clamp-1 group-hover:text-zinc-200 transition">
                      <span className="text-blue-400 font-semibold">Timeline: </span>
                      Step #{item.order}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Details Modal */}
      {modalItem && (
        <MediaDetailsModal
          item={modalItem}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}
