/**
 * pyAux - Spotify Playlist Analyser
 * Main JavaScript file for handling user interactions and API calls
 */

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show an element with fade-in animation
 * @param {HTMLElement} element - The element to show
 */
function showElement(element) {
    element.style.display = 'flex';
    element.classList.add('show');
}

/**
 * Hide an element
 * @param {HTMLElement} element - The element to hide
 */
function hideElement(element) {
    element.style.display = 'none';
    element.classList.remove('show');
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }
}

/**
 * Animate a rating bar to a specific percentage
 * @param {string} barId - ID of the bar element
 * @param {number} percentage - Target percentage (0-100)
 * @param {number} delay - Animation delay in milliseconds
 */
function animateBar(barId, percentage, delay = 0) {
    const bar = document.getElementById(barId);
    if (bar) {
        setTimeout(() => {
            bar.style.width = percentage + '%';
        }, delay);
    }
}

/**
 * Animate the circular progress indicator
 * @param {number} percentage - Target percentage (0-100)
 */
function animateCircle(percentage) {
    const circle = document.getElementById('overallCircle');
    if (circle) {
        // Calculate stroke-dashoffset based on percentage
        // Circle circumference = 2 * π * radius = 2 * π * 85 ≈ 534
        const circumference = 534;
        const offset = circumference - (percentage / 100) * circumference;
        
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 300);
    }
}

// ==================== HOME PAGE (index.html) ====================

// Check if we're on the home page
if (document.getElementById('analyseForm')) {
    const form = document.getElementById('analyseForm');
    const urlInput = document.getElementById('playlistUrl');
    const loadingAnimation = document.getElementById('loadingAnimation');
    
    /**
     * Handle form submission
     * Sends playlist URL to backend for analysis
     */
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Get and validate URL
        const playlistUrl = urlInput.value.trim();
        
        if (!playlistUrl) {
            showError('Please enter a Spotify playlist URL');
            return;
        }
        
        // Show loading animation
        showElement(loadingAnimation);
        hideElement(document.getElementById('errorMessage'));
        
        try {
            // Send request to Flask backend
            const response = await fetch('/analyse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlist_url: playlistUrl
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyse playlist');
            }
            
            if (data.success) {
                // Store results in sessionStorage for results page
                sessionStorage.setItem('playlistResults', JSON.stringify(data));
                
                // Redirect to results page
                window.location.href = '/results';
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
            
        } catch (error) {
            hideElement(loadingAnimation);
            showError(error.message);
            console.error('Error:', error);
        }
    });
}

// ==================== RESULTS PAGE (results.html) ====================

// Check if we're on the results page
if (document.getElementById('resultsContent')) {
    // DOM elements
    const resultsLoading = document.getElementById('resultsLoading');
    const resultsError = document.getElementById('resultsError');
    const resultsData = document.getElementById('resultsData');
    
    /**
     * Load and display results from sessionStorage
     */
    function loadResults() {
        // Get results from sessionStorage
        const resultsJson = sessionStorage.getItem('playlistResults');
        
        if (!resultsJson) {
            // No results found - show error
            showResultsError('No results found. Please analyse a playlist first.');
            return;
        }
        
        try {
            const results = JSON.parse(resultsJson);
            
            // Hide loading, show data
            hideElement(resultsLoading);
            resultsData.style.display = 'block';
            
            // Populate the page with results
            displayResults(results);
            
        } catch (error) {
            showResultsError('Error loading results. Please try again.');
            console.error('Error:', error);
        }
    }
    
    /**
     * Show error state on results page
     * @param {string} message - Error message to display
     */
    function showResultsError(message) {
        hideElement(resultsLoading);
        resultsError.style.display = 'flex';
        resultsError.querySelector('.error-text').textContent = message;
    }
    
    /**
     * Display all results on the page
     * @param {Object} results - Results object from backend
     */
    function displayResults(results) {
        // Playlist header with cover image
        if (results.playlist_image) {
            const playlistHeader = document.querySelector('.playlist-header');
            const playlistCover = document.createElement('img');
            playlistCover.src = results.playlist_image;
            playlistCover.alt = results.playlist_name;
            playlistCover.className = 'playlist-cover';
            
            const playlistInfo = document.createElement('div');
            playlistInfo.className = 'playlist-info';
            playlistInfo.innerHTML = `
                <h2>${escapeHtml(results.playlist_name)}</h2>
                <p class="track-count"><span>${results.track_count}</span> tracks analysed</p>
            `;
            
            // Clear header and rebuild with cover
            playlistHeader.innerHTML = '';
            playlistHeader.appendChild(playlistCover);
            playlistHeader.appendChild(playlistInfo);
        } else {
            document.getElementById('playlistName').textContent = results.playlist_name;
            document.getElementById('trackCount').textContent = results.track_count;
        }
        
        // Overall rating
        const overallRating = Math.round(results.ratings.overall_rating);
        document.getElementById('overallRating').textContent = overallRating;
        animateCircle(overallRating);
        
        // Individual ratings with staggered animations
        const ratings = results.ratings;
        
        document.getElementById('artistScore').textContent = 
            Math.round(ratings.artist_diversity_rating) + '%';
        animateBar('artistBar', ratings.artist_diversity_rating, 300);
        
        document.getElementById('genreScore').textContent = 
            Math.round(ratings.genre_cohesion_rating) + '%';
        animateBar('genreBar', ratings.genre_cohesion_rating, 500);
        
        document.getElementById('popularityScore').textContent = 
            Math.round(ratings.popularity_rating) + '%';
        animateBar('popularityBar', ratings.popularity_rating, 700);
        
        document.getElementById('lengthScore').textContent = 
            Math.round(ratings.playlist_length_rating) + '%';
        animateBar('lengthBar', ratings.playlist_length_rating, 900);
        
        // Era diversity rating (if available)
        if (ratings.era_diversity_rating !== undefined) {
            document.getElementById('eraScore').textContent = 
                Math.round(ratings.era_diversity_rating) + '%';
            animateBar('eraBar', ratings.era_diversity_rating, 1100);
        }
        
        // Popular genres
        displayGenres(results.popular_genres);
        
        // Tracks list
        displayTracks(results.tracks);
        
        // Recommendations
        displayRecommendations(results.recommendations);
    }
    
    /**
     * Display popular genres section
     * @param {Array} genres - Array of genre objects
     */
    function displayGenres(genres) {
        const genresList = document.getElementById('genresList');
        genresList.innerHTML = '';
        
        genres.forEach((genre) => {
            const genreItem = document.createElement('div');
            genreItem.className = 'genre-item';
            genreItem.innerHTML = `
                <span class="genre-name">${genre.name}</span>
                <span class="genre-percentage">${genre.percentage}%</span>
            `;
            genresList.appendChild(genreItem);
        });
    }
    
    /**
     * Display tracks list
     * @param {Array} tracks - Array of track objects
     */
    function displayTracks(tracks) {
        const tracksList = document.getElementById('tracksList');
        tracksList.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            
            // Build explicit badge HTML
            const explicitBadge = track.explicit ? '<span class="explicit-badge">E</span>' : '';
            
            // Build preview player HTML
            const previewPlayer = track.preview_url ? 
                `<audio controls class="track-preview">
                    <source src="${track.preview_url}" type="audio/mpeg">
                </audio>` : '';
            
            // Build Spotify link HTML
            const spotifyLink = track.spotify_url ? 
                `<a href="${track.spotify_url}" target="_blank" class="spotify-link" title="Open in Spotify">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                </a>` : '';
            
            trackItem.innerHTML = `
                <span class="track-number">${index + 1}</span>
                ${track.album_image_small ? `<img src="${track.album_image_small}" class="album-art" alt="${escapeHtml(track.album)}" loading="lazy">` : ''}
                <div class="track-info">
                    <div class="track-header">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        ${explicitBadge}
                    </div>
                    <div class="track-artists">${escapeHtml(track.artists.join(', '))}</div>
                    <div class="track-meta">
                        <span class="track-duration">${track.duration}</span>
                        <span>•</span>
                        <span>${escapeHtml(track.album)}</span>
                        ${spotifyLink ? '<span>•</span>' + spotifyLink : ''}
                    </div>
                    ${previewPlayer}
                </div>
            `;
            tracksList.appendChild(trackItem);
        });
        
        // Add toggle functionality
        const toggleBtn = document.getElementById('toggleTracks');
        toggleBtn.addEventListener('click', () => {
            if (tracksList.style.display === 'none') {
                tracksList.style.display = 'block';
                toggleBtn.textContent = 'Hide Tracks';
            } else {
                tracksList.style.display = 'none';
                toggleBtn.textContent = 'Show All Tracks';
            }
        });
    }
    
    /**
     * Display recommendations
     * @param {Array} recommendations - Array of recommended track objects
     */
    function displayRecommendations(recommendations) {
        const recommendationsList = document.getElementById('recommendationsList');
        recommendationsList.innerHTML = '';
        
        if (recommendations.length === 0) {
            recommendationsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No recommendations available.</p>';
            return;
        }
        
        recommendations.forEach((track) => {
            const recItem = document.createElement('div');
            recItem.className = 'recommendation-item';
            
            // Build explicit badge HTML
            const explicitBadge = track.explicit ? '<span class="explicit-badge">E</span>' : '';
            
            // Build preview player HTML
            const previewPlayer = track.preview_url ? 
                `<audio controls class="track-preview">
                    <source src="${track.preview_url}" type="audio/mpeg">
                </audio>` : '';
            
            // Build Spotify link HTML
            const spotifyLink = track.spotify_url ? 
                `<a href="${track.spotify_url}" target="_blank" class="spotify-link" title="Open in Spotify">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Open in Spotify
                </a>` : '';
            
            recItem.innerHTML = `
                ${track.album_image_small ? `<img src="${track.album_image_small}" class="album-art" alt="${escapeHtml(track.album)}" loading="lazy">` : ''}
                <div class="track-info">
                    <div class="track-header">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        ${explicitBadge}
                    </div>
                    <div class="track-artists">${escapeHtml(track.artists.join(', '))}</div>
                    <div class="track-meta">
                        <span class="track-duration">${track.duration}</span>
                        <span>•</span>
                        <span>${escapeHtml(track.album)} (${track.release_year})</span>
                    </div>
                    ${spotifyLink ? '<div style="margin-top: 8px;">' + spotifyLink + '</div>' : ''}
                    ${previewPlayer}
                </div>
            `;
            recommendationsList.appendChild(recItem);
        });
    }
    
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Load results when page loads
    loadResults();
}

// ==================== SMOOTH SCROLLING ====================

/**
 * Add smooth scrolling behaviour for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ==================== KEYBOARD ACCESSIBILITY ====================

/**
 * Add keyboard navigation support for interactive elements
 */
document.addEventListener('keydown', (event) => {
    // Enter key on buttons and links
    if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
        event.target.click();
    }
});

// ==================== PAGE LOAD ANIMATIONS ====================

/**
 * Add fade-in animation to feature cards on page load
 */
window.addEventListener('DOMContentLoaded', () => {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 100);
    });
});

// ==================== ERROR HANDLING ====================

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You can add additional error reporting here if needed
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You can add additional error reporting here if needed
});

// ==================== CONSOLE MESSAGE ====================

console.log('%c🎵 pyAux - Spotify Playlist Analyser', 'color: #00ff41; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with Flask, JavaScript, and lots of 💚', 'color: #00ff41; font-size: 14px;');
