import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Film, ArrowRight, Search, Sparkles, Compass } from 'lucide-react';
import { FRANCHISES } from '../data/franchises';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMetaTags } from '../hooks/useMetaTags';

export default function CollectionsPage() {
  usePageTitle('Cinematic Universes & Franchise Collections');

  useMetaTags({
    title: 'Cinematic Universes & Franchise Collections',
    description: 'Explore the greatest sagas, comic universes, and epic trilogies in chronological in-universe watch order on WATCHD.',
    image: FRANCHISES[0]?.backdropUrl,
    url: window.location.href,
    type: 'website',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredFranchises = useMemo(() => {
    if (!searchQuery.trim()) return FRANCHISES;
    const query = searchQuery.toLowerCase();
    return FRANCHISES.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.tagline.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const totalMoviesCount = useMemo(() => {
    return FRANCHISES.reduce((total, f) => {
      const universeTotal = (f.phases || []).reduce(
        (subTotal, p) => subTotal + (p.items?.length || 0),
        0
      );
      return total + universeTotal;
    }, 0);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-red-950/40 border border-zinc-800/80 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Watch Orders</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Cinematic Universes &amp; Franchises
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            Experience Hollywood’s greatest sagas, comic universes, and epic trilogies in their true
            chronological in-universe storyline order.
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-zinc-200">{FRANCHISES.length}</span> Universes
            </div>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-zinc-200">{totalMoviesCount}+</span> Curated Titles
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-red-400" />
              <span>Story &amp; Release Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search universe (e.g. Marvel, Star Wars)..."
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
        </div>

        <p className="text-xs text-zinc-500 font-medium self-end sm:self-center">
          Showing {filteredFranchises.length} of {FRANCHISES.length} universes
        </p>
      </div>

      {/* Universe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {filteredFranchises.map((universe) => {
          const itemCount = (universe.phases || []).reduce(
            (acc, p) => acc + (p.items?.length || 0),
            0
          );
          const phaseCount = universe.phases?.length || 0;

          return (
            <Link
              key={universe.id}
              to={`/collection/${universe.slug}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-red-600/10 hover:-translate-y-1"
            >
              {/* Card Backdrop Header */}
              <div className="relative h-60 w-full overflow-hidden">
                <img
                  src={universe.backdropUrl}
                  alt={universe.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-black/60 border border-white/10 text-white shadow-lg"
                    style={{
                      borderColor: universe.accentColor ? `${universe.accentColor}60` : undefined,
                    }}
                  >
                    {itemCount} Titles
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900/80 backdrop-blur-md border border-zinc-700 text-zinc-300">
                    {phaseCount} {phaseCount === 1 ? 'Phase' : 'Phases / Eras'}
                  </span>
                </div>

                {/* Poster Thumbnail Overlap */}
                <div className="absolute bottom-4 left-6 flex items-end gap-4">
                  <img
                    src={universe.posterUrl}
                    alt={universe.name}
                    className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg object-cover shadow-2xl border-2 border-zinc-700/80 shrink-0 group-hover:border-red-500 transition duration-300"
                  />
                  <div className="pb-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                      {universe.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-300 line-clamp-1 font-medium">
                      {universe.tagline}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 pt-4 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-zinc-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                  {universe.description}
                </p>

                {/* Teaser Phase Preview */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Watch Highlights</span>
                    <span className="text-red-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      View Watch Order <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {universe.phases?.[0]?.items?.slice(0, 3).map((item) => (
                      <span
                        key={item.tmdbId}
                        className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-300 truncate max-w-[200px]"
                      >
                        {item.title} ({item.year})
                      </span>
                    ))}
                    {(universe.phases?.[0]?.items?.length || 0) > 3 && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[11px] text-zinc-500">
                        +more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredFranchises.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300">No franchises found</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Try searching for &quot;Marvel&quot;, &quot;Star Wars&quot;, &quot;Potter&quot;, or &quot;Batman&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
