import type { SportsMatch, TournamentType, MatchStatus } from '../types/sports';

export const SPORTS_MATCHES: SportsMatch[] = [
  {
    id: 'epl-arsenal-mancity',
    tournament: 'EPL',
    tournamentName: 'Premier League',
    tournamentIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    homeTeam: 'Arsenal',
    awayTeam: 'Manchester City',
    homeLogo: 'https://media.api-sports.io/football/teams/42.png',
    awayLogo: 'https://media.api-sports.io/football/teams/50.png',
    matchTime: '18:30 EAT',
    matchDate: 'Today',
    isLive: true,
    statusText: '67\' Live',
    score: { home: 2, away: 1 },
    venue: 'Emirates Stadium, London',
    description: 'Premier League Title Decider Clash: Top of the table showdown.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (Sky Sports Main Event HD)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/epl-1',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (TNT Sports 1 Ultra HD)',
        quality: '4K / 1080p',
        embedUrl: 'https://vidsrc.stream/sports/epl/arsenal-mancity',
        isHd: true,
      },
      {
        id: 's3',
        name: 'Server 3 (SuperSport Premier League)',
        quality: '720p HD',
        embedUrl: 'https://embedstream.me/sky-sports-premier-league-stream-1',
      },
      {
        id: 's4',
        name: 'Server 4 (Backup Mirror)',
        quality: 'Auto Multi-Bitrate',
        embedUrl: 'https://multiembed.mov/?video_id=sports_epl_1',
      },
    ],
  },
  {
    id: 'ucl-realmadrid-bayern',
    tournament: 'UCL',
    tournamentName: 'UEFA Champions League',
    tournamentIcon: '🏆',
    homeTeam: 'Real Madrid',
    awayTeam: 'Bayern Munich',
    homeLogo: 'https://media.api-sports.io/football/teams/541.png',
    awayLogo: 'https://media.api-sports.io/football/teams/157.png',
    matchTime: '22:00 EAT',
    matchDate: 'Today',
    isLive: true,
    statusText: '34\' Live',
    score: { home: 1, away: 0 },
    venue: 'Santiago Bernabéu, Madrid',
    description: 'UEFA Champions League Semifinal: European Giants Head to Head.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (TNT Sports HD / CBS Sports)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/ucl-1',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (Canal+ Foot HD)',
        quality: '1080p FHD',
        embedUrl: 'https://vidsrc.stream/sports/ucl/realmadrid-bayern',
        isHd: true,
      },
      {
        id: 's3',
        name: 'Server 3 (SuperSport Grandstand)',
        quality: '720p HD',
        embedUrl: 'https://embedstream.me/tnt-sports-1-stream-1',
      },
      {
        id: 's4',
        name: 'Server 4 (Global Mirror)',
        quality: 'Auto',
        embedUrl: 'https://multiembed.mov/?video_id=sports_ucl_1',
      },
    ],
  },
  {
    id: 'laliga-barcelona-atletico',
    tournament: 'La Liga',
    tournamentName: 'La Liga EA Sports',
    tournamentIcon: '🇪🇸',
    homeTeam: 'Barcelona',
    awayTeam: 'Atlético Madrid',
    homeLogo: 'https://media.api-sports.io/football/teams/529.png',
    awayLogo: 'https://media.api-sports.io/football/teams/530.png',
    matchTime: '22:00 EAT',
    matchDate: 'Tonight',
    isLive: false,
    statusText: 'Upcoming ⏰',
    venue: 'Estadi Olímpic Lluís Companys, Barcelona',
    description: 'La Liga Blockbuster: Xavi\'s squad takes on Simeone\'s battle-hardened Atlético.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (LaLiga TV HD)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/laliga-1',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (ESPN+ HD Stream)',
        quality: '1080p',
        embedUrl: 'https://vidsrc.stream/sports/laliga/barcelona-atletico',
        isHd: true,
      },
      {
        id: 's3',
        name: 'Server 3 (SuperSport LaLiga)',
        quality: '720p HD',
        embedUrl: 'https://embedstream.me/laliga-tv-stream-1',
      },
    ],
  },
  {
    id: 'epl-liverpool-chelsea',
    tournament: 'EPL',
    tournamentName: 'Premier League',
    tournamentIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    homeTeam: 'Liverpool',
    awayTeam: 'Chelsea',
    homeLogo: 'https://media.api-sports.io/football/teams/40.png',
    awayLogo: 'https://media.api-sports.io/football/teams/49.png',
    matchTime: '18:30 EAT',
    matchDate: 'Tomorrow',
    isLive: false,
    statusText: 'Upcoming ⏰',
    venue: 'Anfield, Liverpool',
    description: 'Premier League Super Sunday: Anfield roar meets Enzo Maresca\'s Chelsea.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (Sky Sports Main Event HD)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/epl-liverpool-chelsea',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (Peacock Premium HD)',
        quality: '1080p',
        embedUrl: 'https://vidsrc.stream/sports/epl/liverpool-chelsea',
        isHd: true,
      },
      {
        id: 's3',
        name: 'Server 3 (SuperSport Premier League)',
        quality: '720p HD',
        embedUrl: 'https://embedstream.me/sky-sports-premier-league-stream-2',
      },
    ],
  },
  {
    id: 'seriea-inter-juventus',
    tournament: 'Serie A',
    tournamentName: 'Serie A Enilive',
    tournamentIcon: '🇮🇹',
    homeTeam: 'Inter Milan',
    awayTeam: 'Juventus',
    homeLogo: 'https://media.api-sports.io/football/teams/505.png',
    awayLogo: 'https://media.api-sports.io/football/teams/496.png',
    matchTime: '21:45 EAT',
    matchDate: 'Tomorrow',
    isLive: false,
    statusText: 'Upcoming ⏰',
    venue: 'San Siro, Milan',
    description: 'Derby d\'Italia: Historic Italian rivalry for the Scudetto summit.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (DAZN Serie A HD)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/seriea-inter-juve',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (CBS Sports Golazo)',
        quality: '1080p',
        embedUrl: 'https://vidsrc.stream/sports/seriea/inter-juventus',
        isHd: true,
      },
    ],
  },
  {
    id: 'f1-grand-prix-monaco',
    tournament: 'F1',
    tournamentName: 'Formula 1',
    tournamentIcon: '🏎️',
    homeTeam: 'Monaco Grand Prix',
    awayTeam: 'Main Race',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/320px-F1.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/320px-F1.svg.png',
    matchTime: '16:00 EAT',
    matchDate: 'Sunday',
    isLive: false,
    statusText: 'Race Day 🏎️',
    venue: 'Circuit de Monaco, Monte Carlo',
    description: 'The Jewel in the Formula 1 Crown: 78 laps of narrow streets and ultra-high adrenaline.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (Sky Sports F1 HD)',
        quality: '1080p 60FPS Ultra',
        embedUrl: 'https://sportify.cc/embed/f1-monaco',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (F1 TV Pro World Feed)',
        quality: '4K / 1080p 60FPS',
        embedUrl: 'https://vidsrc.stream/sports/f1/monaco-gp',
        isHd: true,
      },
    ],
  },
  {
    id: 'ufc-main-card',
    tournament: 'UFC',
    tournamentName: 'UFC Fight Night',
    tournamentIcon: '🥊',
    homeTeam: 'O\'Malley',
    awayTeam: 'Dvalishvili',
    homeLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/UFC_logo.svg/320px-UFC_logo.svg.png',
    awayLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/UFC_logo.svg/320px-UFC_logo.svg.png',
    matchTime: '05:00 EAT',
    matchDate: 'Sunday Morning',
    isLive: false,
    statusText: 'Main Card 🥊',
    venue: 'Sphere, Las Vegas, Nevada',
    description: 'Bantamweight World Championship Bout: Suga Sean defends against Merab.',
    streams: [
      {
        id: 's1',
        name: 'Server 1 (ESPN+ PPV HD)',
        quality: '1080p 60FPS',
        embedUrl: 'https://sportify.cc/embed/ufc-306',
        isHd: true,
      },
      {
        id: 's2',
        name: 'Server 2 (TNT Sports Box Office)',
        quality: '1080p HD',
        embedUrl: 'https://vidsrc.stream/sports/ufc/306-main-card',
        isHd: true,
      },
    ],
  },
];

export const sportsService = {
  getMatches(tournament?: TournamentType, status?: MatchStatus | 'all'): SportsMatch[] {
    let list = [...SPORTS_MATCHES];

    if (tournament && tournament !== 'All') {
      list = list.filter((m) => m.tournament === tournament);
    }

    if (status && status !== 'all') {
      if (status === 'live') {
        list = list.filter((m) => m.isLive);
      } else if (status === 'upcoming') {
        list = list.filter((m) => !m.isLive && m.statusText.toLowerCase().includes('upcoming'));
      } else if (status === 'ended') {
        list = list.filter((m) => !m.isLive && (m.statusText.toLowerCase().includes('full') || m.statusText.toLowerCase().includes('ended')));
      }
    }

    return list;
  },

  getMatchById(id: string): SportsMatch | undefined {
    return SPORTS_MATCHES.find((m) => m.id === id);
  },

  getLiveCount(): number {
    return SPORTS_MATCHES.filter((m) => m.isLive).length;
  },
};
