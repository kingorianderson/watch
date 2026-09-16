export type TournamentType =
  | 'All'
  | 'EPL'
  | 'UCL'
  | 'La Liga'
  | 'Serie A'
  | 'Bundesliga'
  | 'Europa League'
  | 'F1'
  | 'UFC'
  | 'NBA';

export type MatchStatus = 'live' | 'upcoming' | 'ended';

export interface SportsStream {
  id: string;
  name: string;
  quality: string;
  embedUrl: string;
  isHd?: boolean;
}

export interface SportsMatch {
  id: string;
  tournament: TournamentType;
  tournamentName: string;
  tournamentIcon?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  leagueLogo?: string;
  matchTime: string; // e.g. "21:00 EAT"
  matchDate: string; // e.g. "Today" or "Tomorrow"
  isLive: boolean;
  statusText: string; // e.g. "68'", "Half Time", "Upcoming", "Full Time"
  score?: {
    home: number;
    away: number;
  };
  venue?: string;
  description?: string;
  streams: SportsStream[];
}

