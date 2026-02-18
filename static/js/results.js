/**
 * pyAux - Results Page JavaScript
 * Enhanced with visualisations, search, and sharing
 * Version: 2.0.0
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
            
            // Calculate missing fields
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
            displayRatings(results);
            displaySuggestions(results);
            displayTracks(results.tracks);
            displayRecommendations(results.recommendations);
            displayInsights(results);
            
            // Charts removed from UI
            // createGenreChart(results.popular_genres);
            // createPopularityChart(results.tracks);
            // createTimelineChart(results.tracks);
            
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
     * Display playlist header
     */
    function displayPlaylistHeader(results) {
        const playlistName = document.getElementById('playlistName');
        const playlistCover = document.getElementById('playlistCover');
        const playlistOwner = document.getElementById('playlistOwner');
        const trackCount = document.getElementById('trackCount');
        const playlistDuration = document.getElementById('playlistDuration');
        const overallScoreBadge = document.getElementById('overallScoreBadge');
        const ratingRank = document.getElementById('ratingRank');
        
        if (playlistName) playlistName.textContent = results.playlist_name || 'Playlist';
        if (playlistCover && results.playlist_image) {
            playlistCover.src = results.playlist_image;
            playlistCover.style.display = 'block';
        }
        if (playlistOwner) playlistOwner.textContent = `by Spotify User`;
        if (trackCount) trackCount.textContent = `${results.track_count} tracks`;
        if (playlistDuration) playlistDuration.textContent = formatTotalDuration(results.total_duration);
        
        const overall = Math.round(results.ratings.overall_rating);
        if (overallScoreBadge) overallScoreBadge.textContent = overall;
        if (ratingRank) ratingRank.textContent = getRatingRank(overall);
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
            const era = getMostCommonEra(results.tracks);
            eraSpan.textContent = era;
        }
    }
    
    /**
     * Display ratings cards
     */
    function displayRatings(results) {
        const ratings = results.ratings;
        
        // Artist Diversity
        updateRatingCard('artist', 
            Math.round(ratings.artist_diversity_rating),
            getRatingDescription('artist', ratings.artist_diversity_rating, results)
        );
        
        // Genre Cohesion
        updateRatingCard('genre',
            Math.round(ratings.genre_cohesion_rating),
            getRatingDescription('genre', ratings.genre_cohesion_rating, results)
        );
        
        // Popularity Balance
        updateRatingCard('popularity',
            Math.round(ratings.popularity_rating),
            getRatingDescription('popularity', ratings.popularity_rating, results)
        );
        
        // Playlist Length
        updateRatingCard('length',
            Math.round(ratings.playlist_length_rating),
            getRatingDescription('length', ratings.playlist_length_rating, results)
        );
        
        // Era Diversity
        if (ratings.era_diversity_rating !== undefined) {
            updateRatingCard('era',
                Math.round(ratings.era_diversity_rating),
                getRatingDescription('era', ratings.era_diversity_rating, results)
            );
        }
    }
    
    /**
     * Update a rating card
     */
    function updateRatingCard(type, score, description) {
        const ratingElement = document.getElementById(`${type}Rating`);
        const descElement = document.getElementById(`${type}Description`);
        const progressElement = document.getElementById(`${type}Progress`);
        const cardElement = document.querySelector(`[data-rating="${type}"]`);
        
        if (ratingElement) {
            ratingElement.textContent = score;
            applyScoreClass(ratingElement, score);
            
            // Apply color to icon SVG as well
            if (cardElement) {
                const iconSvg = cardElement.querySelector('.card-icon svg');
                if (iconSvg) {
                    applyScoreClass(iconSvg, score);
                }
            }
        }
        
        if (descElement) descElement.textContent = description;
        
        if (progressElement) {
            applyScoreClass(progressElement, score);
            setTimeout(() => {
                progressElement.style.width = `${score}%`;
            }, 300);
        }
    }
    
    /**
     * Get rating description
     */
    function getRatingDescription(type, score, results) {
        const roundedScore = Math.round(score);
        
        switch (type) {
            case 'artist':
                if (roundedScore >= 80) return `Excellent variety with ${results.artist_count} artists`;
                if (roundedScore >= 60) return `Good diversity across ${results.artist_count} artists`;
                return `Could use more variety in artists`;
            
            case 'genre':
                if (roundedScore >= 80) return 'Highly cohesive playlist';
                if (roundedScore >= 60) return 'Well-balanced genre mix';
                return 'Somewhat scattered across genres';
            
            case 'popularity':
                if (roundedScore >= 80) return 'Perfect mix of hits and discoveries';
                if (roundedScore >= 60) return 'Good balance of popular and niche';
                return 'Consider adding more variety';
            
            case 'length':
                if (roundedScore >= 80) return 'Optimal playlist length';
                if (roundedScore >= 60) return 'Decent length for most occasions';
                return 'Playlist might be too long/short';
            
            case 'era':
                if (roundedScore >= 80) return 'Great time span diversity';
                if (roundedScore >= 60) return 'Good era representation';
                return 'Concentrated in specific era';
            
            default:
                return 'Analysing...';
        }
    }
    
    /**
     * Display improvement suggestions
     */
    function displaySuggestions(results) {
        const suggestionsList = document.getElementById('suggestionsList');
        if (!suggestionsList) return;
        
        suggestionsList.innerHTML = '';
        const suggestions = generateSuggestions(results);
        
        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion';
            suggestionElement.innerHTML = `
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <h4>${suggestion.title}</h4>
                    <p>${suggestion.description}</p>
                    ${suggestion.action ? `<button onclick="${suggestion.action}">${suggestion.actionLabel}</button>` : ''}
                </div>
            `;
            suggestionsList.appendChild(suggestionElement);
        });
    }
    
    /**
     * Generate improvement suggestions
     */
    function generateSuggestions(results) {
        const suggestions = [];
        const ratings = results.ratings;
        const targetScore = 95;
        const currentScore = Math.round(ratings.overall_rating);
        
        if (currentScore >= targetScore) {
            return [{
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
                title: 'Excellent Playlist!',
                description: 'Your playlist is already highly optimised. Keep up the great work!',
                action: null
            }];
        }
        
        // Check each category
        if (ratings.artist_diversity_rating < 75) {
            suggestions.push({
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
                title: 'Add More Artists',
                description: `Increase artist variety to boost diversity. Try adding tracks from ${Math.max(5 - results.artist_count, 1)} more unique artists.`,
                action: 'switchTab("recommendations")',
                actionLabel: 'View Recommendations'
            });
        }
        
        if (ratings.genre_cohesion_rating < 75) {
            suggestions.push({
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
                title: 'Refine Genre Focus',
                description: 'Consider focusing on fewer genres or adding more tracks from your primary genres.',
                action: null
            });
        }
        
        if (ratings.playlist_length_rating < 75) {
            const isLong = results.track_count > 50;
            suggestions.push({
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path></svg>',
                title: isLong ? 'Trim Playlist Length' : 'Add More Tracks',
                description: isLong ? 
                    `Consider removing ${results.track_count - 50} tracks for optimal engagement.` :
                    `Add ${50 - results.track_count} more tracks to reach ideal length.`,
                action: isLong ? null : 'switchTab("recommendations")',
                actionLabel: 'View Recommendations'
            });
        }
        
        if (ratings.popularity_rating < 75) {
            suggestions.push({
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
                title: 'Balance Popularity',
                description: 'Mix in more underground or mainstream tracks for better balance.',
                action: 'switchTab("recommendations")',
                actionLabel: 'View Recommendations'
            });
        }
        
        return suggestions;
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
        const sortSelect = document.getElementById('trackSort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const sortedTracks = sortTracks([...tracks], e.target.value);
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
    function sortTracks(tracks, sortBy) {
        switch (sortBy) {
            case 'name':
                return tracks.sort((a, b) => a.name.localeCompare(b.name));
            case 'artist':
                return tracks.sort((a, b) => a.artists[0].localeCompare(b.artists[0]));
            case 'popularity':
                return tracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            case 'duration':
                return tracks.sort((a, b) => b.duration_ms - a.duration_ms);
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
    
    /**
     * Display insights
     */
    function displayInsights(results) {
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
        
        // Key stats
        const keyStats = document.getElementById('keyStats');
        if (keyStats) {
            keyStats.innerHTML = generateKeyStats(results);
        }
        
        // Highlights
        const highlightsList = document.getElementById('highlightsList');
        if (highlightsList) {
            const highlights = generateHighlights(results);
            highlightsList.innerHTML = highlights.map(h => 
                `<div class="highlight-item">
                    <span>${h.icon}</span>
                    <span>${h.text}</span>
                </div>`
            ).join('');
        }
        
        // Warnings
        const warningsList = document.getElementById('warningsList');
        if (warningsList) {
            const warnings = generateWarnings(results);
            warningsList.innerHTML = warnings.length > 0 ? 
                warnings.map(w => 
                    `<div class="warning-item">
                        <span>${w.icon}</span>
                        <span>${w.text}</span>
                    </div>`
                ).join('') :
                '<p style="color: var(--text-secondary); text-align: center;">No issues detected! <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2" style="vertical-align: text-bottom; display: inline-block;"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></p>';
        }
    }
    
    // Load results on page load
    loadResults();
}

// ==================== VISUALISATION FUNCTIONS ====================

/**
 * Create genre distribution chart
 */
function createGenreChart(genres) {
    const canvas = document.getElementById('genreChart');
    if (!canvas || typeof Chart === 'undefined' || !genres) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: genres.map(g => g.name),
            datasets: [{
                data: genres.map(g => g.percentage),
                backgroundColor: [
                    '#1DB954', '#1ed760', '#1AA34A',
                    '#169c46', '#128a3f', '#0e7838'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#B3B3B3', font: { size: 12 } }
                }
            }
        }
    });
}

/**
 * Create popularity distribution chart
 */
function createPopularityChart(tracks) {
    const canvas = document.getElementById('popularityChart');
    if (!canvas || typeof Chart === 'undefined' || !tracks) return;
    
    // Create histogram of popularity
    const bins = [0, 20, 40, 60, 80, 100];
    const counts = new Array(bins.length - 1).fill(0);
    
    tracks.forEach(track => {
        if (track.popularity !== undefined) {
            const binIndex = Math.min(Math.floor(track.popularity / 20), counts.length - 1);
            counts[binIndex]++;
        }
    });
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0-20', '20-40', '40-60', '60-80', '80-100'],
            datasets: [{
                label: 'Track Count',
                data: counts,
                backgroundColor: '#1DB954'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#B3B3B3' },
                    grid: { color: '#282828' }
                },
                x: {
                    ticks: { color: '#B3B3B3' },
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Create release timeline chart
 */
function createTimelineChart(tracks) {
    const canvas = document.getElementById('timelineChart');
    if (!canvas || typeof Chart === 'undefined' || !tracks) return;
    
    // Group tracks by year
    const yearCounts = {};
    tracks.forEach(track => {
        if (track.release_year) {
            yearCounts[track.release_year] = (yearCounts[track.release_year] || 0) + 1;
        }
    });
    
    const sortedYears = Object.keys(yearCounts).sort();
    const counts = sortedYears.map(year => yearCounts[year]);
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears,
            datasets: [{
                label: 'Tracks per Year',
                data: counts,
                borderColor: '#1DB954',
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#B3B3B3' },
                    grid: { color: '#282828' }
                },
                x: {
                    ticks: { 
                        color: '#B3B3B3',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// ==================== SHARE FUNCTIONALITY ====================

/**
 * Share results
 */
function shareResults() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        generateShareCard();
    }
}

/**
 * Close share modal
 */
function closeShare() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Generate share card
 */
function generateShareCard() {
    const shareCard = document.getElementById('shareCard');
    const results = JSON.parse(sessionStorage.getItem('playlistResults') || '{}');
    
    if (shareCard && results.playlist_name) {
        const score = Math.round(results.ratings.overall_rating);
        shareCard.innerHTML = `
            <div style="background: linear-gradient(135deg, #1DB954, #1ed760); padding: 40px; border-radius: 16px; color: #000; text-align: center;">
                <h2 style="font-size: 2rem; margin-bottom: 16px;">${escapeHtml(results.playlist_name)}</h2>
                <div style="font-size: 4rem; font-weight: 900; margin: 20px 0;">${score}/100</div>
                <p style="font-size: 1.2rem; margin: 16px 0;">Overall Score</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">Analysed with pyAux</p>
            </div>
        `;
    }
}

/**
 * Download share image
 */
function downloadImage() {
    const shareCard = document.getElementById('shareCard');
    if (!shareCard || typeof html2canvas === 'undefined') {
        showToast('Download feature requires html2canvas library');
        return;
    }
    
    html2canvas(shareCard).then(canvas => {
        const link = document.createElement('a');
        link.download = 'pyaux-analysis.png';
        link.href = canvas.toDataURL();
        link.click();
        showToast('Image downloaded!');
    });
}

/**
 * Export report
 */
function downloadReport() {
    const results = JSON.parse(sessionStorage.getItem('playlistResults') || '{}');
    const report = generateTextReport(results);
    
    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pyaux-analysis-${Date.now()}.txt`;
    link.click();
    
    showToast('Report downloaded!');
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

function getScoreColor(score) {
    if (score >= 90) return 'var(--score-excellent)';
    if (score >= 80) return 'var(--score-very-good)';
    if (score >= 70) return 'var(--score-good)';
    if (score >= 60) return 'var(--score-fair)';
    if (score >= 50) return 'var(--score-poor)';
    if (score >= 40) return 'var(--score-very-poor)';
    return 'var(--score-fail)';
}

function applyScoreClass(element, score) {
    // Remove all score classes
    element.classList.remove('score-excellent', 'score-very-good', 'score-good', 'score-fair', 'score-poor', 'score-very-poor', 'score-fail');
    
    // Apply new class based on 7-level scale
    if (score >= 90) {
        element.classList.add('score-excellent');
    } else if (score >= 80) {
        element.classList.add('score-very-good');
    } else if (score >= 70) {
        element.classList.add('score-good');
    } else if (score >= 60) {
        element.classList.add('score-fair');
    } else if (score >= 50) {
        element.classList.add('score-poor');
    } else if (score >= 40) {
        element.classList.add('score-very-poor');
    } else {
        element.classList.add('score-fail');
    }
}

function getRatingRank(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Work';
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

function generatePersonalityTags(results) {
    const tags = [];
    const ratings = results.ratings;
    
    if (ratings.artist_diversity_rating > 80) tags.push('Diverse');
    if (ratings.genre_cohesion_rating > 80) tags.push('Focused');
    if (ratings.popularity_rating > 80) tags.push('Balanced');
    if (ratings.era_diversity_rating > 80) tags.push('Timeless');
    
    return tags.length > 0 ? tags : ['Unique'];
}

function generatePersonalityText(results) {
    return `Your playlist has a unique character with ${results.artist_count} artists across ${results.popular_genres?.length || 0} genres. Perfect for listeners who appreciate ${results.ratings.genre_cohesion_rating > 70 ? 'focused, cohesive' : 'varied, eclectic'} music collections.`;
}

function generateKeyStats(results) {
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
            <div class="label">Avg Track</div>
            <div class="value">${formatDuration(results.total_duration / results.track_count)}</div>
        </div>
    `;
}

function generateHighlights(results) {
    const highlights = [];
    const ratings = results.ratings;
    
    if (ratings.overall_rating >= 85) {
        highlights.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>', text: 'Top-tier playlist quality!' });
    }
    if (ratings.artist_diversity_rating >= 85) {
        highlights.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>', text: 'Excellent artist variety' });
    }
    if (ratings.genre_cohesion_rating >= 85) {
        highlights.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>', text: 'Highly cohesive genre selection' });
    }
    
    return highlights;
}

function generateWarnings(results) {
    const warnings = [];
    const ratings = results.ratings;
    
    if (ratings.artist_diversity_rating < 50) {
        warnings.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>', text: 'Limited artist diversity' });
    }
    if (results.track_count > 100) {
        warnings.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', text: 'Playlist might be too long' });
    }
    if (results.track_count < 10) {
        warnings.push({ icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-yellow)" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', text: 'Playlist might be too short' });
    }
    
    return warnings;
}

function generateTextReport(results) {
    return `
PLAYLIST ANALYSIS REPORT
Generated by pyAux - ${new Date().toLocaleDateString()}

PLAYLIST: ${results.playlist_name}
TRACKS: ${results.track_count}
ARTISTS: ${results.artist_count}
OVERALL SCORE: ${Math.round(results.ratings.overall_rating)}/100

RATINGS:
- Artist Diversity: ${Math.round(results.ratings.artist_diversity_rating)}%
- Genre Cohesion: ${Math.round(results.ratings.genre_cohesion_rating)}%
- Popularity Balance: ${Math.round(results.ratings.popularity_rating)}%
- Playlist Length: ${Math.round(results.ratings.playlist_length_rating)}%
${results.ratings.era_diversity_rating ? `- Era Diversity: ${Math.round(results.ratings.era_diversity_rating)}%` : ''}

TOP GENRES:
${results.popular_genres?.map(g => `- ${g.name}: ${g.percentage}%`).join('\n')}

---
Analysed with pyAux Spotify Playlist Analyser
`;
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
