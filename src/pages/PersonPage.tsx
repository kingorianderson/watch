import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Film,
  Tv,
  Award,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { tmdbService, getProfileUrl } from '../services/tmdb';
import type { PersonDetails, PersonCombinedCredits, MediaItem } from '../types/media';
import MediaCard from '../components/MediaCard';
import MediaDetailsModal from '../components/MediaDetailsModal';
import { usePageTitle } from '../hooks/usePageTitle';
import { useMetaTags } from '../hooks/useMetaTags';

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<PersonCombinedCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'tv' | 'crew'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'date'>('popularity');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [modalItem, setModalItem] = useState<MediaItem | null>(null);

  usePageTitle(person ? `${person.name} - Movies & Filmography` : 'Actor Filmography');

  useMetaTags({
    title: person ? `${person.name} - Movies & Filmography` : 'Actor Filmography',
    description: person?.biography
      ? person.biography.slice(0, 160) + '...'
      : 'Explore movies, TV series, and filmography timeline on WATCHD.',
    image: person?.profile_path ? getProfileUrl(person.profile_path) : undefined,
    url: window.location.href,
    type: 'profile',
  });

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Promise.all([
      tmdbService.getPersonDetails(id),
      tmdbService.getPersonCombinedCredits(id),
    ])
      .then(([personData, creditsData]) => {
        if (!isMounted) return;
        setPerson(personData);
        setCredits(creditsData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch person details:', err);
        setError('Could not load filmography details. Please try again.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Compute filtered and sorted credits
  const filteredCredits = useMemo(() => {
    if (!credits) return [];

    let list: (MediaItem & { character?: string; job?: string })[] = [];

    if (activeTab === 'movies') {
      list = credits.cast.filter((item) => item.media_type === 'movie');
    } else if (activeTab === 'tv') {
      list = credits.cast.filter((item) => item.media_type === 'tv');
    } else if (activeTab === 'crew') {
      list = credits.crew;
    } else {
      // 'all': deduplicate items that appear in multiple roles
      const map = new Map<string, MediaItem>();
      for (const item of [...credits.cast, ...credits.crew]) {
        const key = `${item.media_type}_${item.id}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      }
      list = Array.from(map.values());
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'date') {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      }
      return (b.vote_count || 0) - (a.vote_count || 0); // Popularity proxy
    });
  }, [credits, activeTab, sortBy]);

  // Top Known For Highlights
  const topKnownFor = useMemo(() => {
    if (!credits?.cast) return [];
    const sorted = [...credits.cast]
      .filter((i) => (i.vote_count || 0) > 100)
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    return sorted.slice(0, 6);
  }, [credits]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pt-28 pb-20 flex flex-col items-center justify-center">
        <div className="w-14 h-14 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Loading filmography...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white pt-28 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-red-500">Person Not Found</h2>
          <p className="text-zinc-400 text-sm">{error || 'Could not find details for this person.'}</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate age if birthday is present
  const birthYear = person.birthday ? new Date(person.birthday).getFullYear() : null;
  const currentYear = new Date().getFullYear();
  const age = birthYear ? (person.deathday ? new Date(person.deathday).getFullYear() - birthYear : currentYear - birthYear) : null;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-24 sm:pt-28 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Navigation & Breadcrumb Header */}
        <div className="flex items-center gap-3 py-1 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition active:scale-95 cursor-pointer shadow-md shrink-0"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 font-medium">
            <Link to="/" className="hover:text-white transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-zinc-500">People</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span className="text-zinc-200 font-semibold truncate">{person.name}</span>
          </div>
        </div>

        {/* Hero Profile Section */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
            {/* Profile Headshot */}
            <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-72 rounded-2xl overflow-hidden bg-zinc-950 border-2 border-zinc-700/80 shadow-2xl shrink-0 mx-auto md:mx-0">
              <img
                src={getProfileUrl(person.profile_path)}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile Bio & Facts */}
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                    {person.known_for_department || 'Artist'}
                  </span>
                  {person.imdb_id && (
                    <a
                      href={`https://www.imdb.com/name/${person.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/30 transition"
                    >
                      <span>IMDb</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {person.name}
                </h1>
              </div>

              {/* Quick Info Grid */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-300">
                {person.birthday && (
                  <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/50">
                    <Calendar className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      {person.birthday} {age ? `(${age} yrs)` : ''}
                    </span>
                  </div>
                )}
                {person.place_of_birth && (
                  <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/50">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate max-w-xs">{person.place_of_birth}</span>
                  </div>
                )}
                {credits?.cast && (
                  <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/50">
                    <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{credits.cast.length} Titles</span>
                  </div>
                )}
              </div>

              {/* Biography */}
              {person.biography && (
                <div className="space-y-2 pt-2">
                  <p
                    className={`text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl transition-all duration-300 ${
                      !isBioExpanded ? 'line-clamp-4' : ''
                    }`}
                  >
                    {person.biography}
                  </p>
                  {person.biography.length > 300 && (
                    <button
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>{isBioExpanded ? 'Read Less' : 'Read Full Biography'}</span>
                      {isBioExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Known For Shelf */}
        {topKnownFor.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Blockbusters &amp; Known For</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topKnownFor.map((item) => (
                <MediaCard
                  key={`known-${item.media_type}-${item.id}`}
                  item={item}
                  onOpenDetails={(i) => setModalItem(i)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filmography Filter & Sort Toolbar */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                All Credits ({credits ? credits.cast.length + credits.crew.length : 0})
              </button>

              <button
                onClick={() => setActiveTab('movies')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'movies'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Movies ({credits?.cast.filter((c) => c.media_type === 'movie').length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('tv')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tv'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Series ({credits?.cast.filter((c) => c.media_type === 'tv').length || 0})</span>
              </button>

              {credits?.crew && credits.crew.length > 0 && (
                <button
                  onClick={() => setActiveTab('crew')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === 'crew'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  Directing &amp; Crew ({credits.crew.length})
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-zinc-700"
              >
                <option value="popularity">Sort by Popularity</option>
                <option value="rating">Sort by Highest Rating</option>
                <option value="date">Sort by Release Date</option>
              </select>
            </div>
          </div>

          {/* Filmography Grid */}
          {filteredCredits.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredCredits.map((item) => (
                <MediaCard
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  onOpenDetails={(i) => setModalItem(i)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <Film className="w-12 h-12 mx-auto text-zinc-700" />
              <p className="text-sm">No titles found in this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <MediaDetailsModal item={modalItem} onClose={() => setModalItem(null)} />
    </div>
  );
}
