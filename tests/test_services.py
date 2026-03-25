"""
Unit tests for pyAux application
Run with: python -m pytest tests/ -v
"""

import pytest
from unittest.mock import Mock, patch
from services.spotify_service import SpotifyService
from services.analysis_service import AnalysisService
from services.flow_service import FlowService


# ------------------------------------------------------------------ #
#  Shared fixtures: tracks with realistic audio features              #
# ------------------------------------------------------------------ #

def _make_track(name, artists, energy, valence, danceability, tempo,
                acousticness=0.1, key=0, mode=1):
    """Helper to build a track dict with audio_features attached."""
    return {
        'name': name,
        'artists': artists,
        'audio_features': {
            'energy': energy,
            'valence': valence,
            'danceability': danceability,
            'tempo': tempo,
            'acousticness': acousticness,
            'key': key,
            'mode': mode,
        },
    }


# A diverse 10-track playlist with big contrasts
DIVERSE_TRACKS = [
    _make_track('Chill Intro',     ['Artist A'], 0.15, 0.20, 0.30, 75,  acousticness=0.85, key=0,  mode=1),
    _make_track('Slow Ballad',     ['Artist B'], 0.25, 0.30, 0.35, 80,  acousticness=0.70, key=0,  mode=1),
    _make_track('Mellow Groove',   ['Artist C'], 0.40, 0.50, 0.55, 100, acousticness=0.40, key=5,  mode=1),
    _make_track('Pop Hit',         ['Artist D'], 0.65, 0.70, 0.72, 120, acousticness=0.10, key=7,  mode=1),
    _make_track('Dance Banger',    ['Artist E'], 0.88, 0.80, 0.90, 128, acousticness=0.03, key=2,  mode=0),
    _make_track('Hard Trap',       ['Artist F'], 0.95, 0.25, 0.78, 145, acousticness=0.02, key=10, mode=0),
    _make_track('Acoustic Folk',   ['Artist G'], 0.20, 0.55, 0.40, 90,  acousticness=0.90, key=7,  mode=1),
    _make_track('EDM Drop',        ['Artist H'], 0.98, 0.60, 0.85, 150, acousticness=0.01, key=1,  mode=1),
    _make_track('Jazz Interlude',  ['Artist I'], 0.30, 0.65, 0.45, 95,  acousticness=0.75, key=5,  mode=0),
    _make_track('Rock Anthem',     ['Artist J'], 0.82, 0.55, 0.60, 135, acousticness=0.05, key=9,  mode=1),
]

# Two very similar tracks (should produce a smooth transition)
SIMILAR_PAIR = [
    _make_track('Track A', ['X'], 0.60, 0.50, 0.65, 120, key=7, mode=1),
    _make_track('Track B', ['Y'], 0.62, 0.52, 0.63, 122, key=7, mode=1),
]

# Two very different tracks (should produce a rough transition)
CONTRASTING_PAIR = [
    _make_track('Quiet Acoustic', ['X'], 0.10, 0.15, 0.20, 70,  acousticness=0.95, key=0, mode=1),
    _make_track('Screamo Metal',  ['Y'], 0.98, 0.10, 0.35, 180, acousticness=0.01, key=6, mode=0),
]


# ------------------------------------------------------------------ #
#  Spotify service tests                                              #
# ------------------------------------------------------------------ #

class TestSpotifyService:
    """Tests for Spotify service"""

    def test_validate_playlist_url_valid(self):
        valid_urls = [
            'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
            'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc123',
        ]
        for url in valid_urls:
            assert SpotifyService.validate_playlist_url(url) is True

    def test_validate_playlist_url_invalid(self):
        invalid_urls = [
            'https://google.com',
            'https://open.spotify.com/track/123',
            'not a url',
            '',
            'http://open.spotify.com/playlist/123',
        ]
        for url in invalid_urls:
            assert SpotifyService.validate_playlist_url(url) is False

    def test_parse_track_success(self):
        track_data = {
            'name': 'Test Track',
            'artists': [{'name': 'Artist 1', 'id': '123'}],
            'album': {
                'name': 'Test Album',
                'release_date': '2020-01-01',
                'images': [{'url': 'http://example.com/image.jpg'}],
            },
            'popularity': 50,
            'duration_ms': 180000,
            'explicit': False,
            'preview_url': 'http://example.com/preview.mp3',
            'external_urls': {'spotify': 'http://example.com/track'},
        }
        result = SpotifyService._parse_track(track_data)
        assert result is not None
        assert result['name'] == 'Test Track'
        assert result['artists'] == ['Artist 1']
        assert result['release_year'] == 2020
        assert result['duration'] == '3:00'

    def test_parse_track_invalid(self):
        assert SpotifyService._parse_track({}) is None


def test_spotify_service_initialization():
    service = SpotifyService('test_id', 'test_secret')
    assert service.client_id == 'test_id'
    assert service.client_secret == 'test_secret'


# ------------------------------------------------------------------ #
#  Analysis service tests                                             #
# ------------------------------------------------------------------ #

class TestAnalysisService:
    """Tests for the DNA / timeline / outlier analysis service."""

    def test_build_timeline_includes_all_tracks(self):
        timeline = AnalysisService.build_timeline_data(DIVERSE_TRACKS)
        assert len(timeline) == len(DIVERSE_TRACKS)
        assert timeline[0]['name'] == 'Chill Intro'
        assert timeline[0]['energy'] == 0.15

    def test_build_timeline_null_features_when_missing(self):
        tracks = [{'name': 'No Features', 'artists': ['Z']}]
        timeline = AnalysisService.build_timeline_data(tracks)
        assert timeline[0]['energy'] is None
        assert timeline[0]['valence'] is None

    def test_detect_outliers_finds_extremes(self):
        """The EDM Drop (energy 0.98) should be an outlier in a mostly-mellow list."""
        mellow = [
            _make_track(f'Mellow {i}', ['A'], 0.30 + i * 0.02, 0.50, 0.50, 100)
            for i in range(8)
        ]
        mellow.append(
            _make_track('EDM Drop', ['B'], 0.98, 0.50, 0.50, 100)
        )
        outliers = AnalysisService.detect_outliers(mellow, z_threshold=1.8)
        outlier_names = [o['name'] for o in outliers]
        assert 'EDM Drop' in outlier_names

    def test_detect_outliers_empty_on_uniform(self):
        """Uniform tracks should produce no outliers."""
        uniform = [
            _make_track(f'Track {i}', ['A'], 0.50, 0.50, 0.50, 120)
            for i in range(10)
        ]
        assert AnalysisService.detect_outliers(uniform) == []

    def test_smart_reorder_build_up(self):
        order = AnalysisService.smart_reorder(DIVERSE_TRACKS, shape='build-up')
        energies = [DIVERSE_TRACKS[i]['audio_features']['energy'] for i in order]
        assert energies == sorted(energies), "build-up should sort low→high energy"

    def test_smart_reorder_wind_down(self):
        order = AnalysisService.smart_reorder(DIVERSE_TRACKS, shape='wind-down')
        energies = [DIVERSE_TRACKS[i]['audio_features']['energy'] for i in order]
        assert energies == sorted(energies, reverse=True)


# ------------------------------------------------------------------ #
#  Flow service tests                                                 #
# ------------------------------------------------------------------ #

class TestFlowService:
    """Tests for the Flow Doctor transition-analysis engine."""

    # -- transition scoring ----------------------------------------- #

    def test_similar_tracks_score_smooth(self):
        transitions = FlowService.analyse_transitions(SIMILAR_PAIR)
        assert len(transitions) == 1
        t = transitions[0]
        assert t['verdict'] == 'smooth', (
            f"Expected smooth for similar pair, got {t['verdict']} (score={t['score']})"
        )

    def test_contrasting_tracks_score_rough(self):
        transitions = FlowService.analyse_transitions(CONTRASTING_PAIR)
        assert len(transitions) == 1
        t = transitions[0]
        assert t['verdict'] == 'rough', (
            f"Expected rough for contrasting pair, got {t['verdict']} (score={t['score']})"
        )

    def test_transition_count_equals_tracks_minus_one(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        assert len(transitions) == len(DIVERSE_TRACKS) - 1

    def test_diverse_playlist_has_mixed_verdicts(self):
        """A diverse playlist should NOT have all-smooth transitions."""
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        verdicts = {t['verdict'] for t in transitions}
        assert len(verdicts) > 1, (
            f"Expected mixed verdicts in a diverse playlist, got only: {verdicts}"
        )

    def test_diverse_playlist_has_rough_transitions(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        rough = [t for t in transitions if t['verdict'] == 'rough']
        assert len(rough) > 0, "Diverse playlist should contain at least one rough transition"

    def test_transition_deltas_are_non_trivial(self):
        """Transitions between different tracks should have non-zero deltas."""
        transitions = FlowService.analyse_transitions(CONTRASTING_PAIR)
        deltas = transitions[0]['deltas']
        assert deltas['energy'] > 0.5, f"energy delta too small: {deltas['energy']}"
        assert deltas['tempo'] > 0.3, f"tempo delta too small: {deltas['tempo']}"

    # -- flow score ------------------------------------------------- #

    def test_flow_score_perfect_for_similar(self):
        transitions = FlowService.analyse_transitions(SIMILAR_PAIR)
        score = FlowService.playlist_flow_score(transitions)
        assert score >= 90, f"Similar pair should score ≥90, got {score}"

    def test_flow_score_low_for_contrasting(self):
        transitions = FlowService.analyse_transitions(CONTRASTING_PAIR)
        score = FlowService.playlist_flow_score(transitions)
        assert score < 60, f"Contrasting pair should score <60, got {score}"

    def test_flow_score_diverse_is_middling(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        score = FlowService.playlist_flow_score(transitions)
        assert 20 <= score <= 90, f"Diverse playlist should score 20-90, got {score}"

    def test_flow_score_empty_is_100(self):
        assert FlowService.playlist_flow_score([]) == 100

    # -- summary ---------------------------------------------------- #

    def test_flow_summary_counts(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        summary = FlowService.flow_summary(transitions)
        assert summary['total'] == len(DIVERSE_TRACKS) - 1
        assert summary['smooth_count'] + summary['ok_count'] + summary['rough_count'] == summary['total']
        assert summary['rough_count'] > 0

    def test_flow_summary_roughest_sorted(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        summary = FlowService.flow_summary(transitions)
        scores = [t['score'] for t in summary['roughest']]
        assert scores == sorted(scores, reverse=True)

    # -- bridge targets --------------------------------------------- #

    def test_bridge_targets_midpoint(self):
        targets = FlowService.bridge_targets(CONTRASTING_PAIR[0], CONTRASTING_PAIR[1])
        assert 0.4 < targets['energy'] < 0.7, f"bridge energy: {targets['energy']}"
        assert 100 < targets['tempo'] < 140, f"bridge tempo: {targets['tempo']}"

    # -- auto-smooth reorder ---------------------------------------- #

    def test_auto_smooth_returns_valid_permutation(self):
        order = FlowService.auto_smooth(DIVERSE_TRACKS)
        assert sorted(order) == list(range(len(DIVERSE_TRACKS)))

    def test_auto_smooth_improves_flow(self):
        """Reordering should produce a better (higher) flow score."""
        original_transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        original_score = FlowService.playlist_flow_score(original_transitions)

        order = FlowService.auto_smooth(DIVERSE_TRACKS)
        reordered = [DIVERSE_TRACKS[i] for i in order]
        new_transitions = FlowService.analyse_transitions(reordered)
        new_score = FlowService.playlist_flow_score(new_transitions)

        assert new_score >= original_score, (
            f"Auto-smooth should not worsen flow: {original_score} → {new_score}"
        )

    def test_auto_smooth_reduces_rough_count(self):
        original_transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        original_rough = sum(1 for t in original_transitions if t['verdict'] == 'rough')

        order = FlowService.auto_smooth(DIVERSE_TRACKS)
        reordered = [DIVERSE_TRACKS[i] for i in order]
        new_transitions = FlowService.analyse_transitions(reordered)
        new_rough = sum(1 for t in new_transitions if t['verdict'] == 'rough')

        assert new_rough <= original_rough, (
            f"Auto-smooth should not increase rough transitions: {original_rough} → {new_rough}"
        )

    # -- flow timeline ---------------------------------------------- #

    def test_flow_timeline_length(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        timeline = FlowService.flow_timeline(DIVERSE_TRACKS, transitions)
        assert len(timeline) == len(DIVERSE_TRACKS)

    def test_flow_timeline_first_has_no_transition(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        timeline = FlowService.flow_timeline(DIVERSE_TRACKS, transitions)
        assert timeline[0]['transition_score'] is None

    def test_flow_timeline_rest_have_scores(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS)
        timeline = FlowService.flow_timeline(DIVERSE_TRACKS, transitions)
        for entry in timeline[1:]:
            assert entry['transition_score'] is not None

    # -- edge cases ------------------------------------------------- #

    def test_tracks_without_audio_features_get_neutral(self):
        """Tracks missing audio_features should get neutral 0.5 defaults."""
        bare = [
            {'name': 'Bare 1', 'artists': ['A']},
            {'name': 'Bare 2', 'artists': ['B']},
        ]
        transitions = FlowService.analyse_transitions(bare)
        assert len(transitions) == 1
        # Defaults produce key delta=0.5 (neutral) × 0.20 weight = 0.1;
        # all other deltas are 0. So score ≈ 0.1, still "smooth".
        assert transitions[0]['score'] <= FlowService.SMOOTH_THRESHOLD
        assert transitions[0]['verdict'] == 'smooth'

    def test_single_track_no_transitions(self):
        transitions = FlowService.analyse_transitions([DIVERSE_TRACKS[0]])
        assert transitions == []

    def test_two_tracks_one_transition(self):
        transitions = FlowService.analyse_transitions(DIVERSE_TRACKS[:2])
        assert len(transitions) == 1
