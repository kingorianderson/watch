import { useState, useMemo } from 'react';
import {
  Trophy,
  Play,
  Radio,
  Clock,
  MapPin,
  RefreshCw,
  Server,
  Zap,
  ExternalLink,
  ShieldAlert,
  Tv,
} from 'lucide-react';
import { sportsService, SPORTS_MATCHES } from '../services/sportsService';
import type { SportsMatch, TournamentType, MatchStatus, SportsStream } from '../types/sports';
import { usePageTitle } from '../hooks/usePageTitle';

const TOURNAMENT_TABS: { id: TournamentType; name: string; icon: string }[] = [
  { id: 'All', name: 'All Sports', icon: '🌍' },
  { id: 'EPL', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'UCL', name: 'Champions League', icon: '🏆' },
  { id: 'La Liga', name: 'La Liga', icon: '🇪🇸' },
  { id: 'Serie A', name: 'Serie A', icon: '🇮🇹' },
  { id: 'F1', name: 'Formula 1', icon: '🏎️' },
  { id: 'UFC', name: 'UFC / MMA', icon: '🥊' },
];

export default function SportsPage() {
  usePageTitle('Live Sports 🔴 EPL, UCL, La Liga, F1 & UFC Streams');

  const [selectedTournament, setSelectedTournament] = useState<TournamentType>('All');
  const [selectedStatus, setSelectedStatus] = useState<MatchStatus | 'all'>('all');
  const [activeMatch, setActiveMatch] = useState<SportsMatch | null>(null);
  const [activeStream, setActiveStream] = useState<SportsStream | null>(null);
  const [playerKey, setPlayerKey] = useState<number>(0);

  const liveMatchesCount = useMemo(() => sportsService.getLiveCount(), []);

  const filteredMatches = useMemo(() => {
    return sportsService.getMatches(selectedTournament, selectedStatus);
  }, [selectedTournament, selectedStatus]);

  // Featured marquee game
  const featuredMatch = useMemo(() => {
    return SPORTS_MATCHES.find((m) => m.isLive) || SPORTS_MATCHES[0];
  }, []);

  const handleWatchMatch = (match: SportsMatch, streamIndex = 0) => {
    setActiveMatch(match);
    setActiveStream(match.streams[streamIndex] || match.streams[0]);
    setPlayerKey((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClosePlayer = () => {
    setActiveMatch(null);
    setActiveStream(null);
  };

  const handleReloadStream = () => {
    setPlayerKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Active Theater Player Container when a match is opened */}
        {activeMatch && activeStream && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Player Breadcrumb / Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeMatch.tournamentIcon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                      {activeMatch.tournamentName}
                    </span>
                    {activeMatch.isLive ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[10px] font-bold font-mono border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE NOW</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                        {activeMatch.matchTime}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {activeMatch.homeTeam} {activeMatch.score ? `${activeMatch.score.home} - ${activeMatch.score.away}` : 'vs'} {activeMatch.awayTeam}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReloadStream}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-zinc-700"
                  title="Reload Live Feed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Feed</span>
                </button>
                <button
                  onClick={handleClosePlayer}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold transition cursor-pointer border border-red-500/30"
                >
                  ✕ Close Theater
                </button>
              </div>
            </div>

            {/* Video Player Frame */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 ring-1 ring-zinc-800/50">
              <iframe
                key={playerKey}
                src={activeStream.embedUrl}
                title={`${activeMatch.homeTeam} vs ${activeMatch.awayTeam} Live Stream`}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="origin"
              />
            </div>

            {/* Stream Server Switching & High-Performance Bar */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-2 uppercase tracking-wider">
                  <Server className="w-4 h-4 text-red-500" />
                  <span>Live Feeds:</span>
                </div>

                {activeMatch.streams.map((stream, idx) => {
                  const isSelected = activeStream.id === stream.id;
                  return (
                    <button
                      key={stream.id}
                      onClick={() => {
                        setActiveStream(stream);
                        setPlayerKey((prev) => prev + 1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/50'
                      }`}
                    >
                      <span>{stream.name || `Stream ${idx + 1}`}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-red-700 text-red-100' : 'bg-zinc-950 text-zinc-400'
                        }`}
                      >
                        {stream.quality}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* VPN Booster tip banner for sports */}
              <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Sports streams work best with a secure, low-latency connection. If buffering occurs, select another server above.
                  </span>
                </div>
                <a
                  href={import.meta.env.VITE_VPN_AFFILIATE_URL || 'https://www.profitableratecpmnetwork.com/tmu3is0wf5?key=21a1ec5aea498f026813fc3a521b1af3'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 shrink-0 transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Boost Stream Speed</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Featured Big Match Hero (Show when not in active player mode) */}
        {!activeMatch && featuredMatch && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-red-950/40 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>MARQUEE MATCH OF THE DAY</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1">
                    <span>{featuredMatch.tournamentIcon}</span>
                    <span>{featuredMatch.tournamentName}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={featuredMatch.homeLogo}
                      alt={featuredMatch.homeTeam}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-md"
                    />
                    <span className="text-xl sm:text-3xl font-black text-white">{featuredMatch.homeTeam}</span>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                    {featuredMatch.score ? (
                      <span className="text-lg sm:text-2xl font-black text-red-500 font-mono">
                        {featuredMatch.score.home} : {featuredMatch.score.away}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-zinc-400 font-mono">VS</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={featuredMatch.awayLogo}
                      alt={featuredMatch.awayTeam}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-contain filter drop-shadow-md"
                    />
                    <span className="text-xl sm:text-3xl font-black text-white">{featuredMatch.awayTeam}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {featuredMatch.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                  {featuredMatch.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>{featuredMatch.venue}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{featuredMatch.matchTime}</span>
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full lg:w-auto">
                <button
                  onClick={() => handleWatchMatch(featuredMatch)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition duration-200 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>WATCH LIVE IN 1080P 60FPS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Header & Tournament Filter Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-red-500" />
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Live Sports Stadium
                </h1>
                {liveMatchesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 text-xs font-mono font-bold border border-red-500/30 flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse text-red-500" />
                    <span>{liveMatchesCount} LIVE</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Stream Premier League, Champions League, La Liga, Serie A, F1 races & UFC fight cards with zero lag.
              </p>
            </div>

            {/* Status Filter Tabs (All / Live / Upcoming) */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 self-start">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Fixtures
              </button>
              <button
                onClick={() => setSelectedStatus('live')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedStatus === 'live'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Live Now</span>
              </button>
              <button
                onClick={() => setSelectedStatus('upcoming')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedStatus === 'upcoming'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Upcoming ⏰
              </button>
            </div>
          </div>

          {/* Tournament Pill Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
            {TOURNAMENT_TABS.map((tab) => {
              const isActive = selectedTournament === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTournament(tab.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-500/50'
                      : 'bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fixtures Match Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between group"
            >
              {/* Card Header: Tournament & Live Status */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{match.tournamentIcon}</span>
                  <span className="text-xs font-bold text-zinc-300">{match.tournamentName}</span>
                </div>

                {match.isLive ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 text-xs font-bold font-mono border border-red-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span>{match.statusText}</span>
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium text-zinc-400 px-2 py-0.5 rounded-lg bg-zinc-800/80">
                    {match.matchDate} • {match.matchTime}
                  </span>
                )}
              </div>

              {/* Match Teams / Contenders */}
              <div className="space-y-3 my-2">
                {/* Home Team */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={match.homeLogo}
                      alt={match.homeTeam}
                      className="w-8 h-8 object-contain bg-zinc-950/60 p-1 rounded-lg border border-zinc-800"
                    />
                    <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      {match.homeTeam}
                    </span>
                  </div>
                  {match.score && (
                    <span className="text-base font-black text-white font-mono bg-zinc-950 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                      {match.score.home}
                    </span>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={match.awayLogo}
                      alt={match.awayTeam}
                      className="w-8 h-8 object-contain bg-zinc-950/60 p-1 rounded-lg border border-zinc-800"
                    />
                    <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      {match.awayTeam}
                    </span>
                  </div>
                  {match.score && (
                    <span className="text-base font-black text-white font-mono bg-zinc-950 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                      {match.score.away}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Info & CTA */}
              <div className="pt-4 mt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                  {match.venue || match.matchDate}
                </div>

                <button
                  onClick={() => handleWatchMatch(match)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    match.isLive
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{match.isLive ? 'Watch Live' : 'Open Match'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMatches.length === 0 && (
          <div className="py-16 text-center text-zinc-400 space-y-3">
            <Tv className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-base font-semibold text-zinc-200">No scheduled fixtures in this category right now</p>
            <p className="text-xs text-zinc-500">Check back shortly or browse All Sports above.</p>
            <button
              onClick={() => {
                setSelectedTournament('All');
                setSelectedStatus('all');
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-red-400 hover:bg-zinc-800 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
