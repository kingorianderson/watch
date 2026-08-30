import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Film, Tv, Trophy, Zap, Rocket, Sparkles, Smile, Ghost, History, Play } from 'lucide-react';
import { tmdbService, getPosterUrl } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import HeroBanner from '../components/HeroBanner';
import MediaRow from '../components/MediaRow';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { usePageTitle } from '../hooks/usePageTitle';

export default function HomePage() {
  usePageTitle('Home');
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTv, setPopularTv] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [sciFi, setSciFi] = useState<MediaItem[]>([]);
  const [animation, setAnimation] = useState<MediaItem[]>([]);
  const [comedy, setComedy] = useState<MediaItem[]>([]);
  const [horror, setHorror] = useState<MediaItem[]>([]);

  const [modalItem, setModalItem] = useState<MediaItem | null>(null);
  const { history } = useWatchHistory();

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [
          trendingData,
          popMoviesData,
          popTvData,
          topRatedData,
          actionData,
          sciFiData,
          animData,
          comedyData,
          horrorData,
        ] = await Promise.all([
          tmdbService.getTrending('all', 'day'),
          tmdbService.getPopularMovies(1),
          tmdbService.getPopularTv(1),
          tmdbService.getTopRatedMovies(1),
          tmdbService.getMoviesByGenre(28, 1),    // Action
          tmdbService.getMoviesByGenre(878, 1),   // Sci-Fi
          tmdbService.getMoviesByGenre(16, 1),    // Animation
          tmdbService.getMoviesByGenre(35, 1),    // Comedy
          tmdbService.getMoviesByGenre(27, 1),    // Horror
        ]);

        setTrending(trendingData);
        setPopularMovies(popMoviesData);
        setPopularTv(popTvData);
        setTopRated(topRatedData);
        setActionMovies(actionData);
        setSciFi(sciFiData);
        setAnimation(animData);
        setComedy(comedyData);
        setHorror(horrorData);
      } catch (err) {
        console.error('Failed to fetch home media', err);
      }
    }

    loadCatalog();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Hero Spotlight Carousel */}
      <HeroBanner items={trending} onOpenDetails={(item) => setModalItem(item)} />

      {/* Continue Watching Row (if user has watch history) */}
      {history.length > 0 && (
        <section className="mt-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Continue Watching
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {history.slice(0, 8).map((item) => {
              const url =
                item.type === 'tv'
                  ? `/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}`
                  : `/watch/movie/${item.id}`;

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={url}
                  className="w-48 sm:w-56 shrink-0 group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition"
                >
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={getPosterUrl(item.backdrop_path || item.poster_path, 'w500')}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-red-600/90 group-hover:bg-red-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-red-400 truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {item.type === 'tv'
                        ? `Season ${item.season || 1}, Episode ${item.episode || 1}`
                        : 'Movie'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Shelves */}
      <div className="space-y-2">
        <MediaRow
          title="Trending Today"
          items={trending}
          icon={<Flame className="w-5 h-5 text-red-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Popular Movies"
          items={popularMovies}
          icon={<Film className="w-5 h-5 text-amber-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Popular TV Series"
          items={popularTv}
          icon={<Tv className="w-5 h-5 text-blue-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Top Rated Classics"
          items={topRated}
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="High-Octane Action"
          items={actionMovies}
          icon={<Zap className="w-5 h-5 text-orange-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Sci-Fi & Cosmic Worlds"
          items={sciFi}
          icon={<Rocket className="w-5 h-5 text-purple-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Animation & Anime"
          items={animation}
          icon={<Sparkles className="w-5 h-5 text-pink-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Laugh-Out-Loud Comedy"
          items={comedy}
          icon={<Smile className="w-5 h-5 text-emerald-500" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
        <MediaRow
          title="Horror & Thrillers"
          items={horror}
          icon={<Ghost className="w-5 h-5 text-red-400" />}
          onOpenDetails={(item) => setModalItem(item)}
        />
      </div>

      {/* Details Pop-up Modal */}
      {modalItem && (
        <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}

