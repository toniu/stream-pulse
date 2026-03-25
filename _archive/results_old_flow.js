/**
 * pyAux - Results Page JavaScript
 * Playlist DNA — visualise mood, detect outliers, smart-reorder.
 * No scores, no ratings — just data.
 * Version: 4.0.0
 */

// ==================== AUDIO PLAYER MANAGER ====================

let currentAudio = null;
let currentPlayingId = null;
let currentYouTubeButton = null;

/**
 * Play or pause a track preview
 */
function togglePlayPause(trackId, previewUrl, buttonElement, trackName, artistName) {
    // If no Spotify preview, search YouTube instead
    if (!previewUrl) {
        searchYouTube(trackName, artistName, buttonElement);
        return;
    }
    
    // If this track is currently playing, pause it
    if (currentPlayingId === trackId && currentAudio) {
        currentAudio.pause();
        updatePlayButton(buttonElement, false);
        updateTrackItemState(trackId, false);
        return;
    }
    
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        if (currentPlayingId) {
            const oldButton = document.querySelector(`[data-track-id="${currentPlayingId}"]`);
            if (oldButton) updatePlayButton(oldButton, false);
            updateTrackItemState(currentPlayingId, false);
        }
    }
    
    // Create new audio instance
    currentAudio = new Audio(previewUrl);
    currentPlayingId = trackId;
    
    // Update button to loading state
    buttonElement.classList.add('loading');
    
    // Play the preview
    currentAudio.play().then(() => {
        buttonElement.classList.remove('loading');
        updatePlayButton(buttonElement, true);
        updateTrackItemState(trackId, true);
    }).catch(error => {
        console.error('Playback failed:', error);
        buttonElement.classList.remove('loading');
        currentAudio = null;
        currentPlayingId = null;
    });
    
    // When audio ends, reset button
    currentAudio.addEventListener('ended', () => {
        updatePlayButton(buttonElement, false);
        updateTrackItemState(trackId, false);
        currentAudio = null;
        currentPlayingId = null;
    });
}

/**
 * Search and play on YouTube
 */
async function searchYouTube(trackName, artistName, buttonElement) {
    try {
        // Show loading state
        showToast('Searching YouTube...');
        
        // Call backend to search YouTube
        const response = await fetch('/api/v1/youtube-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                track_name: trackName,
                artist_name: artistName
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.video_id) {
            // Open mini player with video ID
            openYouTubePlayer(data.video_id, `${trackName} - ${artistName}`, buttonElement);
        } else {
            showToast('Video not found on YouTube - preview unavailable');
        }
    } catch (error) {
        console.error('YouTube search error:', error);
        showToast('Failed to search YouTube - preview unavailable');
    }
}

/**
 * Open YouTube mini player
 */
function openYouTubePlayer(videoId, title, buttonElement) {
    const miniPlayer = document.getElementById('youtubeMiniPlayer');
    const container = document.getElementById('youtubePlayerContainer');
    const titleElement = document.getElementById('miniPlayerTitle');
    
    if (!miniPlayer || !container) return;
    
    // Remove playing-youtube class from previous button
    if (currentYouTubeButton) {
        currentYouTubeButton.classList.remove('playing-youtube');
    }
    
    // Add playing-youtube class to current button
    if (buttonElement) {
        buttonElement.classList.add('playing-youtube');
        currentYouTubeButton = buttonElement;
    }
    
    // Update title
    if (titleElement) titleElement.textContent = title;
    
    // Create YouTube embed URL with specific video ID
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    
    // Create iframe
    container.innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            src="${embedUrl}"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            title="YouTube video player">
        </iframe>
    `;
    
    // Show mini player
    miniPlayer.removeAttribute('hidden');
    miniPlayer.classList.add('show');
    
    showToast('Now playing on YouTube');
    
    // Stop any Spotify audio that might be playing
    if (currentAudio) {
        currentAudio.pause();
        if (currentPlayingId) {
            const oldButton = document.querySelector(`[data-track-id="${currentPlayingId}"]`);
            if (oldButton) updatePlayButton(oldButton, false);
            updateTrackItemState(currentPlayingId, false);
        }
        currentAudio = null;
        currentPlayingId = null;
    }
}

/**
 * Close YouTube mini player
 */
function closeYouTubePlayer() {
    const miniPlayer = document.getElementById('youtubeMiniPlayer');
    const container = document.getElementById('youtubePlayerContainer');
    
    if (!miniPlayer) return;
    
    // Remove playing-youtube class from button
    if (currentYouTubeButton) {
        currentYouTubeButton.classList.remove('playing-youtube');
        currentYouTubeButton = null;
    }
    
    // Clear iframe to stop playback
    if (container) container.innerHTML = '';
    
    // Hide mini player
    miniPlayer.classList.remove('show');
    setTimeout(() => {
        miniPlayer.setAttribute('hidden', '');
    }, 300);
}

/**
 * Update play button icon
 */
function updatePlayButton(button, isPlaying) {
    const svg = isPlaying ? 
        '<svg viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' :
        '<svg viewBox="0 0 24 24" fill="#000"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    button.innerHTML = svg;
}

/**
 * Update track item visual state
 */
function updateTrackItemState(trackId, isPlaying) {
    const trackItem = document.querySelector(`[data-track-item="${trackId}"]`);
    if (trackItem) {
        if (isPlaying) {
            trackItem.classList.add('playing');
        } else {
            trackItem.classList.remove('playing');
        }
    }
}

/**
 * Create play button HTML
 */
function createPlayButton(trackId, previewUrl, trackName, artistName) {
    const hasPreview = !!previewUrl;
    const isUnavailable = !hasPreview && (!trackName || !artistName);
    
    let buttonClass = 'play-button';
    let ariaLabel = 'Play track';
    let title = '';
    let iconColor = '#000';
    
    if (isUnavailable) {
        buttonClass = 'play-button unavailable';
        ariaLabel = 'Preview unavailable';
        title = 'Preview unavailable';
        iconColor = '#666';
    } else if (hasPreview) {
        ariaLabel = 'Play Spotify preview';
        title = 'Play 30s preview';
        iconColor = '#000';
    } else {
        buttonClass = 'play-button youtube-fallback';
        ariaLabel = 'Search on YouTube';
        title = 'Search on YouTube';
        iconColor = '#FFF';
    }
    
    // Use data attributes to avoid escaping issues
    return `<button class="${buttonClass}" 
        data-track-id="${escapeHtml(trackId)}" 
        data-preview-url="${hasPreview ? escapeHtml(previewUrl) : ''}" 
        data-track-name="${escapeHtml(trackName || '')}" 
        data-artist-name="${escapeHtml(artistName || '')}"
        ${isUnavailable ? 'disabled' : ''}
        aria-label="${ariaLabel}"
        title="${title}">
        <svg viewBox="0 0 24 24" fill="${iconColor}"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </button>`;
}

// ==================== TAB SWITCHING ====================

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected','false');
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
    }
    
    // Update panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('hidden', '');
    });
    
    const activePanel = document.getElementById(`${tabName}-panel`);
    if (activePanel) {
        activePanel.classList.add('active');
        activePanel.removeAttribute('hidden');
    }
}

// ==================== RESULTS LOADING ====================

if (document.getElementById('results-content')) {
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsError = document.getElementById('resultsError');
    const resultsData = document.getElementById('resultsData');
    
    /**
     * Load and display results
     */
    function loadResults() {
        const resultsJson = sessionStorage.getItem('playlistResults');
        
        if (!resultsJson) {
            showResultsError('No results found. Please analyse a playlist first.');
            return;
        }
        
        try {
            const results = JSON.parse(resultsJson);
            
            // Calculate derived fields
            const uniqueArtists = new Set();
            results.tracks?.forEach(track => {
                track.artist_info?.forEach(artist => {
                    uniqueArtists.add(artist.name);
                });
            });
            results.artist_count = uniqueArtists.size;
            
            const totalMs = results.tracks?.reduce((sum, track) => sum + (track.duration_ms || 0), 0) || 0;
            results.total_duration = totalMs;
            
            // Hide loading, show data
            if (resultsLoading) resultsLoading.style.display = 'none';
            if (resultsData) resultsData.style.display = 'block';
            
            // Display all sections
            displayPlaylistHeader(results);
            displayQuickStats(results);
            displayProfile(results);
            displayTracks(results.tracks);
            displayRecommendations(results.recommendations);
            setupTimeline(results);
            setupReorder(results);
            
        } catch (error) {
            console.error('Failed to load results:', error);
            showResultsError('Error loading results. Please try again.');
        }
    }
    
    /**
     * Show error state
     */
    function showResultsError(message) {
        if (resultsLoading) resultsLoading.style.display = 'none';
        if (resultsError) {
            resultsError.style.display = 'flex';
            const errorText = resultsError.querySelector('.error-text');
            if (errorText) errorText.textContent = message;
        }
    }
    
    /**
     * Display playlist header (no score badge)
     */
    function displayPlaylistHeader(results) {
        const playlistName = document.getElementById('playlistName');
        const playlistCover = document.getElementById('playlistCover');
        const playlistOwner = document.getElementById('playlistOwner');
        const trackCount = document.getElementById('trackCount');
        const playlistDuration = document.getElementById('playlistDuration');
        
        if (playlistName) playlistName.textContent = results.playlist_name || 'Playlist';
        if (playlistCover && results.playlist_image) {
            playlistCover.src = results.playlist_image;
            playlistCover.style.display = 'block';
        }
        if (playlistOwner) playlistOwner.textContent = 'by Spotify User';
        if (trackCount) trackCount.textContent = `${results.track_count} tracks`;
        if (playlistDuration) playlistDuration.textContent = formatTotalDuration(results.total_duration);
    }
    
    /**
     * Display quick stats
     */
    function displayQuickStats(results) {
        const artistCount = document.getElementById('artistCount');
        const genreCount = document.getElementById('genreCount');
        const avgDuration = document.getElementById('avgDuration');
        const eraSpan = document.getElementById('eraSpan');
        
        if (artistCount) artistCount.textContent = results.artist_count || 0;
        if (genreCount) genreCount.textContent = results.popular_genres?.length || 0;
        
        if (avgDuration && results.tracks?.length > 0) {
            const avg = results.tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / results.tracks.length;
            avgDuration.textContent = formatDuration(avg);
        }
        
        if (eraSpan) {
            eraSpan.textContent = getMostCommonEra(results.tracks);
        }
    }

    // ==================== PROFILE PANEL ====================

    /**
     * Display the Profile tab — personality, genres, stats, outliers
     */
    function displayProfile(results) {
        // Personality tags
        const personalityTags = document.getElementById('personalityTags');
        if (personalityTags) {
            const tags = generatePersonalityTags(results);
            personalityTags.innerHTML = tags.map(tag =>
                `<span class="personality-tag">${tag}</span>`
            ).join('');
        }

        // Personality text
        const personalityText = document.getElementById('personalityText');
        if (personalityText) {
            personalityText.textContent = generatePersonalityText(results);
        }

        // Genre list
        const genreList = document.getElementById('genreList');
        if (genreList && results.popular_genres) {
            genreList.innerHTML = results.popular_genres.map(g =>
                `<div class="genre-item">
                    <span class="genre-name">${escapeHtml(g.name)}</span>
                    <div class="genre-bar-bg"><div class="genre-bar-fill" style="width:${g.percentage}%"></div></div>
                    <span class="genre-pct">${g.percentage}%</span>
                </div>`
            ).join('');
        }

        // Key stats
        const keyStats = document.getElementById('keyStats');
        if (keyStats) {
            keyStats.innerHTML = generateKeyStats(results);
        }

        // Outliers
        const outliersList = document.getElementById('outliersList');
        if (outliersList) {
            displayOutliers(results.outliers, outliersList);
        }
    }

    /**
     * Display vibe outliers in the profile panel
     */
    function displayOutliers(outliers, container) {
        if (!outliers || outliers.length === 0) {
            container.innerHTML = '<p class="empty-outliers">No strong outliers detected.</p>';
            return;
        }

        container.innerHTML = outliers.map(o => {
            const featureTags = o.outlier_features.map(f =>
                `<span class="outlier-tag outlier-${f.direction}">${f.feature} ${f.direction === 'high' ? '↑' : '↓'}</span>`
            ).join('');
            return `<div class="outlier-item">
                <span class="outlier-position">#${o.position + 1}</span>
                <div class="outlier-info">
                    <span class="outlier-name">${escapeHtml(o.name)}</span>
                    <span class="outlier-artists">${escapeHtml(o.artists.join(', '))}</span>
                </div>
                <div class="outlier-tags">${featureTags}</div>
            </div>`;
        }).join('');
    }

    // ==================== TIMELINE ====================

    let timelineChart = null;

    /**
     * Build the mood/energy timeline Chart.js line chart
     */
    function setupTimeline(results) {
        const canvas = document.getElementById('timelineChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const timeline = results.timeline || [];
        if (timeline.length === 0) return;

        const labels = timeline.map((t, i) => `${i + 1}`);

        const featureConfig = {
            energy:       { label: 'Energy',    color: '#1DB954', hidden: false },
            valence:      { label: 'Mood',      color: '#BB86FC', hidden: false },
            danceability: { label: 'Dance',     color: '#FF9800', hidden: true },
            acousticness: { label: 'Acoustic',  color: '#03DAC6', hidden: true },
        };

        const datasets = Object.entries(featureConfig).map(([key, cfg]) => ({
            label: cfg.label,
            data: timeline.map(t => t[key]),
            borderColor: cfg.color,
            backgroundColor: cfg.color + '20',
            fill: false,
            tension: 0.35,
            pointRadius: timeline.length > 40 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            hidden: cfg.hidden,
        }));

        // Special treatment for tempo — normalise to 0-1 range
        const tempoValues = timeline.map(t => t.tempo).filter(v => v != null);
        if (tempoValues.length > 0) {
            const minTempo = Math.min(...tempoValues);
            const maxTempo = Math.max(...tempoValues);
            const range = maxTempo - minTempo || 1;
            datasets.push({
                label: 'Tempo (normalised)',
                data: timeline.map(t => t.tempo != null ? (t.tempo - minTempo) / range : null),
                borderColor: '#FF5252',
                backgroundColor: '#FF525220',
                fill: false,
                tension: 0.35,
                pointRadius: 0,
                borderWidth: 1.5,
                borderDash: [4, 4],
                hidden: true,
            });
        }

        const ctx = canvas.getContext('2d');
        timelineChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#B3B3B3', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' }
                    },
                    tooltip: {
                        backgroundColor: '#282828',
                        titleColor: '#fff',
                        bodyColor: '#B3B3B3',
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                const t = timeline[idx];
                                return t ? `${t.name} — ${(t.artists || []).join(', ')}` : `Track ${idx + 1}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0, max: 1,
                        ticks: { color: '#B3B3B3', callback: v => Math.round(v * 100) + '%' },
                        grid: { color: '#282828' }
                    },
                    x: {
                        ticks: { color: '#535353', maxTicksLimit: 20 },
                        grid: { display: false },
                        title: { display: true, text: 'Track Position', color: '#535353' }
                    }
                }
            }
        });

        // Wire up toggle chips
        const toggles = document.querySelectorAll('#timelineToggles .toggle-chip');
        toggles.forEach(chip => {
            const feature = chip.dataset.feature;
            const checkbox = chip.querySelector('input');
            if (!checkbox) return;
            checkbox.addEventListener('change', () => {
                const dsIndex = Object.keys(featureConfig).indexOf(feature);
                if (dsIndex === -1) return;
                timelineChart.setDatasetVisibility(dsIndex, checkbox.checked);
                chip.classList.toggle('active', checkbox.checked);
                timelineChart.update();
            });
        });
    }

    // ==================== REORDER ====================

    /**
     * Wire up the Smart Reorder panel
     */
    function setupReorder(results) {
        const shapePicker = document.getElementById('shapePicker');
        const reorderBtn = document.getElementById('reorderBtn');
        if (!shapePicker || !reorderBtn) return;

        let selectedShape = 'build-up';

        // Shape selection
        shapePicker.querySelectorAll('.shape-card').forEach(card => {
            card.addEventListener('click', () => {
                shapePicker.querySelectorAll('.shape-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedShape = card.dataset.shape;
            });
        });

        // Reorder button
        reorderBtn.addEventListener('click', async () => {
            reorderBtn.disabled = true;
            reorderBtn.textContent = 'Reordering…';

            try {
                const response = await fetch('/api/v1/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tracks: results.tracks,
                        shape: selectedShape
                    })
                });

                const data = await response.json();
                if (data.success && data.order) {
                    displayReorderedTracks(results.tracks, data.order);
                    showToast(`Reordered as "${selectedShape}"`);
                } else {
                    showToast('Reorder failed — try again');
                }
            } catch (err) {
                console.error('Reorder error:', err);
                showToast('Reorder failed — check connection');
            } finally {
                reorderBtn.disabled = false;
                reorderBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    Reorder Tracks`;
            }
        });
    }

    /**
     * Display the reordered track list
     */
    function displayReorderedTracks(tracks, order) {
        const container = document.getElementById('reorderResults');
        const list = document.getElementById('reorderedTracksList');
        if (!container || !list) return;

        container.style.display = 'block';
        list.innerHTML = '';

        order.forEach((origIdx, newIdx) => {
            const track = tracks[origIdx];
            if (!track) return;
            const trackId = `reorder-${track.name.replace(/[^a-z0-9]/gi, '')}-${newIdx}`;
            const energy = track.audio_features?.energy;
            const energyTag = energy != null
                ? `<span class="energy-tag" style="opacity:${0.4 + energy * 0.6}">${Math.round(energy * 100)}%</span>`
                : '';

            const el = document.createElement('div');
            el.className = 'track-item';
            el.setAttribute('role', 'listitem');
            el.setAttribute('data-track-item', trackId);
            el.innerHTML = `
                <span class="track-number">${newIdx + 1}</span>
                ${createPlayButton(trackId, track.preview_url, track.name, track.artists[0])}
                ${track.album_image_small ? `<img src="${track.album_image_small}" class="album-art" alt="${escapeHtml(track.album)}" loading="lazy">` : ''}
                <div class="track-info">
                    <div class="track-header">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        ${energyTag}
                    </div>
                    <div class="track-artists">${escapeHtml(track.artists.join(', '))}</div>
                </div>
            `;
            list.appendChild(el);
        });
    }
    
    /**
     * Display tracks with search and sort
     */
    function displayTracks(tracks) {
        const tracksList = document.getElementById('tracksList');
        if (!tracksList || !tracks) return;
        
        // Store original tracks for filtering
        window.allTracks = tracks;
        renderTracks(tracks);
        
        // Setup search
        const searchInput = document.getElementById('trackSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = tracks.filter(track => 
                    track.name.toLowerCase().includes(query) ||
                    track.artists.some(artist => artist.toLowerCase().includes(query)) ||
                    track.album.toLowerCase().includes(query)
                );
                renderTracks(filtered);
            });
        }
        
        // Setup sort
        let sortDirection = 'asc'; // Default to ascending
        const sortSelect = document.getElementById('trackSort');
        const sortOrderBtn = document.getElementById('sortOrderBtn');
        
        // Sort order toggle
        if (sortOrderBtn) {
            sortOrderBtn.addEventListener('click', () => {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                
                // Toggle button state
                sortOrderBtn.classList.toggle('descending', sortDirection === 'desc');
                
                // Toggle icon visibility - only show ONE arrow at a time
                const ascIcon = sortOrderBtn.querySelector('.sort-icon-asc');
                const descIcon = sortOrderBtn.querySelector('.sort-icon-desc');
                if (ascIcon && descIcon) {
                    if (sortDirection === 'asc') {
                        ascIcon.removeAttribute('hidden');
                        descIcon.setAttribute('hidden', '');
                    } else {
                        ascIcon.setAttribute('hidden', '');
                        descIcon.removeAttribute('hidden');
                    }
                }
                
                // Re-sort tracks
                const currentSort = sortSelect ? sortSelect.value : 'default';
                const sortedTracks = sortTracks([...tracks], currentSort, sortDirection);
                renderTracks(sortedTracks);
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                // Hide button for default sort, show for others
                if (sortOrderBtn) {
                    if (e.target.value === 'default') {
                        sortOrderBtn.style.display = 'none';
                    } else {
                        sortOrderBtn.style.display = 'flex';
                    }
                    // Reset to ascending when changing sort type
                    sortDirection = 'asc';
                    sortOrderBtn.classList.remove('descending');
                    const ascIcon = sortOrderBtn.querySelector('.sort-icon-asc');
                    const descIcon = sortOrderBtn.querySelector('.sort-icon-desc');
                    if (ascIcon && descIcon) {
                        ascIcon.removeAttribute('hidden');
                        descIcon.setAttribute('hidden', '');
                    }
                }
                
                const sortedTracks = sortTracks([...tracks], e.target.value, sortDirection);
                renderTracks(sortedTracks);
            });
        }
    }
    
    /**
     * Render tracks list
     */
    function renderTracks(tracks) {
        const tracksList = document.getElementById('tracksList');
        if (!tracksList) return;
        
        tracksList.innerHTML = '';
        
        tracks.forEach((track, index) => {
            // Create stable track ID based on track data
            const trackId = `track-${track.name.replace(/[^a-z0-9]/gi, '')}-${index}`;
            
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.setAttribute('role', 'listitem');
            trackElement.setAttribute('data-track-item', trackId);
            
            trackElement.innerHTML = `
                <span class="track-number">${index + 1}</span>
                ${createPlayButton(trackId, track.preview_url, track.name, track.artists[0])}
                ${track.album_image_small ? `<img src="${track.album_image_small}" class="album-art" alt="${escapeHtml(track.album)}" loading="lazy">` : ''}
                <div class="track-info">
                    <div class="track-header">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        ${track.explicit ? '<span class="explicit-badge">E</span>' : ''}
                    </div>
                    <div class="track-artists">${escapeHtml(track.artists.join(', '))}</div>
                    <div class="track-meta">
                        <span class="track-duration">${track.duration}</span>
                        <span>•</span>
                        <span>${escapeHtml(track.album)}</span>
                        ${track.spotify_url ? `<span>•</span><a href="${track.spotify_url}" target="_blank" class="spotify-link" rel="noopener noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; display: inline-block;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Spotify</a>` : ''}
                    </div>
                </div>
            `;
            tracksList.appendChild(trackElement);
        });
    }
    
    /**
     * Sort tracks
     */
    function sortTracks(tracks, sortBy, direction = 'asc') {
        const multiplier = direction === 'asc' ? 1 : -1;
        
        switch (sortBy) {
            case 'name':
                return tracks.sort((a, b) => multiplier * a.name.localeCompare(b.name));
            case 'artist':
                return tracks.sort((a, b) => multiplier * a.artists[0].localeCompare(b.artists[0]));
            case 'popularity':
                return tracks.sort((a, b) => multiplier * ((b.popularity || 0) - (a.popularity || 0)));
            case 'duration':
                return tracks.sort((a, b) => multiplier * (b.duration_ms - a.duration_ms));
            case 'energy':
                return tracks.sort((a, b) => multiplier * ((b.audio_features?.energy || 0) - (a.audio_features?.energy || 0)));
            default:
                return tracks;
        }
    }
    
    /**
     * Display recommendations
     */
    function displayRecommendations(recommendations) {
        const recommendationsList = document.getElementById('recommendationsList');
        const emptyState = document.getElementById('emptyRecommendations');
        
        if (!recommendationsList) return;
        
        if (!recommendations || recommendations.length === 0) {
            recommendationsList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        recommendationsList.innerHTML = '';
        
        recommendations.forEach((track, index) => {
            // Create stable track ID based on track data
            const trackId = `rec-${track.name.replace(/[^a-z0-9]/gi, '')}-${index}`;
            
            const recElement = document.createElement('div');
            recElement.className = 'recommendation-item';
            recElement.setAttribute('role', 'listitem');
            recElement.setAttribute('data-track-item', trackId);
            
            recElement.innerHTML = `
                ${createPlayButton(trackId, track.preview_url, track.name, track.artists[0])}
                ${track.album_image_small ? `<img src="${track.album_image_small}" class="album-art" alt="${escapeHtml(track.album)}" loading="lazy">` : ''}
                <div class="track-info">
                    <div class="track-header">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        ${track.explicit ? '<span class="explicit-badge">E</span>' : ''}
                    </div>
                    <div class="track-artists">${escapeHtml(track.artists.join(', '))}</div>
                    <div class="track-meta">
                        <span class="track-duration">${track.duration}</span>
                        <span>•</span>
                        <span>${escapeHtml(track.album)}</span>
                        ${track.release_year ? `<span>•</span><span>${track.release_year}</span>` : ''}
                    </div>
                    ${track.spotify_url ? `<div style="margin-top: 8px;"><a href="${track.spotify_url}" target="_blank" class="spotify-link" rel="noopener noreferrer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; display: inline-block;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Open in Spotify</a></div>` : ''}
                </div>
            `;
            recommendationsList.appendChild(recElement);
        });
    }
    
    // Load results after deferred scripts (Chart.js) are ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadResults);
    } else {
        loadResults();
    }
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatTotalDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function getMostCommonEra(tracks) {
    if (!tracks || tracks.length === 0) return '2020s';
    
    const decadeCounts = {};
    tracks.forEach(track => {
        if (track.release_year) {
            const decade = Math.floor(track.release_year / 10) * 10;
            decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
    });
    
    const mostCommon = Object.keys(decadeCounts).reduce((a, b) => 
        decadeCounts[a] > decadeCounts[b] ? a : b
    );
    
    return `${mostCommon}s`;
}

/**
 * Personality tags — derived from audio features and playlist shape.
 */
function generatePersonalityTags(results) {
    const tags = [];
    const tracks = results.tracks || [];

    // Calculate averages from audio features
    let totalEnergy = 0, totalValence = 0, totalDance = 0, totalAcoustic = 0, count = 0;
    tracks.forEach(t => {
        const af = t.audio_features;
        if (!af) return;
        totalEnergy += af.energy || 0;
        totalValence += af.valence || 0;
        totalDance += af.danceability || 0;
        totalAcoustic += af.acousticness || 0;
        count++;
    });

    if (count > 0) {
        const avgEnergy = totalEnergy / count;
        const avgValence = totalValence / count;
        const avgDance = totalDance / count;
        const avgAcoustic = totalAcoustic / count;

        if (avgEnergy > 0.7) tags.push('High Energy');
        else if (avgEnergy < 0.35) tags.push('Chill');

        if (avgValence > 0.65) tags.push('Feel-Good');
        else if (avgValence < 0.35) tags.push('Moody');

        if (avgDance > 0.7) tags.push('Danceable');
        if (avgAcoustic > 0.6) tags.push('Acoustic');
    }

    // Artist breadth
    const uniqueArtists = new Set(tracks.flatMap(t => t.artists || []));
    if (uniqueArtists.size > tracks.length * 0.8) tags.push('Wide Roster');
    else if (uniqueArtists.size < tracks.length * 0.3) tags.push('Artist-Centric');

    // Outlier count
    if (results.outliers && results.outliers.length > 3) tags.push('Dynamic');

    return tags.length > 0 ? tags : ['Unique'];
}

/**
 * One-paragraph personality summary
 */
function generatePersonalityText(results) {
    const genreCount = results.popular_genres?.length || 0;
    const tracks = results.tracks || [];

    let totalEnergy = 0, count = 0;
    tracks.forEach(t => { if (t.audio_features) { totalEnergy += t.audio_features.energy; count++; } });
    const avgEnergy = count > 0 ? totalEnergy / count : 0.5;
    const energyLabel = avgEnergy > 0.65 ? 'high energy' : avgEnergy < 0.4 ? 'mellow' : 'moderate energy';
    const outlierCount = results.outliers?.length || 0;

    return `This playlist features ${results.artist_count} artists across ${genreCount} genre areas with ${energyLabel} overall. ${outlierCount > 0 ? `${outlierCount} track${outlierCount > 1 ? 's' : ''} stand${outlierCount === 1 ? 's' : ''} out as vibe outlier${outlierCount > 1 ? 's' : ''}.` : 'No major vibe outliers detected.'}`;
}

function generateKeyStats(results) {
    const tracks = results.tracks || [];
    let totalEnergy = 0, totalValence = 0, count = 0;
    tracks.forEach(t => {
        if (t.audio_features) {
            totalEnergy += t.audio_features.energy;
            totalValence += t.audio_features.valence;
            count++;
        }
    });

    return `
        <div class="stat-item-insight">
            <div class="label">Total Tracks</div>
            <div class="value">${results.track_count}</div>
        </div>
        <div class="stat-item-insight">
            <div class="label">Unique Artists</div>
            <div class="value">${results.artist_count}</div>
        </div>
        <div class="stat-item-insight">
            <div class="label">Duration</div>
            <div class="value">${formatTotalDuration(results.total_duration)}</div>
        </div>
        <div class="stat-item-insight">
            <div class="label">Avg Energy</div>
            <div class="value">${count > 0 ? Math.round((totalEnergy / count) * 100) + '%' : '—'}</div>
        </div>
        <div class="stat-item-insight">
            <div class="label">Avg Mood</div>
            <div class="value">${count > 0 ? Math.round((totalValence / count) * 100) + '%' : '—'}</div>
        </div>
    `;
}

function generateTextReport(results) {
    const tracks = results.tracks || [];
    let totalEnergy = 0, totalValence = 0, count = 0;
    tracks.forEach(t => {
        if (t.audio_features) { totalEnergy += t.audio_features.energy; totalValence += t.audio_features.valence; count++; }
    });

    return `
PLAYLIST DNA
Generated by pyAux — ${new Date().toLocaleDateString()}

Playlist: ${results.playlist_name}
Tracks: ${results.track_count}  |  Artists: ${results.artist_count}

AUDIO AVERAGES:
  Energy: ${count > 0 ? Math.round((totalEnergy / count) * 100) + '%' : '—'}
  Mood:   ${count > 0 ? Math.round((totalValence / count) * 100) + '%' : '—'}

TOP GENRES:
${results.popular_genres?.map(g => `  ${g.name}: ${g.percentage}%`).join('\n') || '  (none)'}

OUTLIERS (${results.outliers?.length || 0}):
${results.outliers?.map(o => `  #${o.position + 1} ${o.name} — ${o.outlier_features.map(f => `${f.feature} ${f.direction}`).join(', ')}`).join('\n') || '  none'}

—
Analysed with pyAux · playlist-dna
`;
}

// ==================== SHARE FUNCTIONALITY ====================

function shareResults() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        generateShareCard();
    }
}

function closeShare() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

function generateShareCard() {
    const shareCard = document.getElementById('shareCard');
    const results = JSON.parse(sessionStorage.getItem('playlistResults') || '{}');
    if (!shareCard || !results.playlist_name) return;

    const tags = generatePersonalityTags(results);
    shareCard.innerHTML = `
        <div style="background: linear-gradient(135deg, #1DB954, #1ed760); padding: 40px; border-radius: 16px; color: #000; text-align: center;">
            <h2 style="font-size: 2rem; margin-bottom: 16px;">${escapeHtml(results.playlist_name)}</h2>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0;">
                ${tags.map(t => `<span style="background:rgba(0,0,0,.15);padding:4px 12px;border-radius:12px;font-size:0.85rem;">${t}</span>`).join('')}
            </div>
            <p style="font-size: 1.1rem; margin: 12px 0;">${results.track_count} tracks · ${results.artist_count} artists</p>
            <p style="font-size: 0.9rem; opacity: 0.8;">Analysed with pyAux · playlist-dna</p>
        </div>
    `;
}

function downloadImage() {
    const shareCard = document.getElementById('shareCard');
    if (!shareCard || typeof html2canvas === 'undefined') {
        showToast('Download feature requires html2canvas library');
        return;
    }
    html2canvas(shareCard).then(canvas => {
        const link = document.createElement('a');
        link.download = 'pyaux-dna.png';
        link.href = canvas.toDataURL();
        link.click();
        showToast('Image downloaded!');
    });
}

function downloadReport() {
    const results = JSON.parse(sessionStorage.getItem('playlistResults') || '{}');
    const report = generateTextReport(results);
    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pyaux-dna-${Date.now()}.txt`;
    link.click();
    showToast('Report downloaded!');
}

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Setup play button event listeners
function setupPlayButtonListeners() {
    document.addEventListener('click', function(e) {
        const button = e.target.closest('.play-button');
        if (!button || button.disabled) return;
        
        const trackId = button.dataset.trackId;
        const previewUrl = button.dataset.previewUrl || null;
        const trackName = button.dataset.trackName;
        const artistName = button.dataset.artistName;
        
        togglePlayPause(trackId, previewUrl, button, trackName, artistName);
    });
}

// Make functions globally accessible
window.switchTab = switchTab;
window.closeYouTubePlayer = closeYouTubePlayer;
window.shareResults = shareResults;

// Initialize play button listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPlayButtonListeners);
} else {
    setupPlayButtonListeners();
}
window.closeShare = closeShare;
window.downloadImage = downloadImage;
window.downloadReport = downloadReport;
window.shareTwitter = () => showToast('Twitter sharing coming soon!');
window.shareLinkedIn = () => showToast('LinkedIn sharing coming soon!');
window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!');
};
window.toggleSettings = () => showToast('Settings coming soon!');
