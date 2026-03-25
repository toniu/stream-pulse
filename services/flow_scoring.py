"""Flow scoring utilities for playlist transitions.

This module computes per-transition scores and an overall playlist score
based on Spotify audio-features (tempo, energy, valence, danceability, key, mode).
"""
from __future__ import annotations

import math
from typing import Dict, Iterable, List


def _key_distance(k1: int, k2: int) -> int:
    d = abs(k1 - k2) % 12
    return min(d, 12 - d)


def _tempo_diff(a_tempo: float, b_tempo: float) -> float:
    # consider half/double tempo equivalence
    candidates = [abs(a_tempo - b_tempo), abs(a_tempo - b_tempo * 2), abs(a_tempo - b_tempo / 2)]
    return min(candidates)


def tempo_score(a: Dict, b: Dict) -> float:
    diff = _tempo_diff(a.get("tempo", 0.0), b.get("tempo", 0.0))
    # exponential decay gives smooth falloff for tempo differences
    return math.exp(-diff / 20.0)


def energy_score(a: Dict, b: Dict) -> float:
    ed = abs(a.get("energy", 0.0) - b.get("energy", 0.0))
    score = 1.0 - ed
    # penalize sudden spikes upward slightly
    if b.get("energy", 0.0) > a.get("energy", 0.0):
        score *= 0.9
    return max(0.0, min(1.0, score))


def valence_score(a: Dict, b: Dict) -> float:
    vd = abs(a.get("valence", 0.0) - b.get("valence", 0.0))
    return max(0.0, min(1.0, 1.0 - vd))


def key_score(a: Dict, b: Dict) -> float:
    # keys are ints 0-11, mode is 0/1
    ak = a.get("key")
    bk = b.get("key")
    if ak is None or bk is None:
        return 0.5
    dist = _key_distance(int(ak), int(bk))
    base = 1.0 - (dist / 6.0)
    if a.get("mode") == b.get("mode"):
        return max(0.0, min(1.0, base))
    return max(0.0, min(1.0, 0.5 * base))


def dance_score(a: Dict, b: Dict) -> float:
    dd = abs(a.get("danceability", 0.0) - b.get("danceability", 0.0))
    return max(0.0, min(1.0, 1.0 - dd))


DEFAULT_WEIGHTS = {
    "tempo": 0.30,
    "energy": 0.25,
    "valence": 0.15,
    "key": 0.20,
    "dance": 0.10,
}


def transition_score(a: Dict, b: Dict, weights: Dict = None) -> float:
    """Compute a 0-100 score for the transition A -> B."""
    w = DEFAULT_WEIGHTS if weights is None else weights
    t = tempo_score(a, b)
    e = energy_score(a, b)
    v = valence_score(a, b)
    k = key_score(a, b)
    d = dance_score(a, b)

    raw = (
        w["tempo"] * t +
        w["energy"] * e +
        w["valence"] * v +
        w["key"] * k +
        w["dance"] * d
    )
    # normalize and scale to 0-100
    return max(0.0, min(100.0, raw * 100.0))


def label_transition(score: float) -> str:
    if score < 50:
        return "rough"
    if score < 70:
        return "noticeable"
    return "smooth"


def playlist_score(tracks: Iterable[Dict], weights: Dict = None) -> Dict:
    """Compute per-transition scores and overall playlist score.

    Returns dict: {"transition_scores": [...], "playlist_score": float}
    """
    ts: List[float] = []
    items = list(tracks)
    for i in range(len(items) - 1):
        s = transition_score(items[i], items[i + 1], weights=weights)
        ts.append(s)
    overall = sum(ts) / len(ts) if ts else 100.0
    return {"transition_scores": ts, "playlist_score": overall}
