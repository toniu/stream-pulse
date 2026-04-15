import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RadarChart } from '@/components/charts/RadarChart';
import { useListeningData } from '@/hooks/useListeningData';
import { fetchArtist, fetchArtistTopTracks } from '@/api/endpoints';
import type { SpotifyArtist, SpotifyTrack, RadarDataPoint } from '@/types';
import { formatNumber } from '@/utils/formatters';

export function ArtistsPage() {
  const navigate = useNavigate();
  const { topArtists, topTracks, listeningStats, isLoading, error, loadAll } =
    useListeningData();

  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const [artistTracks, setArtistTracks] = useState<SpotifyTrack[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!listeningStats) void loadAll();
  }, []);

  const handleSelectArtist = async (artistId: string) => {
    setDetailLoading(true);
    try {
      const [artist, tracks] = await Promise.all([
        fetchArtist(artistId),
        fetchArtistTopTracks(artistId),
      ]);
      setSelectedArtist(artist);
      setArtistTracks(tracks);
    } finally {
      setDetailLoading(false);
    }
  };

  // Build radar for artist genre comparison
  const artistTrackFeatures = topTracks.filter(
    (t) =>
      t.audioFeatures &&
      t.artists.some((a) => a.id === selectedArtist?.id)
  );

  const avgFeature = (key: 'energy' | 'valence' | 'danceability' | 'acousticness') => {
    if (artistTrackFeatures.length === 0) return 0;
    return (
      artistTrackFeatures.reduce((s, t) => s + t.audioFeatures![key], 0) /
      artistTrackFeatures.length
    );
  };

  const radarData: RadarDataPoint[] = selectedArtist
    ? [
        { subject: 'Energy', value: Math.round(avgFeature('energy') * 100), fullMark: 100 },
        { subject: 'Valence', value: Math.round(avgFeature('valence') * 100), fullMark: 100 },
        { subject: 'Dance', value: Math.round(avgFeature('danceability') * 100), fullMark: 100 },
        { subject: 'Acoustic', value: Math.round(avgFeature('acousticness') * 100), fullMark: 100 },
        { subject: 'Popularity', value: selectedArtist.popularity, fullMark: 100 },
      ]
    : [];

  return (
    <div className="flex flex-col">
      <Header title="Artist Deep Dive" subtitle="Explore your top artists" />
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Artist list */}
            <div className="lg:col-span-1">
              <Card padding="sm">
                <h3 className="mb-3 px-2 text-xs font-medium uppercase tracking-widest text-gray-400">
                  Top Artists
                </h3>
                <ul className="space-y-1">
                  {topArtists.slice(0, 20).map((artist, i) => (
                    <li key={artist.id}>
                      <button
                        onClick={() => void handleSelectArtist(artist.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                          selectedArtist?.id === artist.id
                            ? 'bg-indigo-600/20 text-indigo-300'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="w-5 shrink-0 text-right text-xs text-gray-500">
                          {i + 1}
                        </span>
                        <img
                          src={artist.images[2]?.url ?? artist.images[0]?.url}
                          alt={artist.name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{artist.name}</p>
                          <p className="truncate text-xs text-gray-500">
                            {artist.genres[0] ?? 'Unknown genre'}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Artist detail */}
            <div className="lg:col-span-2 space-y-4">
              {detailLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : selectedArtist ? (
                <>
                  {/* Hero */}
                  <Card>
                    <div className="flex items-center gap-5">
                      <img
                        src={selectedArtist.images[0]?.url}
                        alt={selectedArtist.name}
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-indigo-500/30"
                      />
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedArtist.name}
                        </h2>
                        <p className="text-xs text-gray-400">
                          {formatNumber(selectedArtist.followers.total)} followers ·{' '}
                          {selectedArtist.popularity}/100 popularity
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedArtist.genres.slice(0, 4).map((g) => (
                            <span
                              key={g}
                              className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-xs text-indigo-300"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Audio radar */}
                    <Card>
                      <h3 className="mb-2 text-sm font-medium text-gray-300">
                        Audio Fingerprint
                      </h3>
                      {radarData.length > 0 ? (
                        <RadarChart data={radarData} height={220} />
                      ) : (
                        <p className="py-8 text-center text-xs text-gray-500">
                          Not enough plays to analyse
                        </p>
                      )}
                    </Card>

                    {/* Top tracks */}
                    <Card>
                      <h3 className="mb-3 text-sm font-medium text-gray-300">
                        Global Top Tracks
                      </h3>
                      <ol className="space-y-2">
                        {artistTracks.slice(0, 7).map((t, i) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <span className="w-4 text-xs text-gray-500">{i + 1}</span>
                            <img
                              src={t.album.images[2]?.url}
                              alt=""
                              className="h-7 w-7 rounded"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-white">
                                {t.name}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">{t.popularity}</span>
                          </li>
                        ))}
                      </ol>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">
                    Select an artist to see their analytics
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
