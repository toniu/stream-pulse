"""
Flow Service — Playlist Flow Doctor engine.

Scores every track-to-track transition, flags jarring jumps,
suggests bridge-track audio-feature targets, and computes an
overall playlist flow score.  Also provides auto-smooth reordering.
"""

from typing import Dict, List, Tuple, Optional
import statistics
import math

from logger import get_logger

logger = get_logger(__name__)

# Camelot wheel for harmonic compatibility (pitch_class → Camelot number)
# Spotify key: 0=C, 1=C#, ..., 11=B;  mode: 1=major, 0=minor
_CAMELOT = {
    (0, 1): '8B', (1, 1): '3B', (2, 1): '10B', (3, 1): '5B',
    (4, 1): '12B', (5, 1): '7B', (6, 1): '2B', (7, 1): '9B',
    (8, 1): '4B', (9, 1): '11B', (10, 1): '6B', (11, 1): '1B',
    (0, 0): '5A', (1, 0): '12A', (2, 0): '7A', (3, 0): '2A',
    (4, 0): '9A', (5, 0): '4A', (6, 0): '11A', (7, 0): '6A',
    (8, 0): '1A', (9, 0): '8A', (10, 0): '3A', (11, 0): '10A',
}

# Pre-build adjacency: each Camelot code → set of compatible codes
_CAMELOT_COMPAT: Dict[str, set] = {}
for code in set(_CAMELOT.values()):
    num = int(code[:-1])
    letter = code[-1]
    compat = set()
    compat.add(code)                                    # same key
    compat.add(f"{(num % 12) + 1}{letter}")             # +1
    compat.add(f"{((num - 2) % 12) + 1}{letter}")       # -1
    other = 'A' if letter == 'B' else 'B'
    compat.add(f"{num}{other}")                         # relative major/minor
    _CAMELOT_COMPAT[code] = compat


def _camelot_distance(key1: Optional[int], mode1: Optional[int],
                      key2: Optional[int], mode2: Optional[int]) -> float:
    """
    Return 0.0 (harmonically compatible) or 1.0 (clash).
    If key data is missing, return 0.5 (neutral).
    """
    if key1 is None or mode1 is None or key2 is None or mode2 is None:
        return 0.5
    c1 = _CAMELOT.get((key1, mode1))
    c2 = _CAMELOT.get((key2, mode2))
    if c1 is None or c2 is None:
        return 0.5
    return 0.0 if c2 in _CAMELOT_COMPAT.get(c1, set()) else 1.0


def _normalise_tempo(bpm: float) -> float:
    """Normalise BPM to a 0-1 range (60-200 BPM mapped linearly)."""
    return max(0.0, min(1.0, (bpm - 60) / 140))


class FlowService:
    """Playlist Flow Doctor — transition analysis engine."""

    # Weights for the composite transition score
    WEIGHTS = {
        'energy': 0.30,
        'tempo': 0.25,
        'key': 0.20,
        'valence': 0.15,
        'danceability': 0.10,
    }

    SMOOTH_THRESHOLD = 0.25   # ≤ this → smooth
    ROUGH_THRESHOLD = 0.55    # ≥ this → rough

    # ------------------------------------------------------------------ #
    #  Core: score every consecutive transition                          #
    # ------------------------------------------------------------------ #
    @staticmethod
    def analyse_transitions(track_info: List[Dict]) -> List[Dict]:
        """
        Score every adjacent pair of tracks.

        Returns list of dicts (length = len(tracks) - 1):
        {
            from_idx, to_idx, from_track, to_track,
            score (0-1, lower=smoother),
            deltas: { energy, tempo, key, valence, danceability },
            verdict: 'smooth' | 'ok' | 'rough',
        }
        """
        transitions = []
        for i in range(len(track_info) - 1):
            t1 = track_info[i]
            t2 = track_info[i + 1]
            score, deltas = FlowService._pair_score(t1, t2)
            if score <= FlowService.SMOOTH_THRESHOLD:
                verdict = 'smooth'
            elif score >= FlowService.ROUGH_THRESHOLD:
                verdict = 'rough'
            else:
                verdict = 'ok'

            transitions.append({
                'from_idx': i,
                'to_idx': i + 1,
                'from_track': {
                    'name': t1.get('name', ''),
                    'artists': t1.get('artists', []),
                },
                'to_track': {
                    'name': t2.get('name', ''),
                    'artists': t2.get('artists', []),
                },
                'score': round(score, 3),
                'deltas': {k: round(v, 3) for k, v in deltas.items()},
                'verdict': verdict,
            })

        return transitions

    # ------------------------------------------------------------------ #
    #  Pair score                                                        #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _pair_score(t1: Dict, t2: Dict) -> Tuple[float, Dict[str, float]]:
        """Compute weighted transition-friction score between two tracks."""
        af1 = t1.get('audio_features') or {}
        af2 = t2.get('audio_features') or {}

        energy_delta = abs(af1.get('energy', 0.5) - af2.get('energy', 0.5))
        tempo_delta = abs(
            _normalise_tempo(af1.get('tempo', 120))
            - _normalise_tempo(af2.get('tempo', 120))
        )
        key_delta = _camelot_distance(
            af1.get('key'), af1.get('mode'),
            af2.get('key'), af2.get('mode'),
        )
        valence_delta = abs(af1.get('valence', 0.5) - af2.get('valence', 0.5))
        dance_delta = abs(af1.get('danceability', 0.5) - af2.get('danceability', 0.5))

        deltas = {
            'energy': energy_delta,
            'tempo': tempo_delta,
            'key': key_delta,
            'valence': valence_delta,
            'danceability': dance_delta,
        }

        w = FlowService.WEIGHTS
        score = (
            w['energy'] * energy_delta
            + w['tempo'] * tempo_delta
            + w['key'] * key_delta
            + w['valence'] * valence_delta
            + w['danceability'] * dance_delta
        )
        return score, deltas

    # ------------------------------------------------------------------ #
    #  Overall flow score (0-100, higher = smoother)                     #
    # ------------------------------------------------------------------ #
    @staticmethod
    def playlist_flow_score(transitions: List[Dict]) -> int:
        """
        Compute a single 0-100 flow score for the whole playlist.
        100 = perfectly smooth, 0 = maximum friction.
        """
        if not transitions:
            return 100
        avg = statistics.mean(t['score'] for t in transitions)
        # Invert (lower friction → higher score) and scale to 0-100
        return max(0, min(100, round((1 - avg) * 100)))

    # ------------------------------------------------------------------ #
    #  Summary stats                                                     #
    # ------------------------------------------------------------------ #
    @staticmethod
    def flow_summary(transitions: List[Dict]) -> Dict:
        """Return counts and the roughest / smoothest transitions."""
        smooth = [t for t in transitions if t['verdict'] == 'smooth']
        rough = [t for t in transitions if t['verdict'] == 'rough']
        ok = [t for t in transitions if t['verdict'] == 'ok']

        roughest = sorted(transitions, key=lambda t: t['score'], reverse=True)[:5]
        smoothest = sorted(transitions, key=lambda t: t['score'])[:5]

        return {
            'smooth_count': len(smooth),
            'ok_count': len(ok),
            'rough_count': len(rough),
            'total': len(transitions),
            'roughest': roughest,
            'smoothest': smoothest,
        }

    # ------------------------------------------------------------------ #
    #  Bridge-track audio-feature targets                                #
    # ------------------------------------------------------------------ #
    @staticmethod
    def bridge_targets(t1: Dict, t2: Dict) -> Dict:
        """
        Compute ideal audio-feature targets for a bridge track
        that sits between t1 and t2 (midpoint of each feature).
        """
        af1 = t1.get('audio_features') or {}
        af2 = t2.get('audio_features') or {}

        target = {}
        for feat in ('energy', 'valence', 'danceability', 'acousticness',
                      'instrumentalness', 'speechiness'):
            v1 = af1.get(feat, 0.5)
            v2 = af2.get(feat, 0.5)
            target[feat] = round((v1 + v2) / 2, 3)

        # Tempo: arithmetic midpoint
        bpm1 = af1.get('tempo', 120)
        bpm2 = af2.get('tempo', 120)
        target['tempo'] = round((bpm1 + bpm2) / 2, 1)

        return target

    # ------------------------------------------------------------------ #
    #  Auto-smooth reorder                                               #
    # ------------------------------------------------------------------ #
    @staticmethod
    def auto_smooth(track_info: List[Dict]) -> List[int]:
        """
        Greedy nearest-neighbour reorder that minimises total
        transition friction.  Starting track: the one whose audio
        features are closest to the playlist average.
        """
        if len(track_info) <= 2:
            return list(range(len(track_info)))

        # Compute playlist-average features
        features = ['energy', 'valence', 'danceability', 'tempo']
        avgs: Dict[str, float] = {}
        for f in features:
            vals = []
            for t in track_info:
                af = t.get('audio_features') or {}
                v = af.get(f)
                if v is not None:
                    vals.append(v if f != 'tempo' else _normalise_tempo(v))
            avgs[f] = statistics.mean(vals) if vals else 0.5

        # Find start: closest to average
        def dist_to_avg(idx: int) -> float:
            af = track_info[idx].get('audio_features') or {}
            return sum(
                abs((af.get(f, 0.5) if f != 'tempo'
                     else _normalise_tempo(af.get('tempo', 120))) - avgs[f])
                for f in features
            )

        remaining = set(range(len(track_info)))
        start = min(remaining, key=dist_to_avg)
        order = [start]
        remaining.remove(start)

        while remaining:
            last = track_info[order[-1]]
            best_idx = min(
                remaining,
                key=lambda idx: FlowService._pair_score(last, track_info[idx])[0],
            )
            order.append(best_idx)
            remaining.remove(best_idx)

        return order

    # ------------------------------------------------------------------ #
    #  Flow timeline (for the arc visualisation)                         #
    # ------------------------------------------------------------------ #
    @staticmethod
    def flow_timeline(track_info: List[Dict], transitions: List[Dict]) -> List[Dict]:
        """
        Build per-track data for the flow-arc visualisation.
        Each entry has position, track name/artists, audio features,
        and the transition score TO this track (None for first track).
        """
        timeline = []
        for i, track in enumerate(track_info):
            af = track.get('audio_features') or {}
            entry = {
                'position': i,
                'name': track.get('name', ''),
                'artists': track.get('artists', []),
                'energy': af.get('energy'),
                'valence': af.get('valence'),
                'danceability': af.get('danceability'),
                'tempo': af.get('tempo'),
                'transition_score': transitions[i - 1]['score'] if i > 0 and i - 1 < len(transitions) else None,
                'verdict': transitions[i - 1]['verdict'] if i > 0 and i - 1 < len(transitions) else None,
            }
            timeline.append(entry)
        return timeline
