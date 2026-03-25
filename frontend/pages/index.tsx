import { useState } from 'react'

type Track = {
  tempo: number
  energy: number
  valence: number
  danceability: number
  key?: number
  mode?: number
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlistUrl, setPlaylistUrl] = useState('')

  function makeSample() {
    const sample = [100,102,98,150,152,148,120,122,60,62].map((t,i) => ({
      tempo: t,
      energy: 0.4 + 0.05 * (i % 3),
      valence: 0.5 + 0.03 * (i % 4),
      danceability: 0.4 + 0.05 * (i % 2),
      key: (i * 2) % 12,
      mode: 1
    }))
    setTracks(sample)
    return sample
  }

  async function analyze() {
    setLoading(true)
    const payload = { tracks: tracks.length ? tracks : makeSample() }
    try {
      const res = await fetch('/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const body = await res.json()
      setResult(body)
    } catch (err) {
      setResult({ success: false, error: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function analyzePlaylist(fetchAudio = true) {
    // fetchAudio=true -> let backend fetch audio-features from Spotify
    // fetchAudio=false -> backend will still attempt but we rely on demo endpoint
    if (!playlistUrl) {
      setResult({ success: false, error: 'Playlist URL required' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/analyze-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_url: playlistUrl })
      })
      const body = await res.json()
      setResult(body)
      // If backend returned tracks with audio_features, also update local tracks for timeline
      if (body && body.tracks && Array.isArray(body.tracks)) {
        const mapped: Track[] = body.tracks.map((t: any) => ({
          tempo: t.audio_features?.tempo ?? 120,
          energy: t.audio_features?.energy ?? 0.5,
          valence: t.audio_features?.valence ?? 0.5,
          danceability: t.audio_features?.danceability ?? 0.5,
          key: t.audio_features?.key,
          mode: t.audio_features?.mode
        }))
        setTracks(mapped)
      }
    } catch (err) {
      setResult({ success: false, error: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '18px auto', padding: 12 }}>
      <h1>pyAux — Demo (Next.js)</h1>
      <p>Minimal demo page that calls the Flask backend analyze endpoint.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { setTracks(makeSample()) }}>Load sample</button>
        <button onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
        <div style={{ marginLeft: 'auto', color: '#666' }}>{result ? `Score: ${result.playlist_score?.toFixed?.(1) ?? 'n/a'}` : 'idle'}</div>
      </div>

      <div style={{ border: '1px solid #eee', padding: 8, background: '#fff' }}>
        <svg width={920} height={240}>
          {tracks.length > 0 && (() => {
            const n = tracks.length
            const margin = { left: 36, top: 12, right: 20, bottom: 28 }
            const innerW = 920 - margin.left - margin.right
            const innerH = 240 - margin.top - margin.bottom
            const xs = tracks.map((_, i) => margin.left + (i / Math.max(1, n - 1)) * innerW)
            const ysEnergy = tracks.map(t => margin.top + (1 - t.energy) * innerH)
            const ysVal = tracks.map(t => margin.top + (1 - t.valence) * innerH)
            return (
              <g>
                <polyline fill="none" stroke="#e6550d" strokeWidth={2} points={xs.map((x,i)=>`${x},${ysEnergy[i]}`).join(' ')} />
                <polyline fill="none" stroke="#3182bd" strokeWidth={2} points={xs.map((x,i)=>`${x},${ysVal[i]}`).join(' ')} />
                {xs.map((x,i)=> <circle key={i} cx={x} cy={ysEnergy[i]} r={4} fill="#e6550d" />)}
                {xs.map((x,i)=> <circle key={'v'+i} cx={x} cy={ysVal[i]} r={3} fill="#3182bd" />)}
              </g>
            )
          })()}
        </svg>
      </div>

      <pre style={{ marginTop: 12, background: '#f6f6f6', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
    </main>
  )
}
