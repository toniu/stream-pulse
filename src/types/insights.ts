// ─── Insight Engine Types ──────────────────────────────────────────────────────

export type InsightCategory =
  | 'behaviour'
  | 'mood'
  | 'genre'
  | 'artist'
  | 'time'
  | 'trend';

export type InsightSeverity = 'info' | 'positive' | 'warning' | 'neutral';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: string;      // e.g. "87% of streams"
  generatedAt: string;  // ISO timestamp
}

export interface InsightRule {
  id: string;
  name: string;
  evaluate: (context: InsightContext) => Insight | null;
}

export interface InsightContext {
  recentTracks: import('./analytics').TrackWithFeatures[];
  topTracks: import('./analytics').TrackWithFeatures[];
  topArtists: import('./spotify').SpotifyArtist[];
  listeningStats: import('./analytics').ListeningStats;
  moodSnapshot: import('./analytics').MoodSnapshot;
  hourlyDistribution: import('./analytics').ListeningHour[];
}
