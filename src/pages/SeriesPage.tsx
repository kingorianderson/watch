import { useState, useEffect } from 'react';
import { Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import { tmdbService } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import MediaCard from '../components/MediaCard';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { usePageTitle } from '../hooks/usePageTitle';

const TV_GENRES = [
  { id: 'all', name: 'All Genres' },
  { id: '10759', name: 'Action & Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '10762', name: 'Kids' },
  { id: '9648', name: 'Mystery' },
  { id: '10765', name: 'Sci-Fi & Fantasy' },
];

const YEARS = ['all', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015', '2010'];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'first_air_date.desc', label: 'Recently Aired' },
];

export default function SeriesPage() {
  usePageTitle('TV Series');
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [genre, setGenre] = useState('all');
  const [year, setYear] = useState('all');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    async function loadSeries() {
      setLoading(true);
      try {
        const { results, totalPages: pages } = await tmdbService.discover('tv', {
          genre,
          year,
          sortBy,
          page,
        });
        setSeries(results);
        setTotalPages(pages);
      } catch (err) {
        console.error('Failed to load series', err);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [genre, year, sortBy, page]);

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-red-500" />
            <h1 className="text-3xl font-black tracking-tight text-white m-0">TV Series & Shows</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Stream popular TV series, anime, and dramas with all seasons and episodes.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre */}
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              handleFilterChange();
            }}
            className="bg-zinc-900 text-sm font-medium text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500"
          >
            {TV_GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Year */}
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              handleFilterChange();
            }}
            className="bg-zinc-900 text-sm font-medium text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Years</option>
            {YEARS.filter((y) => y !== 'all').map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              handleFilterChange();
            }}
            className="bg-zinc-900 text-sm font-medium text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-red-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Series Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {series.map((show) => (
            <MediaCard key={show.id} item={show} onOpenDetails={(item) => setModalItem(item)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 pt-8">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <span className="text-sm font-medium text-zinc-400">
          Page <strong className="text-white">{page}</strong> of {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal */}
      {modalItem && (
        <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}

