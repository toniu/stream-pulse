/**
 * pyAux - Results Page JavaScript
 * Enhanced with visualizations, search, and sharing
 * Version: 2.0.0
 */

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

if (document.getElementById('resultsContent')) {
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsError = document.getElementById('resultsError');
    const resultsData = document.getElementById('resultsData');
    const headerActions = document.getElementById('headerActions');
    
    /**
     * Load and display results
     */
    function loadResults() {
        const resultsJson = sessionStorage.getItem('playlistResults');
        
        if (!resultsJson) {
            showResultsError('No results found. Please analyze a playlist first.');
            return;
        }
        
        try {
            const results = JSON.parse(resultsJson);
            
            // Hide loading, show data
            if (resultsLoading) resultsLoading.style.display = 'none';
            if (resultsData) resultsData.style.display = 'block';
            if (headerActions) headerActions.style.display = 'flex';
            
            // Display all sections
            displayPlaylistHeader(results);
            displayQuickStats(results);
            displayRatings(results);
            displaySuggestions(results);
            displayTracks(results.tracks);
            displayRecommendations(results.recommendations);
            displayInsights(results);
            
            // Create visualizations
            createGenreChart(results.popular_genres);
            createPopularityChart(results.tracks);
            createTimelineChart(results.tracks);
            
        } catch (error) {
            showResultsError('Error loading results. Please try again.');
            console.error('Error:', error);
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
        if (playlistOwner) playlistOwner.textContent = `by ${results.playlist_owner || 'User'}`;
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
            const avg = results.tracks.reduce((sum, t) => sum + t.duration_ms, 0) / results.tracks.length;
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
        
        if (ratingElement) {
            ratingElement.textContent = score;
            ratingElement.parentElement.style.color = getScoreColor(score);
        }
        
        if (descElement) descElement.textContent = description;
        
        if (progressElement) {
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
                return 'Analyzing...';
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
                icon: '🎉',
                title: 'Excellent Playlist!',
                description: 'Your playlist is already highly optimized. Keep up the great work!',
                action: null
            }];
        }
        
        // Check each category
        if (ratings.artist_diversity_rating < 75) {
            suggestions.push({
                icon: '👥',
                title: 'Add More Artists',
                description: `Increase artist variety to boost diversity. Try adding tracks from ${Math.max(5 - results.artist_count, 1)} more unique artists.`,
                action: 'switchTab("recommendations")',
                actionLabel: 'View Recommendations'
            });
        }
        
        if (ratings.genre_cohesion_rating < 75) {
            suggestions.push({
                icon: '🎭',
                title: 'Refine Genre Focus',
                description: 'Consider focusing on fewer genres or adding more tracks from your primary genres.',
                action: null
            });
        }
        
        if (ratings.playlist_length_rating < 75) {
            const isLong = results.track_count > 50;
            suggestions.push({
                icon: '✂️',
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
                icon: '⭐',
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
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.setAttribute('role', 'listitem');
            
            trackElement.innerHTML = `
                <span class="track-number">${index + 1}</span>
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
                        ${track.spotify_url ? `<span>•</span><a href="${track.spotify_url}" target="_blank" class="spotify-link" rel="noopener noreferrer">🎵 Spotify</a>` : ''}
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
        
        recommendations.forEach(track => {
            const recElement = document.createElement('div');
            recElement.className = 'recommendation-item';
            recElement.setAttribute('role', 'listitem');
            
            recElement.innerHTML = `
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
                    ${track.spotify_url ? `<div style="margin-top: 8px;"><a href="${track.spotify_url}" target="_blank" class="spotify-link" rel="noopener noreferrer">🎵 Open in Spotify</a></div>` : ''}
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
                '<p style="color: var(--text-secondary); text-align: center;">No issues detected! 🎉</p>';
        }
    }
    
    // Load results on page load
    loadResults();
}

// ==================== VISUALIZATION FUNCTIONS ====================

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
                <p style="font-size: 0.9rem; opacity: 0.8;">Analyzed with pyAux</p>
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
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--warning-yellow)';
    return 'var(--error-red)';
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
        highlights.push({ icon: '🏆', text: 'Top-tier playlist quality!' });
    }
    if (ratings.artist_diversity_rating >= 85) {
        highlights.push({ icon: '👥', text: 'Excellent artist variety' });
    }
    if (ratings.genre_cohesion_rating >= 85) {
        highlights.push({ icon: '🎭', text: 'Highly cohesive genre selection' });
    }
    
    return highlights;
}

function generateWarnings(results) {
    const warnings = [];
    const ratings = results.ratings;
    
    if (ratings.artist_diversity_rating < 50) {
        warnings.push({ icon: '⚠️', text: 'Limited artist diversity' });
    }
    if (results.track_count > 100) {
        warnings.push({ icon: '📊', text: 'Playlist might be too long' });
    }
    if (results.track_count < 10) {
        warnings.push({ icon: '📊', text: 'Playlist might be too short' });
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
Analyzed with pyAux Spotify Playlist Analyzer
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

// Make functions globally accessible
window.switchTab = switchTab;
window.shareResults = shareResults;
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
