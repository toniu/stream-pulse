import math
from services import flow_scoring


def make_track(tempo=100.0, energy=0.5, valence=0.5, dance=0.5, key=0, mode=1):
    return {
        "tempo": float(tempo),
        "energy": float(energy),
        "valence": float(valence),
        "danceability": float(dance),
        "key": int(key),
        "mode": int(mode),
    }


def test_transition_score_ranges():
    a = make_track(tempo=100, energy=0.5, valence=0.5, dance=0.5, key=0, mode=1)
    b = make_track(tempo=104, energy=0.52, valence=0.48, dance=0.5, key=0, mode=1)
    s = flow_scoring.transition_score(a, b)
    assert isinstance(s, float)
    assert 0.0 <= s <= 100.0
    # similar tracks should be fairly smooth
    assert s > 70


def test_transition_score_rough():
    a = make_track(tempo=100, energy=0.2, valence=0.2, dance=0.2, key=0, mode=1)
    b = make_track(tempo=170, energy=0.9, valence=0.9, dance=0.9, key=7, mode=1)
    s = flow_scoring.transition_score(a, b)
    assert s < 50
    assert flow_scoring.label_transition(s) == "rough"


def test_playlist_score_average():
    t1 = make_track(tempo=100, energy=0.5, valence=0.5, key=0)
    t2 = make_track(tempo=102, energy=0.52, valence=0.48, key=0)
    t3 = make_track(tempo=150, energy=0.8, valence=0.7, key=7)
    res = flow_scoring.playlist_score([t1, t2, t3])
    assert "transition_scores" in res and "playlist_score" in res
    assert len(res["transition_scores"]) == 2
    assert 0.0 <= res["playlist_score"] <= 100.0
    # overall should be between the two transitions
    t0, t1s = res["transition_scores"]
    assert math.isclose(res["playlist_score"], (t0 + t1s) / 2, rel_tol=1e-9)
