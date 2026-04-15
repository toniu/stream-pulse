import type { InsightContext, InsightRule } from '@/types';

function formatHours(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export const insightRules: InsightRule[] = [
  // ─── Time Behaviour ────────────────────────────────────────────────────────
  {
    id: 'night_owl',
    name: 'Night Owl',
    evaluate({ hourlyDistribution }) {
      const lateNight = hourlyDistribution
        .filter((h) => h.hour >= 22 || h.hour <= 3)
        .reduce((s, h) => s + h.count, 0);
      const total = hourlyDistribution.reduce((s, h) => s + h.count, 0);
      if (total === 0) return null;
      const pct = lateNight / total;
      if (pct < 0.2) return null;
      return {
        id: 'night_owl',
        category: 'time',
        severity: 'info',
        title: 'Night Owl Listener',
        description: `${(pct * 100).toFixed(0)}% of your streams happen between 10 PM and 3 AM. You do your best listening after dark.`,
        metric: `${(pct * 100).toFixed(0)}% late-night`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'morning_person',
    name: 'Morning Person',
    evaluate({ hourlyDistribution }) {
      const morning = hourlyDistribution
        .filter((h) => h.hour >= 6 && h.hour <= 9)
        .reduce((s, h) => s + h.count, 0);
      const total = hourlyDistribution.reduce((s, h) => s + h.count, 0);
      if (total === 0) return null;
      const pct = morning / total;
      if (pct < 0.25) return null;
      return {
        id: 'morning_person',
        category: 'time',
        severity: 'positive',
        title: 'Morning Listener',
        description: `${(pct * 100).toFixed(0)}% of your plays happen between 6–9 AM. Music fuels your mornings.`,
        metric: `${(pct * 100).toFixed(0)}% morning`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'peak_hour',
    name: 'Peak Hour',
    evaluate({ listeningStats }) {
      const hour = listeningStats.mostActiveHour;
      return {
        id: 'peak_hour',
        category: 'time',
        severity: 'neutral',
        title: 'Peak Listening Hour',
        description: `You stream the most music around ${formatHours(hour)}. That's when you're most tuned in.`,
        metric: formatHours(hour),
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ─── Mood Behaviour ─────────────────────────────────────────────────────────
  {
    id: 'high_energy_listener',
    name: 'High Energy Listener',
    evaluate({ moodSnapshot }) {
      if (moodSnapshot.averageEnergy < 0.65) return null;
      return {
        id: 'high_energy_listener',
        category: 'mood',
        severity: 'positive',
        title: 'High-Energy Listener',
        description: `Your average track energy is ${(moodSnapshot.averageEnergy * 100).toFixed(0)}%. You gravitate toward intense, driving music.`,
        metric: `${(moodSnapshot.averageEnergy * 100).toFixed(0)}% energy`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'melancholic_listener',
    name: 'Melancholic Listener',
    evaluate({ moodSnapshot }) {
      if (moodSnapshot.averageValence > 0.4) return null;
      return {
        id: 'melancholic_listener',
        category: 'mood',
        severity: 'warning',
        title: 'Melancholic Taste',
        description: `Your average valence score is ${(moodSnapshot.averageValence * 100).toFixed(0)}%, leaning toward emotionally heavy music.`,
        metric: `${(moodSnapshot.averageValence * 100).toFixed(0)}% valence`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'happy_listener',
    name: 'Happy Listener',
    evaluate({ moodSnapshot }) {
      if (moodSnapshot.averageValence < 0.65) return null;
      return {
        id: 'happy_listener',
        category: 'mood',
        severity: 'positive',
        title: 'Upbeat Taste',
        description: `Your valence score of ${(moodSnapshot.averageValence * 100).toFixed(0)}% means you're consistently drawn to positive, feel-good music.`,
        metric: `${(moodSnapshot.averageValence * 100).toFixed(0)}% valence`,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ─── Genre Behaviour ────────────────────────────────────────────────────────
  {
    id: 'genre_loyalist',
    name: 'Genre Loyalist',
    evaluate({ listeningStats }) {
      const top = listeningStats.topGenres[0];
      if (!top || top.percentage < 35) return null;
      return {
        id: 'genre_loyalist',
        category: 'genre',
        severity: 'info',
        title: 'Genre Loyalist',
        description: `${top.percentage}% of your listening is "${top.genre}". You run deep in a single genre.`,
        metric: `${top.percentage}% ${top.genre}`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    evaluate({ listeningStats }) {
      if (listeningStats.uniqueGenres < 15) return null;
      return {
        id: 'genre_explorer',
        category: 'genre',
        severity: 'positive',
        title: 'Genre Explorer',
        description: `You've spanned ${listeningStats.uniqueGenres} distinct genres. Your taste is impressively wide.`,
        metric: `${listeningStats.uniqueGenres} genres`,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ─── Artist Behaviour ───────────────────────────────────────────────────────
  {
    id: 'artist_loyal',
    name: 'Artist Loyal',
    evaluate({ topArtists, listeningStats }) {
      if (listeningStats.uniqueArtists === 0) return null;
      const topArtistShare =
        listeningStats.uniqueArtists > 0 ? 1 / listeningStats.uniqueArtists : 0;
      if (topArtistShare > 0.25 && topArtists[0]) {
        return {
          id: 'artist_loyal',
          category: 'artist',
          severity: 'info',
          title: 'Artist Loyal',
          description: `${topArtists[0].name} dominates your listening history. You know what you love.`,
          metric: topArtists[0].name,
          generatedAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },

  // ─── Diversity ──────────────────────────────────────────────────────────────
  {
    id: 'discovery_mode',
    name: 'Discovery Mode',
    evaluate({ recentTracks }) {
      const unique = new Set(recentTracks.map((t) => t.id));
      const pct = unique.size / Math.max(recentTracks.length, 1);
      if (pct < 0.8) return null;
      return {
        id: 'discovery_mode',
        category: 'behaviour',
        severity: 'positive',
        title: 'Discovery Mode',
        description: `${(pct * 100).toFixed(0)}% of your recent 50 plays are unique tracks. You're actively seeking new music.`,
        metric: `${unique.size} unique tracks`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'repeat_listener',
    name: 'Repeat Listener',
    evaluate({ recentTracks }) {
      const counts: Record<string, number> = {};
      recentTracks.forEach((t) => {
        counts[t.id] = (counts[t.id] ?? 0) + 1;
      });
      const mostPlayed = Object.values(counts).sort((a, b) => b - a)[0] ?? 0;
      if (mostPlayed < 3) return null;
      const trackId = Object.keys(counts).find((k) => counts[k] === mostPlayed)!;
      const track = recentTracks.find((t) => t.id === trackId);
      return {
        id: 'repeat_listener',
        category: 'behaviour',
        severity: 'neutral',
        title: 'On Repeat',
        description: `"${track?.name ?? 'A track'}" played ${mostPlayed} times in your last 50 streams. You've found something special.`,
        metric: `${mostPlayed}× plays`,
        generatedAt: new Date().toISOString(),
      };
    },
  },
];
